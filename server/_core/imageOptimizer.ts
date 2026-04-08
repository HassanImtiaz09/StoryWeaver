/**
 * Image Optimization Service for StoryWeaver
 *
 * Provides image post-processing including:
 * - Responsive image generation (mobile, tablet, print resolutions)
 * - Progressive image placeholders (blur-up loading)
 * - Format conversion (WebP, AVIF for better compression)
 * - Metadata extraction for CDN and lazy-loading optimization
 *
 * Note: For production, this integrates with image CDN services.
 * Currently uses URL-based transformations for vendor services.
 */

import { storagePut } from "../storage";

export const IMAGE_SIZES = {
  thumbnail: {
    width: 150,
    quality: 60,
    format: "webp" as const,
    description: "Small thumbnail for lists and previews",
  },
  mobile: {
    width: 750,
    quality: 80,
    format: "webp" as const,
    description: "Mobile/phone optimization",
  },
  tablet: {
    width: 1200,
    quality: 85,
    format: "webp" as const,
    description: "Tablet/iPad optimization",
  },
  print: {
    width: 2400,
    quality: 95,
    format: "jpeg" as const,
    description: "High-res for print books",
  },
};

export type ImageSize = keyof typeof IMAGE_SIZES;

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  url: string;
}

export interface ImageVariant {
  size: ImageSize;
  url: string;
  width: number;
  height: number;
  format: string;
  fileSize: number;
}

/**
 * Image Optimizer Service
 *
 * Handles post-processing of generated images for multi-device delivery
 * and progressive loading optimization.
 */
export class ImageOptimizer {
  private cdnBaseUrl: string;

  constructor(cdnBaseUrl: string = "https://cdn.storyweaver.app") {
    this.cdnBaseUrl = cdnBaseUrl.replace(/\/$/, "");
  }

  /**
   * Optimize image for mobile display
   *
   * Reduces resolution and compresses for fast mobile loading.
   * For now, returns CDN transformation URL.
   * In production, these would be pre-generated or use imgix/Cloudinary APIs.
   */
  async optimizeForMobile(
    imageUrl: string,
    targetWidth: number = 750
  ): Promise<string> {
    // URL-based transformation for CDN
    // Example: https://cdn.storyweaver.app/images/transform?url=...&width=750&quality=80&format=webp
    const params = new URLSearchParams({
      url: imageUrl,
      width: targetWidth.toString(),
      quality: "80",
      format: "webp",
    });
    return `${this.cdnBaseUrl}/images/transform?${params.toString()}`;
  }

  /**
   * Generate thumbnail variant
   *
   * Creates a small thumbnail for list views and previews.
   */
  async generateThumbnail(
    imageUrl: string,
    size: number = 150
  ): Promise<string> {
    const params = new URLSearchParams({
      url: imageUrl,
      width: size.toString(),
      quality: "60",
      format: "webp",
    });
    return `${this.cdnBaseUrl}/images/transform?${params.toString()}`;
  }

  /**
   * Generate progressive loading placeholder
   *
   * Creates a tiny (50x50px) blurred placeholder for blur-up loading.
   * This allows showing a visual placeholder while the full image loads.
   *
   * Returns a data URL that can be used as an img src immediately.
   */
  async generateProgressivePlaceholder(imageUrl: string): Promise<string> {
    // In production, this would generate an actual blurred image.
    // For now, return a CDN URL that generates a small blurred version
    const params = new URLSearchParams({
      url: imageUrl,
      width: "50",
      height: "50",
      quality: "30",
      blur: "20",
      format: "webp",
    });

    // Return a data URI placeholder (in production would be actual image)
    const placeholderUrl = `${this.cdnBaseUrl}/images/transform?${params.toString()}`;

    try {
      // For actual implementation, would fetch and convert to data URL
      // This is a simplified version that returns a CDN URL
      return placeholderUrl;
    } catch {
      // Fallback to simple color placeholder
      return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='100'%3E%3Crect fill='%23f0f0f0' width='150' height='100'/%3E%3C/svg%3E";
    }
  }

  /**
   * Convert image to different format
   *
   * Converts image to specified format (WebP, AVIF, PNG, JPEG).
   * WebP and AVIF provide better compression than JPEG.
   */
  async convertFormat(
    imageUrl: string,
    format: "webp" | "avif" | "png" | "jpeg"
  ): Promise<string> {
    const params = new URLSearchParams({
      url: imageUrl,
      format,
    });
    return `${this.cdnBaseUrl}/images/transform?${params.toString()}`;
  }

