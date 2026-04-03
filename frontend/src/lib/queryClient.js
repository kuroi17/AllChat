import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep route-to-route navigation snappy by reusing recent data.
      staleTime: 2 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});
