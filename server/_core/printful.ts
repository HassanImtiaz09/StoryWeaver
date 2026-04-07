import { ENV } from "./env";

// ─── Printful Types ────────────────────────────────────────────
export type PrintfulShippingAddress = {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  stateCode: string;
  zip: string;
  countryCode: string;
  email?: string;
  phone?: string;
};

export type BookPage = {
  pageNumber: number;
  imageUrl: string;
  text?: string;
};

export type BookSpec = {
  title: string;
  authorName: string;
  childName: string;
  coverImageUrl: string;
  pages: BookPage[];
  format: "softcover_8x8" | "hardcover_8x8" | "hardcover_10x10";
  dedication?: string;
};

export type PrintfulOrderResult = {
  orderId: string;
  status: string;
  estimatedDelivery?: string;
  costs: {
    subtotal: number;
    shipping: number;
    discount: number;
    total: number;
  };
};

export type ShippingRate = {
  id: string;
  name: string;
  rate: string;
  currency: string;
  minDeliveryDays: number;
  maxDeliveryDays: number;
};

// ─── Format Config ─────────────────────────────────────────────
const FORMAT_CONFIG: Record<string, { printfulProductId: number; widthInches: number; heightInches: number; dpi: number }> = {
  softcover_8x8: { printfulProductId: 548, widthInches: 8, heightInches: 8, dpi: 300 },
  hardcover_8x8: { printfulProductId: 549, widthInches: 8, heightInches: 8, dpi: 300 },
  hardcover_10x10: { printfulProductId: 550, widthInches: 10, heightInches: 10, dpi: 300 },
};

// ─── Printful API Client ───────────────────────────────────────
const PRINTFUL_BASE_URL = "https://api.printful.com";

