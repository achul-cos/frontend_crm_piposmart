"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";

type NavigationMode = "push" | "replace";

type NavigationTransitionContextValue = {
  isNavigating: boolean;
  startNavigation: (href: string, mode?: NavigationMode) => void;
  completeNavigation: () => void;
};

const NavigationTransitionContext = createContext<NavigationTransitionContextValue>({
  isNavigating: false,
  startNavigation: () => {},
  completeNavigation: () => {},
});

function normalizeHref(input: string): URL {
  const base =
    typeof window === "undefined" ? "http://localhost" : window.location.origin;
  return new URL(input, base);
}

export function NavigationTransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const pendingHrefRef = useRef<string | null>(null);
  const pendingModeRef = useRef<NavigationMode>("push");

  const resetPendingNavigation = useCallback(() => {
    pendingHrefRef.current = null;
    pendingModeRef.current = "push";
  }, []);

  useEffect(() => {
    setIsNavigating(false);
    resetPendingNavigation();
  }, [pathname, resetPendingNavigation]);

  const startNavigation = useCallback(
    (href: string, mode: NavigationMode = "push") => {
      if (typeof window !== "undefined") {
        const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        const next = normalizeHref(href);
        const nextPath = `${next.pathname}${next.search}${next.hash}`;
        if (currentPath === nextPath) return;
      }

      pendingHrefRef.current = href;
      pendingModeRef.current = mode;
      setIsNavigating(true);
    },
    [],
  );

  const completeNavigation = useCallback(() => {
    const href = pendingHrefRef.current;
    const mode = pendingModeRef.current;
    if (!href) return;

    resetPendingNavigation();

    if (mode === "replace") {
      router.replace(href);
      return;
    }

    router.push(href);
  }, [resetPendingNavigation, router]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const hrefAttr = anchor.getAttribute("href");
      if (!hrefAttr || hrefAttr.startsWith("#")) return;

      const url = normalizeHref(hrefAttr);
      if (url.origin !== window.location.origin) return;

      const nextPath = `${url.pathname}${url.search}${url.hash}`;
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (nextPath === currentPath) return;

      event.preventDefault();
      startNavigation(nextPath, "push");
    };

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [startNavigation]);

  const value = useMemo(
    () => ({
      isNavigating,
      startNavigation,
      completeNavigation,
    }),
    [completeNavigation, isNavigating, startNavigation],
  );

  return (
    <NavigationTransitionContext.Provider value={value}>
      {children}
    </NavigationTransitionContext.Provider>
  );
}

export function useNavigationTransition() {
  return useContext(NavigationTransitionContext);
}
