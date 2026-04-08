/**
 * Printful integration for print-on-demand storybook ordering
 * Handles API calls with proper error handling, timeouts, and graceful degradation
 */

import axios, { AxiosError } from "axios";
import { ENV, isServiceConfigured } from "./env";
import { generateBookInteriorPdf } from "./bookLayout";

// ─── Types ────────────────────────────────────────────────────
export interface BookSpec {
  title: string;
  authorName: string;
  childName: string;
  coverImageUrl: string;
  pages: {
    pageNumber: number;
    imageUrl: string;
    text?: string;
  }[];
  format: "softcover" | "hardcover";
  size?: "6x9" | "8x10" | "8.5x11";
}

export interface PrintfulShippingAddress {
  name: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface PrintfulOrder {
  orderId: string;
  costs: {
    subtotal: number;
    shipping: number;
    discount: number;
    total: number;
  };
}

export interface ShippingRate {
  rateId: string;
  name: string;
  cost: number;
  estimatedDays: number;
}

// ─── Printful Configuration ─────────────────────────────────────
const PRINTFUL_API_BASE = "https://api.printful.com";
const API_TIMEOUT = 10000; // 10 second timeout

// Fallback shipping rates (used when Printful API is unavailable)
const FALLBACK_SHIPPING_RATES: ShippingRate[] = [
  {
    rateId: "standard",
    name: "Standard Shipping (5-7 business days)",
    cost: 5.99,
    estimatedDays: 7,
  },
  {
    rateId: "expedited",
    name: "Expedited Shipping (2-3 business days)",
    cost: 14.99,
    estimatedDays: 3,
  },
  {
    rateId: "express",
    name: "Express Shipping (1 business day)",
    cost: 24.99,
    estimatedDays: 1,
  },
];

// ─── Service Status Check ──────────────────────────────────────
export function isPrintfulConfigured(): boolean {
  return isServiceConfigured("printful") && !!ENV.printfulApiKey;
}

// ─── API Client ────────────────────────────────────────────────
const createPrintfulClient = () => {
  if (!ENV.printfulApiKey) {
    throw new Error("Printful API key not configured");
  }

  return axios.create({
    baseURL: PRINTFUL_API_BASE,
    headers: {
      Authorization: `Bearer ${ENV.printfulApiKey}`,
      "Content-Type": "application/json",
    },
    timeout: API_TIMEOUT,
  });
};

// ─── Error Handling ────────────────────────────────────────────
class PrintfulError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = "PrintfulError";
  }
}

function handlePrintfulError(error: unknown, context: string): PrintfulError {
  if (error instanceof AxiosError) {
    const statusCode = error.response?.status;
    const errorData = error.response?.data as any;
    const message = errorData?.message || error.message;

    if (statusCode === 401 || statusCode === 403) {
      console.error(`[Printful] Authentication failed for ${context}:`, message);
      return new PrintfulError(
        "AUTH_FAILED",
        "Print service is not configured. Please contact support.",
        statusCode
      );
    }

    if (statusCode === 404) {
      return new PrintfulError(
        "NOT_FOUND",
        `Resource not found: ${message}`,
        statusCode
      );
    }

    if (statusCode === 429) {
      return new PrintfulError(
        "RATE_LIMITED",
        "Print service is temporarily unavailable. Please try again later.",
        statusCode
      );
    }

    if (statusCode && statusCode >= 500) {
      return new PrintfulError(
        "SERVICE_ERROR",
        "Print service is temporarily unavailable. Please try again later.",
        statusCode
      );
    }

    return new PrintfulError(
      "API_ERROR",
      `Print service error: ${message}`,
      statusCode
    );
  }

  if (error instanceof Error) {
    if (error.message.includes("timeout")) {
      return new PrintfulError(
        "TIMEOUT",
        "Print service request timed out. Please try again.",
      );
    }
    return new PrintfulError(
      "UNKNOWN_ERROR",
      `Print service error: ${error.message}`
    );
  }

  return new PrintfulError(
    "UNKNOWN_ERROR",
    "An unexpected error occurred with the print service"
  );
}

// ─── Public Functions ──────────────────────────────────────────

/**
 * Get available shipping rates for an order
 * Falls back to hardcoded rates if Printful is unavailable
 */
export async function getShippingRates(
  address: PrintfulShippingAddress
): Promise<ShippingRate[]> {
  try {
    if (!isPrintfulConfigured()) {
      console.warn("[Printful] Service not configured, using fallback shipping rates");
      return FALLBACK_SHIPPING_RATES;
    }

    const client = createPrintfulClient();

    // Printful shipping rates API call
    const response = await client.post("/shipping/rates", {
      address: {
        name: address.name,
        email: address.email,
        phone: address.phone,
        address1: address.street,
        city: address.city,
        state_code: address.state,
        zip: address.zip,
        country_code: address.country,
      },
      currency: "USD",
    });

    if (!response.data?.result) {
      console.warn("[Printful] Invalid shipping rates response, using fallback");
      return FALLBACK_SHIPPING_RATES;
    }

    return response.data.result.map((rate: any) => ({
      rateId: rate.id || "standard",
      name: rate.name || "Standard Shipping",
      cost: parseFloat(rate.cost) || 5.99,
      estimatedDays: parseInt(rate.estimate_business_days, 10) || 7,
    }));
  } catch (error) {
    const printfulError = handlePrintfulError(error, "getShippingRates");
    console.warn(`[Printful] Shipping rates error: ${printfulError.message}, using fallback`);
    return FALLBACK_SHIPPING_RATES;
  }
}

