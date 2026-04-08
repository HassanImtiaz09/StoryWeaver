import { db } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * COPPA compliance: Verifiable Parental Consent (VPC) management.
 * Tracks consent status per user, gates child data collection.
 */

export type ConsentMethod = "email_plus" | "credit_card" | "knowledge_based";

/**
 * checkParentalConsent - Check if user has completed parental consent verification
 */
export async function checkParentalConsent(userId: number): Promise<boolean> {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return false;
    }

    return user.consentVerifiedAt !== null;
  } catch (error) {
    console.error("Error checking parental consent:", error);
    return false;
  }
}

/**
 * recordParentalConsent - Record that parental consent was given
 */
export async function recordParentalConsent(
  userId: number,
  method: ConsentMethod,
  verificationData?: Record<string, any>
): Promise<void> {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    await db
      .update(users)
      .set({
        consentVerifiedAt: new Date(),
        consentMethod: method,
        isParent: true,
      })
      .where(eq(users.id, userId));
  } catch (error) {
    console.error("Error recording parental consent:", error);
    if (error instanceof TRPCError) {
      throw error;
    }
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to record parental consent",
    });
  }
}

/**
 * requireConsentMiddleware - Throws FORBIDDEN if consent not verified before child data operations
 */
export async function requireConsent(userId: number): Promise<void> {
  const hasConsent = await checkParentalConsent(userId);
  if (!hasConsent) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Parental consent is required before creating child profiles. Please verify your parental status first.",
    });
  }
}

/**
 * getConsentStatus - Get detailed consent status for a user
 */
export async function getConsentStatus(userId: number): Promise<{
  verified: boolean;
  method?: ConsentMethod;
  verifiedAt?: Date;
  isParent: boolean;
}> {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    return {
      verified: user.consentVerifiedAt !== null,
      method: (user.consentMethod as ConsentMethod) || undefined,
      verifiedAt: user.consentVerifiedAt || undefined,
      isParent: user.isParent ?? false,
    };
  } catch (error) {
    console.error("Error getting consent status:", error);
    if (error instanceof TRPCError) {
      throw error;
    }
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to get consent status",
    });
  }
}
