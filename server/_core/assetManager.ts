/**
 * Asset Manager for StoryWeaver
 *
 * Centralized asset storage, retrieval, and lifecycle management.
 * Handles versioning, CDN routing, and storage optimization.
 *
 * Features:
 * - Multi-variant asset storage (thumbnail, mobile, tablet, print)
 * - CDN URL generation with cache headers
 * - Storage quota management
 * - Automatic cleanup and archival
 * - Asset versioning and deduplication
 */

import { db } from "../db";
import { mediaAssets } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { storagePut } from "../storage";

export interface Asset {
  id: number;
  type: "image" | "audio" | "music" | "pdf";
  episodeId?: number;
  userId: number;
  variants: AssetVariant[];
  originalUrl: string;
  createdAt: Date;
}

export interface AssetVariant {
  size: string; // "thumbnail", "mobile", "tablet", "print", "original"
  url: string;
  width?: number;
  height?: number;
  format: string;
  fileSize: number;
}

export interface StorageStats {
  totalUsed: number;
  byType: Record<string, number>;
  byVariant: Record<string, number>;
  quotaLimit: number;
  quotaRemaining: number;
  percentUsed: number;
}

const STORAGE_QUOTA_PER_USER = 5 * 1024 * 1024 * 1024; // 5GB per user

/**
 * Asset Manager Service
 *
 * Manages all asset lifecycle: storage, retrieval, optimization, and cleanup.
 */
export class AssetManager {
  private cdnBaseUrl: string;

  constructor(cdnBaseUrl: string = "https://cdn.storyweaver.app") {
    this.cdnBaseUrl = cdnBaseUrl.replace(/\/$/, "");
  }

  /**
   * Store an asset and its variants
   *
   * Persists asset metadata to database and stores variants.
   */
  async storeAsset(
    userId: number,
    type: Asset["type"],
    originalUrl: string,
    variants: AssetVariant[],
    episodeId?: number,
    metadata?: Record<string, any>
  ): Promise<Asset> {
    // Check storage quota
    const stats = await this.getStorageStats(userId);
    const totalVariantSize = variants.reduce((sum, v) => sum + v.fileSize, 0);

    if (stats.quotaRemaining < totalVariantSize) {
      throw new Error(
        `Insufficient storage quota. Need ${totalVariantSize} bytes, have ${stats.quotaRemaining} bytes remaining.`
      );
    }

    // Store in database
    const result = await db.insert(mediaAssets).values({
      userId,
      episodeId: episodeId || undefined,
      assetType: type,
      originalUrl,
      fileSize: totalVariantSize,
      width: metadata?.width,
      height: metadata?.height,
      duration: metadata?.duration,
      format: metadata?.format || "unknown",
      thumbnailUrl: variants.find((v) => v.size === "thumbnail")?.url,
      mobileUrl: variants.find((v) => v.size === "mobile")?.url,
      tabletUrl: variants.find((v) => v.size === "tablet")?.url,
      printUrl: variants.find((v) => v.size === "print")?.url,
      createdAt: new Date(),
    });

    // Get the inserted ID (MySQL returns array for insert)
    const assetId = Array.isArray(result) ? result[0] : (result as any).lastID;

    return {
      id: assetId,
      type,
      userId,
      episodeId,
      originalUrl,
      variants,
      createdAt: new Date(),
    };
  }