/**
 * Create a print order in Printful
 * Returns order details including costs
 */
export async function createPrintfulOrder(
  bookSpec: BookSpec,
  address: PrintfulShippingAddress,
  shippingRateId: string,
  interiorPdfUrl: string
): Promise<PrintfulOrder> {
  if (!isPrintfulConfigured()) {
    throw new PrintfulError(
      "NOT_CONFIGURED",
      "Print service is not configured. Please contact support."
    );
  }

  try {
    const client = createPrintfulClient();

    const response = await client.post("/orders", {
      external_id: `order_${Date.now()}`,
      shipping: shippingRateId,
      address: {
        name: address.name,
        email: address.email,
        phone: address.phone,
        address1: address.street,
        city: address.city,
        state_code: address.state,
        zip: address.zip,
        country_code: address.country,
      },
      items: [
        {
          product_id: getProductIdForBookSpec(bookSpec),
          variant_id: getVariantIdForBookSpec(bookSpec),
          quantity: 1,
          files: [
            {
              type: "cover",
              url: bookSpec.coverImageUrl,
            },
            {
              type: "interior",
              url: interiorPdfUrl,
            },
          ],
        },
      ],
    });

    if (!response.data?.result?.id) {
      throw new Error("Invalid response from Printful API");
    }

    const order = response.data.result;

    return {
      orderId: order.id.toString(),
      costs: {
        subtotal: parseFloat(order.costs?.subtotal) || 0,
        shipping: parseFloat(order.costs?.shipping) || 0,
        discount: parseFloat(order.costs?.discount) || 0,
        total: parseFloat(order.costs?.total) || 0,
      },
    };
  } catch (error) {
    const printfulError = handlePrintfulError(error, "createPrintfulOrder");
    throw printfulError;
  }
}

/**
 * Confirm (finalize) a Printful order
 */
export async function confirmPrintfulOrder(orderId: string): Promise<void> {
  if (!isPrintfulConfigured()) {
    throw new PrintfulError(
      "NOT_CONFIGURED",
      "Print service is not configured. Please contact support."
    );
  }

  try {
    const client = createPrintfulClient();

    await client.post(`/orders/${orderId}/confirm`);
  } catch (error) {
    const printfulError = handlePrintfulError(error, "confirmPrintfulOrder");
    throw printfulError;
  }
}

/**
 * Get the status of a Printful order
 */
export async function getPrintfulOrderStatus(
  orderId: string
): Promise<{
  status: string;
  estimatedDelivery?: string;
}> {
  if (!isPrintfulConfigured()) {
    throw new PrintfulError(
      "NOT_CONFIGURED",
      "Print service is not configured."
    );
  }

  try {
    const client = createPrintfulClient();

    const response = await client.get(`/orders/${orderId}`);

    if (!response.data?.result) {
      throw new Error("Invalid response from Printful API");
    }

    const order = response.data.result;

    return {
      status: order.status || "unknown",
      estimatedDelivery: order.estimated_delivery_date,
    };
  } catch (error) {
    const printfulError = handlePrintfulError(error, "getPrintfulOrderStatus");
    throw printfulError;
  }
}

/**
 * Calculate book price based on format and page count
 * Uses hardcoded fallback pricing
 */
export function calculateBookPrice(format: string, pageCount: number): number {
  const basePrices: Record<string, number> = {
    softcover_8x8: 7.99,
    softcover_6x9: 8.95,
    hardcover_8x8: 18.99,
    hardcover_10x10: 24.99,
    hardcover_8_5x11: 29.99,
  };

  const perPageCosts: Record<string, number> = {
    softcover_8x8: 0.15,
    softcover_6x9: 0.12,
    hardcover_8x8: 0.25,
    hardcover_10x10: 0.30,
    hardcover_8_5x11: 0.35,
  };

  const basePrice = basePrices[format] ?? 14.99;
  const perPageCost = perPageCosts[format] ?? 0.15;

  // First 8 pages are included in base price
  const additionalPages = Math.max(0, pageCount - 8);
  const productionCost = basePrice + additionalPages * perPageCost;

  // Apply 40% markup
  const markup = productionCost * 0.4;
  const totalCost = productionCost + markup;

  // Add standard shipping
  const withShipping = totalCost + 5.99;

  return Math.round(withShipping * 100) / 100;
}

// ─── Helper Functions ──────────────────────────────────────────

function getProductIdForBookSpec(spec: BookSpec): number {
  // Map book specifications to Printful product IDs
  // In production, these should be configured externally
  const size = spec.size || "8x10";
  const format = spec.format;

  const productMap: Record<string, number> = {
    softcover_6x9: 24, // Example: 6x9 softcover
    softcover_8x10: 25,
    hardcover_6x9: 26,
    hardcover_8x10: 27,
  };

  const key = `${format}_${size.replace(/[x"]/g, "")}`;
  return productMap[key] || 24; // Default to 6x9 softcover
}

function getVariantIdForBookSpec(spec: BookSpec): number {
  // Map to specific variant within a product
  // In production, these should be configured externally
  return 1; // Default variant
}

// Re-export generateBookInteriorPdf for convenience
export { generateBookInteriorPdf };
