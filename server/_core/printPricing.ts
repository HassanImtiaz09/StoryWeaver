// ─── Pricing Types ─────────────────────────────────────────────
export interface PriceBreakdown {
  baseCost: number; // Printful cost
  markup: number; // Our margin
  shippingEstimate: number;
  tax: number;
  total: number;
  currency: "USD";
}

// ─── Base Pricing ───────────────────────────────────────────────
// These are production costs from Printful (approximate)
export const BOOK_BASE_PRICES: Record<string, number> = {
  // Softcover books (8x8")
  softcover_8x8_base: 7.99,
  softcover_8x8_per_page: 0.15,

  // Softcover books (other sizes)
  softcover_6x9_base: 8.95,
  softcover_6x9_per_page: 0.12,

  // Hardcover books (8x8")
  hardcover_8x8_base: 18.99,
  hardcover_8x8_per_page: 0.25,

  // Hardcover books (10x10")
  hardcover_10x10_base: 24.99,
  hardcover_10x10_per_page: 0.30,

  // Premium hardcover (8.5x11")
  hardcover_8_5x11_base: 29.99,
  hardcover_8_5x11_per_page: 0.35,
};

// ─── Markup & Discount Settings ────────────────────────────────
export const MARKUP_PERCENTAGE = 0.40; // 40% margin on top of production cost

export const BULK_DISCOUNTS: Record<number, number> = {
  1: 0, // 0% discount
  2: 5, // 5% discount for 2+ copies
  5: 10, // 10% discount for 5+ copies
  10: 15, // 15% discount for 10+ copies
  20: 20, // 20% discount for 20+ copies
};

export const SUBSCRIPTION_DISCOUNTS: Record<string, number> = {
  free: 0,
  monthly: 10,
  yearly: 20,
  family: 30,
};

// ─── Tax Configuration ─────────────────────────────────────────
export const SALES_TAX_RATES: Record<string, number> = {
  CA: 0.0725, // California
  TX: 0.0625, // Texas
  NY: 0.0400, // New York
  FL: 0.0600, // Florida
  WA: 0.0650, // Washington
  DEFAULT: 0.0, // No tax for most states / international
};

// ─── Helper: Get Tax Rate ──────────────────────────────────────
function getTaxRate(stateCode?: string): number {
  if (!stateCode || stateCode.length === 0) return 0;
  return SALES_TAX_RATES[stateCode.toUpperCase()] ?? SALES_TAX_RATES.DEFAULT;
}

// ─── Helper: Get Bulk Discount ────────────────────────────────
export function getBulkDiscount(quantity: number): number {
  const quantities = Object.keys(BULK_DISCOUNTS)
    .map(Number)
    .sort((a, b) => b - a);

  for (const q of quantities) {
    if (quantity >= q) {
      return BULK_DISCOUNTS[q];
    }
  }
  return 0;
}

// ─── Calculate Price ───────────────────────────────────────────
export function calculatePrice(
  format: string,
  pageCount: number,
  shippingCountry?: string,
  shippingState?: string,
  quantity: number = 1,
  subscriptionDiscount: number = 0
): PriceBreakdown {
  // Get base and per-page costs
  const baseCostKey = `${format}_base`;
  const perPageKey = `${format}_per_page`;

  const baseCost = BOOK_BASE_PRICES[baseCostKey] ?? 14.99;
  const perPageCost = BOOK_BASE_PRICES[perPageKey] ?? 0.15;

  // Calculate production cost
  const pagesCost = Math.max(0, pageCount - 8) * perPageCost; // First 8 pages included
  const productionCostPerBook = baseCost + pagesCost;

  // Apply markup
  const markup = productionCostPerBook * MARKUP_PERCENTAGE;
  const costWithMarkup = productionCostPerBook + markup;

  // Apply bulk discount
  const bulkDiscount = getBulkDiscount(quantity);
  const bulkDiscount$ = (costWithMarkup * bulkDiscount) / 100;

  // Apply subscription discount
  const subscriptionDiscount$ = (costWithMarkup * subscriptionDiscount) / 100;

  // Base cost per book after discounts
  const baseCostAfterDiscounts = costWithMarkup - bulkDiscount$ - subscriptionDiscount$;
  const subtotal = Math.round(baseCostAfterDiscounts * quantity * 100) / 100;

  // Shipping estimate (conservative average)
  const shippingEstimate = quantity <= 1 ? 5.99 : 5.99 + (quantity - 1) * 2.5;

  // Tax calculation
  const taxRate = getTaxRate(shippingState);
  const tax = Math.round(subtotal * taxRate * 100) / 100;

  const total = subtotal + shippingEstimate + tax;

  return {
    baseCost: Math.round(productionCostPerBook * 100) / 100,
    markup: Math.round(markup * 100) / 100,
    shippingEstimate: Math.round(shippingEstimate * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100,
    currency: "USD",
  };
}

// ─── Get Available Formats ────────────────────────────────────
export interface BookFormatOption {
  id: string;
  label: string;
  description: string;
  basePrice: number;
  perPagePrice: number;
}

export function getAvailableFormats(): BookFormatOption[] {
  return [
    {
      id: "softcover_8x8",
      label: "Softcover 8×8\"",
      description: "Perfect for little hands",
      basePrice: BOOK_BASE_PRICES.softcover_8x8_base,
      perPagePrice: BOOK_BASE_PRICES.softcover_8x8_per_page,
    },
    {
      id: "softcover_6x9",
      label: "Softcover 6×9\"",
      description: "Classic paperback size",
      basePrice: BOOK_BASE_PRICES.softcover_6x9_base,
      perPagePrice: BOOK_BASE_PRICES.softcover_6x9_per_page,
    },
    {
      id: "hardcover_8x8",
      label: "Hardcover 8×8\"",
      description: "Durable keepsake edition",
      basePrice: BOOK_BASE_PRICES.hardcover_8x8_base,
      perPagePrice: BOOK_BASE_PRICES.hardcover_8x8_per_page,
    },
    {
      id: "hardcover_10x10",
      label: "Hardcover 10×10\"",
      description: "Premium large format",
      basePrice: BOOK_BASE_PRICES.hardcover_10x10_base,
      perPagePrice: BOOK_BASE_PRICES.hardcover_10x10_per_page,
    },
    {
      id: "hardcover_8_5x11",
      label: "Hardcover 8.5×11\"",
      description: "Premium oversized edition",
      basePrice: BOOK_BASE_PRICES.hardcover_8_5x11_base,
      perPagePrice: BOOK_BASE_PRICES.hardcover_8_5x11_per_page,
    },
  ];
}

// ─── Apply Discount Code ────────────────────────────────────────
export function applyDiscount(
  priceBreakdown: PriceBreakdown,
  discountCode: string
): PriceBreakdown {
  // Simple discount code system
  // In production, validate against database
  const discountMap: Record<string, number> = {
    EARLYBIRD: 15, // 15% off
    SUMMER20: 20, // 20% off
    WELCOME10: 10, // 10% off
  };

  const discountPercent = discountMap[discountCode.toUpperCase()] ?? 0;
  if (discountPercent === 0) {
    return priceBreakdown;
  }

  const discountAmount = Math.round((priceBreakdown.total * discountPercent) / 100 * 100) / 100;
  return {
    ...priceBreakdown,
    total: Math.round((priceBreakdown.total - discountAmount) * 100) / 100,
  };
}