async function printfulFetch(path: string, options: RequestInit = {}): Promise<any> {
  const resp = await fetch(`${PRINTFUL_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ENV.printfulApiKey}`,
      ...options.headers,
    },
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Printful API error ${resp.status}: ${err}`);
  }

  const data = await resp.json();
  return data.result ?? data;
}
// ─── Generate Interior PDF ─────────────────────────────────────
// This creates a print-ready PDF from the story pages.
// In production, use a PDF library (e.g., PDFKit or jsPDF on server).
export async function generateBookInteriorPdf(book: BookSpec): Promise<string> {
  const config = FORMAT_CONFIG[book.format];
  if (!config) throw new Error(`Unknown format: ${book.format}`);

  // Build PDF layout specification
  // The actual PDF generation would use a library like PDFKit.
  // For now, we create a layout spec and use the image generation service
  // to compose print-ready pages.

  const pdfPages: Array<{
    type: "cover" | "dedication" | "story" | "back";
    imageUrl?: string;
    text?: string;
    layout: string;
  }> = [];

  // Title page
  pdfPages.push({
    type: "cover",
    imageUrl: book.coverImageUrl,
    text: book.title,
    layout: "center",
  });

  // Dedication page
  if (book.dedication) {
    pdfPages.push({
      type: "dedication",
      text: book.dedication,
      layout: "center",
    });
  }

  // Story pages
  for (const page of book.pages) {
    pdfPages.push({
      type: "story",
      imageUrl: page.imageUrl,
      text: page.text,
      layout: "illustration_top",
    });
  }

  // Back cover
  pdfPages.push({
    type: "back",
    text: `A StoryWeaver Book\nPersonalized for ${book.childName}\nCreated with AI-powered storytelling`,
    layout: "center",
  });

  // In a real implementation, this would:
  // 1. Download all images
  // 2. Compose them into a print-ready PDF at 300 DPI
  // 3. Add text overlays with proper typography
  // 4. Apply bleed margins (0.125")
  // 5. Upload to S3 and return URL
  //
  // For now, return a placeholder that the PDF generation service will handle:
  const pdfSpec = {
    format: book.format,
    width: config.widthInches,
    height: config.heightInches,
    dpi: config.dpi,
    bleed: 0.125,
    pages: pdfPages,
    metadata: {
      title: book.title,
      author: book.authorName,
      subject: `A personalized storybook for ${book.childName}`,
    },
  };

  // Store the spec and trigger async PDF generation
  // Return the PDF URL after generation
  return JSON.stringify(pdfSpec);
}
// ─── Get Shipping Rates ────────────────────────────────────────
export async function getShippingRates(
  address: PrintfulShippingAddress,
  bookFormat: string
): Promise<ShippingRate[]> {
  const config = FORMAT_CONFIG[bookFormat];
  if (!config) throw new Error(`Unknown format: ${bookFormat}`);

  try {
    const result = await printfulFetch("/shipping/rates", {
      method: "POST",
      body: JSON.stringify({
        recipient: {
          name: address.name,
          address1: address.address1,
          address2: address.address2,
          city: address.city,
          state_code: address.stateCode,
          zip: address.zip,
          country_code: address.countryCode,
        },
        items: [
          {
            variant_id: config.printfulProductId,
            quantity: 1,
          },
        ],
      }),
    });

    return (result ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      rate: r.rate,
      currency: r.currency,
      minDeliveryDays: r.minDeliveryDays ?? 5,
      maxDeliveryDays: r.maxDeliveryDays ?? 14,
    }));
  } catch (err) {
    // Return default estimates if API fails
    return [
      { id: "standard", name: "Standard Shipping", rate: "5.99", currency: "USD", minDeliveryDays: 7, maxDeliveryDays: 14 },
      { id: "express", name: "Express Shipping", rate: "12.99", currency: "USD", minDeliveryDays: 3, maxDeliveryDays: 5 },
    ];
  }
}

// ─── Calculate Price ───────────────────────────────────────────
export function calculateBookPrice(
  format: string,
  pageCount: number,
  subscriptionDiscount: number = 0
): { subtotal: number; discount: number; total: number } {
  const basePrices: Record<string, number> = {
    softcover_8x8: 14.99,
    hardcover_8x8: 24.99,
    hardcover_10x10: 29.99,
  };

  const perPageCost: Record<string, number> = {
    softcover_8x8: 0.35,
    hardcover_8x8: 0.45,
    hardcover_10x10: 0.55,
  };

  const base = basePrices[format] ?? 14.99;
  const pageCost = (perPageCost[format] ?? 0.35) * Math.max(0, pageCount - 8); // First 8 pages included
  const subtotal = Math.round((base + pageCost) * 100) / 100;
  const discount = Math.round(subtotal * (subscriptionDiscount / 100) * 100) / 100;
  const total = Math.round((subtotal - discount) * 100) / 100;

  return { subtotal, discount, total };
}

// ─── Create Printful Order ─────────────────────────────────────
export async function createPrintfulOrder(
  book: BookSpec,
  shipping: PrintfulShippingAddress,
  shippingRateId: string,
  interiorPdfUrl: string
): Promise<PrintfulOrderResult> {
  const config = FORMAT_CONFIG[book.format];
  if (!config) throw new Error(`Unknown format: ${book.format}`);

  try {
    const result = await printfulFetch("/orders", {
      method: "POST",
      body: JSON.stringify({
        recipient: {
          name: shipping.name,
          address1: shipping.address1,
          address2: shipping.address2,
          city: shipping.city,
          state_code: shipping.stateCode,
          zip: shipping.zip,
          country_code: shipping.countryCode,
          email: shipping.email,
          phone: shipping.phone,
        },
        items: [
          {
            variant_id: config.printfulProductId,
            quantity: 1,
            name: book.title,
            files: [
              {
                type: "default",
                url: book.coverImageUrl,
              },
              {
                type: "inside",
                url: interiorPdfUrl,
              },
            ],
          },
        ],
        shipping: shippingRateId,
        packing_slip: {
          email: shipping.email,
          message: `A personalized storybook for ${book.childName} - Created with StoryWeaver`,
        },
      }),
    });

    return {
      orderId: String(result.id),
      status: result.status ?? "draft",
      estimatedDelivery: result.estimated_delivery,
      costs: {
        subtotal: parseFloat(result.costs?.subtotal ?? "0"),
        shipping: parseFloat(result.costs?.shipping ?? "0"),
        discount: parseFloat(result.costs?.discount ?? "0"),
        total: parseFloat(result.costs?.total ?? "0"),
      },
    };
  } catch (err: any) {
    throw new Error(`Failed to create Printful order: ${err.message}`);
  }
}

// ─── Confirm Printful Order ────────────────────────────────────
export async function confirmPrintfulOrder(orderId: string): Promise<PrintfulOrderResult> {
  const result = await printfulFetch(`/orders/${orderId}/confirm`, {
    method: "POST",
  });

  return {
    orderId: String(result.id),
    status: result.status,
    estimatedDelivery: result.estimated_delivery,
    costs: {
      subtotal: parseFloat(result.costs?.subtotal ?? "0"),
      shipping: parseFloat(result.costs?.shipping ?? "0"),
      discount: parseFloat(result.costs?.discount ?? "0"),
      total: parseFloat(result.costs?.total ?? "0"),
    },
  };
}

// ─── Get Order Status ──────────────────────────────────────────
export async function getPrintfulOrderStatus(orderId: string): Promise<{ status: string; tracking?: string }> {
  const result = await printfulFetch(`/orders/${orderId}`);
  return {
    status: result.status,
    tracking: result.shipments?.[0]?.tracking_number,
  };
}
