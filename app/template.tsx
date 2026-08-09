"use client";

import { PageTransition } from "@/app/components/motion/primitives";

export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}

