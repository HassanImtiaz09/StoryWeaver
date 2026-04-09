/**
 * Parental Consent Store
 *
 * COPPA compliance: Manages parental consent tracking for children under 13.
 * Stores consent status, date, parent email, and consent version in AsyncStorage.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "sw_parental_consent";

interface ConsentData {
  hasParentalConsent: boolean;
  consentDate: string | null; // ISO string
  parentEmail: string | null;
  consentVersion: string; // e.g., "1.0"
}

const DEFAULT_CONSENT: ConsentData = {
  hasParentalConsent: false,
  consentDate: null,
  parentEmail: null,
  consentVersion: "1.0",
};

// ─── Helper: Safe AsyncStorage caching ────────────────────────
async function safeCache(data: ConsentData): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("[ParentalConsentStore] AsyncStorage write failed:", err);
  }
}

/**
 * Get current consent status
 */
export async function getConsentStatus(): Promise<ConsentData> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as ConsentData;
    }
  } catch (err) {
    console.warn("[ParentalConsentStore] Failed to read consent status:", err);
  }
  return DEFAULT_CONSENT;
}

/**
 * Grant parental consent
 * @param parentEmail - Parent/guardian email address for COPPA verification
 */
export async function grantConsent(parentEmail: string): Promise<void> {
  const consentData: ConsentData = {
    hasParentalConsent: true,
    consentDate: new Date().toISOString(),
    parentEmail: parentEmail.trim(),
    consentVersion: "1.0",
  };
  await safeCache(consentData);
}

/**
 * Revoke parental consent and reset to default
 */
export async function revokeConsent(): Promise<void> {
  await safeCache(DEFAULT_CONSENT);
}

/**
 * Check if parental consent has been granted
 */
export async function hasConsent(): Promise<boolean> {
  const status = await getConsentStatus();
  return status.hasParentalConsent;
}

/**
 * Get parent email (if consent was granted)
 */
export async function getParentEmail(): Promise<string | null> {
  const status = await getConsentStatus();
  return status.parentEmail;
}

/**
 * Get consent date (if consent was granted)
 */
export async function getConsentDate(): Promise<string | null> {
  const status = await getConsentStatus();
  return status.consentDate;
}

/**
 * Check if consent needs renewal (optional: implement for consent version updates)
 */
export async function needsConsentRenewal(currentVersion: string = "1.0"): Promise<boolean> {
  const status = await getConsentStatus();
  return status.hasParentalConsent && status.consentVersion !== currentVersion;
}