  /**
   * Retrieve asset with best matching variant
   *
   * Returns the most appropriate variant based on requested size.
   */
  async getAsset(
    assetId: number,
    preferredSize: "thumbnail" | "mobile" | "tablet" | "print" = "mobile"
  ): Promise<Asset | null> {
    const results = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, assetId));

    if (results.length === 0) {
      return null;
    }

    const row = results[0];
    const variants: AssetVariant[] = [];

    // Reconstruct variants from database columns
    if (row.thumbnailUrl) {
      variants.push({
        size: "thumbnail",
        url: row.thumbnailUrl,
        width: 150,
        height: 100,
        format: "webp",
        fileSize: 0,
      });
    }
    if (row.mobileUrl) {
      variants.push({
        size: "mobile",
        url: row.mobileUrl,
        width: 750,
        height: 500,
        format: "webp",
        fileSize: 0,
      });
    }
    if (row.tabletUrl) {
      variants.push({
        size: "tablet",
        url: row.tabletUrl,
        width: 1200,
        height: 800,
        format: "webp",
        fileSize: 0,
      });
    }
    if (row.printUrl) {
      variants.push({
        size: "print",
        url: row.printUrl,
        width: 2400,
        height: 1600,
        format: row.format || "jpeg",
        fileSize: 0,
      });
    }

    variants.push({
      size: "original",
      url: row.originalUrl,
      format: row.format || "jpeg",
      width: row.width || undefined,
      height: row.height || undefined,
      fileSize: row.fileSize || 0,
    });

    return {
      id: row.id,
      type: row.assetType as any,
      userId: row.userId,
      episodeId: row.episodeId || undefined,
      originalUrl: row.originalUrl,
      variants,
      createdAt: row.createdAt,
    };
  }

  /**
   * Get all assets for an episode
   */
  async getEpisodeAssets(episodeId: number): Promise<Asset[]> {
    const results = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.episodeId, episodeId));

    return results.map((row) => ({
      id: row.id,
      type: row.assetType as any,
      userId: row.userId,
      episodeId: row.episodeId || undefined,
      originalUrl: row.originalUrl,
      variants: this.reconstructVariants(row),
      createdAt: row.createdAt,
    }));
  }

  /**
   * Delete all assets for an episode (cleanup)
   */
  async deleteEpisodeAssets(episodeId: number): Promise<number> {
    const assets = await this.getEpisodeAssets(episodeId);

    // Delete from database
    const result = await db
      .delete(mediaAssets)
      .where(eq(mediaAssets.episodeId, episodeId));

    // In production, would also delete from CDN/storage
    return assets.length;
  }

  /**
   * Get storage usage statistics for a user
   */
  async getStorageStats(userId: number): Promise<StorageStats> {
    const results = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.userId, userId));

    let totalUsed = 0;
    const byType: Record<string, number> = {};
    const byVariant: Record<string, number> = {
      thumbnail: 0,
      mobile: 0,
      tablet: 0,
      print: 0,
      original: 0,
    };

    for (const row of results) {
      const size = row.fileSize || 0;
      totalUsed += size;
      byType[row.assetType] = (byType[row.assetType] || 0) + size;

      // Estimate variant sizes (rough approximation)
      if (row.thumbnailUrl) byVariant.thumbnail += Math.round(size * 0.05);
      if (row.mobileUrl) byVariant.mobile += Math.round(size * 0.2);
      if (row.tabletUrl) byVariant.tablet += Math.round(size * 0.3);
      if (row.printUrl) byVariant.print += Math.round(size * 0.4);
      byVariant.original += size;
    }

    const quotaRemaining = Math.max(0, STORAGE_QUOTA_PER_USER - totalUsed);
    const percentUsed = (totalUsed / STORAGE_QUOTA_PER_USER) * 100;

    return {
      totalUsed,
      byType,
      byVariant,
      quotaLimit: STORAGE_QUOTA_PER_USER,
      quotaRemaining,
      percentUsed,
    };
  }

  /**
   * Generate CDN URL with cache headers
   *
   * Creates a URL suitable for long-term CDN caching.
   * Includes cache-busting version parameter.
   */
  generateCDNUrl(
    assetPath: string,
    version: string = "1",
    cacheMaxAge: number = 31536000 // 1 year
  ): string {
    const params = new URLSearchParams({
      path: assetPath,
      v: version,
      cache: cacheMaxAge.toString(),
    });
    return `${this.cdnBaseUrl}/cdn/asset?${params.toString()}`;
  }

  /**
   * Get best variant URL for user's device
   *
   * Smart selection based on typical device capabilities.
   */
  getBestVariantUrl(
    asset: Asset,
    deviceType: "mobile" | "tablet" | "desktop" | "print" = "mobile"
  ): string {
    const variantMap = {
      mobile: "mobile",
      tablet: "tablet",
      desktop: "tablet",
      print: "print",
    };

    const preferredSize = variantMap[deviceType];
    const variant = asset.variants.find((v) => v.size === preferredSize);

    if (variant) {
      return variant.url;
    }

    // Fallback to original
    return asset.originalUrl;
  }

  /**
   * Archive old assets (move to cold storage)
   *
   * Moves assets older than X days to cheaper storage.
   */
  async archiveOldAssets(olderThanDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    // In production, would move to cold storage
    // For now, just count eligible assets
    const results = await db
      .select()
      .from(mediaAssets)
      .where((table) => {
        // Filter by date - this is a simplified version
        return table.createdAt < cutoffDate;
      });

    return results.length;
  }

  /**
   * Deduplicate identical assets
   *
   * Finds assets with identical content and consolidates them.
   */
  async deduplicateAssets(): Promise<{
    totalAssetsChecked: number;
    duplicatesFound: number;
    spaceFreed: number;
  }> {
    const allAssets = await db.select().from(mediaAssets);

    const urlMap = new Map<string, number[]>();
    for (const asset of allAssets) {
      const url = asset.originalUrl;
      if (!urlMap.has(url)) {
        urlMap.set(url, []);
      }
      urlMap.get(url)!.push(asset.id);
    }

    let spaceFreed = 0;
    let duplicatesFound = 0;

    for (const [_url, assetIds] of urlMap) {
      if (assetIds.length > 1) {
        duplicatesFound += assetIds.length - 1;

        // Keep first, delete others
        const toDelete = assetIds.slice(1);
        for (const assetId of toDelete) {
          const asset = await db
            .select()
            .from(mediaAssets)
            .where(eq(mediaAssets.id, assetId));

          if (asset.length > 0) {
            spaceFreed += asset[0].fileSize || 0;
          }

          await db.delete(mediaAssets).where(eq(mediaAssets.id, assetId));
        }
      }
    }

    return {
      totalAssetsChecked: allAssets.length,
      duplicatesFound,
      spaceFreed,
    };
  }

  /**
   * Reconstruct asset variants from database row
   */
  private reconstructVariants(row: any): AssetVariant[] {
    const variants: AssetVariant[] = [];

    if (row.thumbnailUrl) {
      variants.push({
        size: "thumbnail",
        url: row.thumbnailUrl,
        width: 150,
        height: 100,
        format: "webp",
        fileSize: 0,
      });
    }
    if (row.mobileUrl) {
      variants.push({
        size: "mobile",
        url: row.mobileUrl,
        width: 750,
        height: 500,
        format: "webp",
        fileSize: 0,
      });
    }
    if (row.tabletUrl) {
      variants.push({
        size: "tablet",
        url: row.tabletUrl,
        width: 1200,
        height: 800,
        format: "webp",
        fileSize: 0,
      });
    }
    if (row.printUrl) {
      variants.push({
        size: "print",
        url: row.printUrl,
        width: 2400,
        height: 1600,
        format: row.format || "jpeg",
        fileSize: 0,
      });
    }

    variants.push({
      size: "original",
      url: row.originalUrl,
      format: row.format || "jpeg",
      width: row.width || undefined,
      height: row.height || undefined,
      fileSize: row.fileSize || 0,
    });

    return variants;
  }
}

// Global asset manager instance
export const assetManager = new AssetManager();
