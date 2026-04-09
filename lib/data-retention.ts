/**
 * Data Retention & Portability Utility
 *
 * COPPA compliance: Manage child data lifecycle, export for portability,
 * and automatic cleanup based on retention policies.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Data retention period (in days) ────────────────────────────
const DEFAULT_RETENTION_DAYS = 365; // 1 year

// ─── Metadata key ──────────────────────────────────────────────
const DATA_METADATA_KEY = "sw_data_metadata";

interface DataMetadata {
  createdAt: string; // ISO timestamp
  dataVersion: string;
}

/**
 * Get all stored data keys from AsyncStorage
 */
export async function getAllDataKeys(): Promise<string[]> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    // Filter out system keys and return user data keys
    return keys.filter((key) => {
      // Exclude system/metadata keys
      return (
        !key.startsWith("expo_") &&
        !key.startsWith("@react-native") &&
        key !== DATA_METADATA_KEY
      );
    });
  } catch (err) {
    console.warn("[DataRetention] Failed to get all data keys:", err);
    return [];
  }
}

/**
 * Get only child data keys (stories, bookmarks, achievements, settings)
 */
export async function getChildDataKeys(): Promise<string[]> {
  try {
    const keys = await getAllDataKeys();
    const childDataPatterns = [
      "storyweaver_stories",
      "storyweaver_bookmarks",
      "storyweaver_achievements",
      "storyweaver_settings",
      "sw_gamification",
      "sw_child_context",
    ];

    return keys.filter((key) =>
      childDataPatterns.some((pattern) => key.includes(pattern))
    );
  } catch (err) {
    console.warn("[DataRetention] Failed to filter child data keys:", err);
    return [];
  }
}

/**
 * Delete all child data (for parental request or account deletion)
 * Returns the keys that were deleted
 */
export async function deleteAllChildData(): Promise<string[]> {
  try {
    const childKeys = await getChildDataKeys();
    await AsyncStorage.multiRemove(childKeys);
    console.log(
      `[DataRetention] Deleted ${childKeys.length} child data items`
    );
    return childKeys;
  } catch (err) {
    console.warn("[DataRetention] Failed to delete child data:", err);
    return [];
  }
}

/**
 * Export all child data as JSON for portability (COPPA requirement)
 */
export async function exportChildDataAsJSON(): Promise<Record<string, unknown>> {
  try {
    const childKeys = await getChildDataKeys();
    const exportedData: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      dataKeys: childKeys,
      data: {},
    };

    for (const key of childKeys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        try {
          // Try to parse as JSON, otherwise store as string
          exportedData.data[key] = JSON.parse(value);
        } catch {
          exportedData.data[key] = value;
        }
      }
    }

    return exportedData;
  } catch (err) {
    console.warn("[DataRetention] Failed to export child data:", err);
    return { error: "Failed to export data", exportedAt: new Date().toISOString() };
  }
}

/**
 * Export child data as JSON string (for file download)
 */
export async function exportChildDataAsJSONString(): Promise<string> {
  try {
    const data = await exportChildDataAsJSON();
    return JSON.stringify(data, null, 2);
  } catch (err) {
    console.warn("[DataRetention] Failed to export data as string:", err);
    return JSON.stringify({ error: "Failed to export data" }, null, 2);
  }
}

/**
 * Initialize or update data creation timestamp
 */
async function initializeDataMetadata(): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(DATA_METADATA_KEY);
    if (!existing) {
      const metadata: DataMetadata = {
        createdAt: new Date().toISOString(),
        dataVersion: "1.0",
      };
      await AsyncStorage.setItem(DATA_METADATA_KEY, JSON.stringify(metadata));
    }
  } catch (err) {
    console.warn("[DataRetention] Failed to initialize metadata:", err);
  }
}

/**
 * Get the age of stored data (days since creation)
 */
export async function getDataAge(): Promise<number | null> {
  try {
    const metadataStr = await AsyncStorage.getItem(DATA_METADATA_KEY);
    if (!metadataStr) {
      // Initialize if not set
      await initializeDataMetadata();
      return 0;
    }

    const metadata: DataMetadata = JSON.parse(metadataStr);
    const createdTime = new Date(metadata.createdAt).getTime();
    const nowTime = new Date().getTime();
    const ageMs = nowTime - createdTime;
    const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

    return ageDays;
  } catch (err) {
    console.warn("[DataRetention] Failed to get data age:", err);
    return null;
  }
}

/**
 * Automatic cleanup: delete data older than retention period
 * Call this periodically (e.g., on app startup)
 *
 * @param retentionDays - Days to retain data (default: 365)
 * @returns true if cleanup was performed, false otherwise
 */
export async function autoCleanupOldData(
  retentionDays: number = DEFAULT_RETENTION_DAYS
): Promise<boolean> {
  try {
    const dataAge = await getDataAge();

    if (dataAge === null) {
      console.log("[DataRetention] No data age found, skipping cleanup");
      return false;
    }

    if (dataAge > retentionDays) {
      console.log(
        `[DataRetention] Data is ${dataAge} days old (retention: ${retentionDays} days), cleaning up`
      );
      await deleteAllChildData();
      // Reset metadata
      await AsyncStorage.removeItem(DATA_METADATA_KEY);
      await initializeDataMetadata();
      return true;
    }

    return false;
  } catch (err) {
    console.warn("[DataRetention] Cleanup failed:", err);
    return false;
  }
}

/**
 * Get data retention info for display to parents
 */
export async function getDataRetentionInfo(): Promise<{
  totalDataAge: number | null;
  retentionDays: number;
  willBeDeletedAt: string | null;
  dataSize: number;
}> {
  try {
    const dataAge = await getDataAge();
    const retentionDays = DEFAULT_RETENTION_DAYS;

    let deleteDate: string | null = null;
    let dataSize = 0;

    if (dataAge !== null && dataAge < retentionDays) {
      const daysLeft = retentionDays - dataAge;
      const deleteTime = new Date();
      deleteTime.setDate(deleteTime.getDate() + daysLeft);
      deleteDate = deleteTime.toISOString().split("T")[0]; // YYYY-MM-DD
    }

    // Estimate data size
    const keys = await getAllDataKeys();
    for (const key of keys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        dataSize += value.length;
      }
    }

    return {
      totalDataAge: dataAge,
      retentionDays,
      willBeDeletedAt: deleteDate,
      dataSize,
    };
  } catch (err) {
    console.warn("[DataRetention] Failed to get retention info:", err);
    return {
      totalDataAge: null,
      retentionDays: DEFAULT_RETENTION_DAYS,
      willBeDeletedAt: null,
      dataSize: 0,
    };
  }
}
