import { create } from "zustand";
import { trpc } from "./trpc";

// ─── Types ─────────────────────────────────────────────────────
export interface BookProduct {
  id: number;
  storyArcId: number;
  userId: number;
  childId: number;
  title: string;
  format: string;
  size: string;
  pageCount: number;
  coverImageUrl?: string;
  interiorPdfUrl?: string;
  printfulProductId?: string;
  status: string;
  createdAt: Date;
}

export interface ShippingAddress {
  id: number;
  userId: number;
  name: string;
  address1: string;
  address2?: string;
  city: string;
  stateCode?: string;
  countryCode: string;
  zip: string;
  phone?: string;
  isDefault: boolean;
  createdAt: Date;
}

export interface PrintOrder {
  id: number;
  userId: number;
  storyArcId: number;
  status: string;
  bookFormat: string;
  pageCount?: number;
  coverImageUrl?: string;
  interiorPdfUrl?: string;
  shippingName?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZip?: string;
  shippingCountry?: string;
  subtotal?: string;
  shippingCost?: string;
  discount?: string;
  total?: string;
  printfulOrderId?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface BookFormat {
  id: string;
  label: string;
  description: string;
  basePrice: number;
  perPagePrice: number;
}

export interface PriceBreakdown {
  baseCost: number;
  markup: number;
  shippingEstimate: number;
  tax: number;
  total: number;
  currency: string;
}

// ─── Store ─────────────────────────────────────────────────────
interface PrintStore {
  // State
  bookProducts: BookProduct[];
  orders: PrintOrder[];
  addresses: ShippingAddress[];
  availableFormats: BookFormat[];
  currentPricing: PriceBreakdown | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  createBookProduct: (input: {
    storyArcId: number;
    childId: number;
    format: string;
    size: string;
    dedication?: string;
  }) => Promise<BookProduct>;

  getBookPreview: (bookProductId: number) => Promise<any>;

  estimateShipping: (input: {
    bookProductId: number;
    address: {
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
  }) => Promise<{ rates: any[]; price: PriceBreakdown }>;

  placeOrder: (input: {
    bookProductId: number;
    shippingAddress: {
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
    shippingRateId: string;
  }) => Promise<PrintOrder>;

  saveAddress: (input: {
    name: string;
    address1: string;
    address2?: string;
    city: string;
    stateCode?: string;
    countryCode: string;
    zip: string;
    phone?: string;
    isDefault?: boolean;
  }) => Promise<ShippingAddress>;

  getAddresses: () => Promise<ShippingAddress[]>;

  loadFormats: () => Promise<BookFormat[]>;

  clearError: () => void;
}

export const usePrintStore = create<PrintStore>((set, get) => ({
  // Initial state
  bookProducts: [],
  orders: [],
  addresses: [],
  availableFormats: [],
  currentPricing: null,
  isLoading: false,
  error: null,

  // Action: Create book product
  createBookProduct: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const product = await trpc.printOrders.createBookProduct.mutate(input);
      set((state) => ({
        bookProducts: [...state.bookProducts, product],
        isLoading: false,
      }));
      return product;
    } catch (err: any) {
      set({ error: err.message ?? "Failed to create book product", isLoading: false });
      throw err;
    }
  },

  // Action: Get book preview
  getBookPreview: async (bookProductId) => {
    set({ isLoading: true, error: null });
    try {
      const preview = await trpc.printOrders.getBookPreview.query({ bookProductId });
      set({ isLoading: false });
      return preview;
    } catch (err: any) {
      set({ error: err.message ?? "Failed to load book preview", isLoading: false });
      throw err;
    }
  },

  // Action: Estimate shipping
  estimateShipping: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const result = await trpc.printOrders.estimateShipping.mutate(input);
      set({ currentPricing: result.price, isLoading: false });
      return result;
    } catch (err: any) {
      set({ error: err.message ?? "Failed to estimate shipping", isLoading: false });
      throw err;
    }
  },

  // Action: Place order
  placeOrder: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const order = await trpc.printOrders.placeOrder.mutate(input);
      set((state) => ({
        orders: [...state.orders, order],
        isLoading: false,
      }));
      return order;
    } catch (err: any) {
      set({ error: err.message ?? "Failed to place order", isLoading: false });
      throw err;
    }
  },

  // Action: Save shipping address
  saveAddress: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const address = await trpc.printOrders.saveAddress.mutate(input);
      set((state) => ({
        addresses: [...state.addresses, address],
        isLoading: false,
      }));
      return address;
    } catch (err: any) {
      set({ error: err.message ?? "Failed to save address", isLoading: false });
      throw err;
    }
  },

  // Action: Get addresses
  getAddresses: async () => {
    set({ isLoading: true, error: null });
    try {
      const addresses = await trpc.printOrders.getAddresses.query();
      set({ addresses, isLoading: false });
      return addresses;
    } catch (err: any) {
      set({ error: err.message ?? "Failed to load addresses", isLoading: false });
      throw err;
    }
  },

  // Action: Load formats
  loadFormats: async () => {
    set({ isLoading: true, error: null });
    try {
      const formats = await trpc.printOrders.getFormats.query();
      set({ availableFormats: formats, isLoading: false });
      return formats;
    } catch (err: any) {
      set({ error: err.message ?? "Failed to load formats", isLoading: false });
      throw err;
    }
  },

  // Action: Clear error
  clearError: () => set({ error: null }),
}));
