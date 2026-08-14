"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { AnimationPreferenceProvider } from "@/app/components/motion/AnimationPreferenceContext";
import { NavigationTransitionProvider } from "@/app/components/motion/NavigationTransitionContext";
import { frontendEnv } from "@/app/lib/env";
import {
  persistQueryCache,
  restorePersistedQueryCache,
} from "@/app/lib/queryPersistence";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: true,
            retry: 1,
          },
        },
      }),
  );

  useEffect(() => {
    restorePersistedQueryCache(queryClient);

    let persistTimer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      if (persistTimer) {
        clearTimeout(persistTimer);
      }

      persistTimer = setTimeout(() => {
        persistQueryCache(queryClient);
      }, 250);
    });

    return () => {
      if (persistTimer) {
        clearTimeout(persistTimer);
      }
      unsubscribe();
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <AnimationPreferenceProvider>
        <NavigationTransitionProvider>{children}</NavigationTransitionProvider>
      </AnimationPreferenceProvider>
      {process.env.NODE_ENV === "development" &&
      frontendEnv.enableReactQueryDevtools ? (
        <ReactQueryDevtools initialIsOpen={false} />
      ) : null}
    </QueryClientProvider>
  );
}
