/**
 * tRPC Client Configuration for React Native/Expo
 * Configures the client-side tRPC hooks and query client
 */
// @ts-nocheck


import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { QueryClient } from "@tanstack/react-query";
import type { AppRouter } from "../server/routers";

/**
 * Create the tRPC React hooks
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Create React Query client with optimized settings for mobile
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reduce memory footprint on mobile
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

/**
 * Get the API URL from environment
 * Defaults to localhost for development
 */
function getApiUrl(): string {
  // Check for API URL in environment
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Default to localhost (can be changed via environment variable)
  return "http://localhost:3000";
}

/**
 * Create tRPC client with HTTP batch link
 * This is used to configure the provider
 */
export function createTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getApiUrl()}/api/trpc`,
        // Include credentials (cookies) with requests
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: "include",
          });
        },
      }),
    ],
  });
}

export type AppRouter = typeof AppRouter;
