import { QueryClient } from '@tanstack/react-query';

export const STALE = {
  SHORT: 30 * 1000,
  MEDIUM: 2 * 60 * 1000,
  LONG: 5 * 60 * 1000,
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE.MEDIUM,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
