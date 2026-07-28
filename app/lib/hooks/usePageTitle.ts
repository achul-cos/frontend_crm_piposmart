"use client";

import { useEffect } from "react";

export function usePageTitle(pageName: string) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${pageName} - CRM Piposmart`;
    return () => {
      document.title = previousTitle;
    };
  }, [pageName]);
}