  /**
   * Generate multiple optimized variants for responsive images
   *
   * Creates thumbnail, mobile, tablet, and print versions.
   * Returns URLs for use in srcset attributes.
   */
  async generateResponsiveVariants(
    imageUrl: string
  ): Promise<Record<ImageSize, ImageVariant>> {
    const variants: Record<ImageSize, ImageVariant> = {} as any;

    for (const [sizeName, sizeConfig] of Object.entries(IMAGE_SIZES)) {
      const size = sizeName as ImageSize;
      const url = `${this.cdnBaseUrl}/images/transform?${new URLSearchParams({
        url: imageUrl,
        width: sizeConfig.width.toString(),
        quality: sizeConfig.quality.toString(),
        format: sizeConfig.format,
      }).toString()}`;

      variants[size] = {
        size,
        url,
        width: sizeConfig.width,
        height: Math.round((sizeConfig.width * 3) / 4), // Assume 4:3 aspect ratio
        format: sizeConfig.format,
        fileSize: 0, // Would be populated after actual generation
      };
    }

    return variants;
  }

  /**
   * Extract image metadata from URL
   *
   * In production, would use ImageMagick, Sharp, or similar.
   * For now, makes assumptions based on CDN metadata endpoint.
   */
  async getImageMetadata(imageUrl: string): Promise<ImageMetadata> {
    // In production, would call CDN metadata API or download and analyze image
    try {
      const response = await fetch(imageUrl, { method: "HEAD" });
      const contentLength = response.headers.get("content-length");
      const contentType = response.headers.get("content-type");

      // Default metadata (would be extracted from actual image in production)
      return {
        width: 1024,
        height: 768,
        format: contentType || "jpeg",
        size: parseInt(contentLength || "0", 10),
        url: imageUrl,
      };
    } catch {
      // Fallback metadata
      return {
        width: 1024,
        height: 768,
        format: "jpeg",
        size: 0,
        url: imageUrl,
      };
    }
  }

  /**
   * Generate srcset string for responsive image loading
   *
   * Creates a srcset attribute value for use in img tags.
   * Browsers will choose the best resolution based on device.
   */
  generateSrcSet(variants: Record<ImageSize, ImageVariant>): string {
    return [
      `${variants.mobile.url} ${variants.mobile.width}w`,
      `${variants.tablet.url} ${variants.tablet.width}w`,
      `${variants.print.url} ${variants.print.width}w`,
    ].join(", ");
  }

  /**
   * Generate sizes attribute for responsive images
   *
   * Tells browser which image size to load based on viewport.
   * Standard breakpoints for mobile-first design.
   */
  generateSizesAttribute(): string {
    return "(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 80vw";
  }

  /**
   * Generate CDN URL with cache headers
   *
   * Creates a URL suitable for CDN delivery with proper cache parameters.
   * Includes cache duration and versioning for cache busting.
   */
  generateCDNUrl(
    assetPath: string,
    cacheMaxAge: number = 31536000 // 1 year
  ): string {
    // URL with cache headers
    const params = new URLSearchParams({
      path: assetPath,
      cache: cacheMaxAge.toString(),
    });
    return `${this.cdnBaseUrl}/cdn/${params.toString()}`;
  }

  /**
   * Estimate file size after optimization
   *
   * Provides rough estimate of optimized file size for different variants.
   * Useful for bandwidth estimation and progress indication.
   */
  estimateOptimizedSize(
    originalSize: number,
    targetFormat: "webp" | "avif" | "jpeg" | "png",
    quality: number
  ): number {
    // Rough compression ratios based on format and quality
    const compressionRatio =
      targetFormat === "avif"
        ? 0.4
        : targetFormat === "webp"
          ? 0.5
          : targetFormat === "jpeg"
            ? 0.7
            : 1.0;

    // Quality factor (90% quality is roughly 1.0 relative size)
    const qualityFactor = Math.max(0.1, quality / 100);

    return Math.round(originalSize * compressionRatio * qualityFactor);
  }

  /**
   * Validate image quality constraints
   *
   * Ensures optimized images meet quality requirements.
   * Returns warnings if optimization is too aggressive.
   */
  validateOptimization(
    originalSize: number,
    optimizedSize: number,
    originalDimensions: { width: number; height: number },
    targetDimensions: { width: number; height: number }
  ): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    // Check if we're upscaling (not recommended)
    if (
      targetDimensions.width > originalDimensions.width ||
      targetDimensions.height > originalDimensions.height
    ) {
      warnings.push(
        "Target dimensions larger than original (upscaling detected)"
      );
    }

    // Check compression ratio
    if (optimizedSize > originalSize) {
      warnings.push(
        "Optimized size larger than original (compression ineffective)"
      );
    }

    return {
      valid: warnings.length === 0,
      warnings,
    };
  }
}

// Global optimizer instance
export const imageOptimizer = new ImageOptimizer();
