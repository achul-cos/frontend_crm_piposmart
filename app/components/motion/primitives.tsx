"use client";

import React from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { usePathname } from "next/navigation";
import { useAnimationPreference } from "@/app/components/motion/AnimationPreferenceContext";
import { useNavigationTransition } from "@/app/components/motion/NavigationTransitionContext";

// motion's event handlers (onAnimationStart, onDrag*, ...) conflict in signature with the plain
// DOM versions on React.HTMLAttributes, so drop those before spreading the rest (role, aria-*,
// onClick, onMouseEnter, ...) onto a motion.div.
type MotionDivProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration" | "onDrag" | "onDragStart" | "onDragEnd"
>;

// Page-level enter/exit, keyed by route so every /menu/* page gets a consistent transition
// without each page needing to opt in individually.
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { preference } = useAnimationPreference();
  const { isNavigating, completeNavigation } = useNavigationTransition();

  if (preference === "off") {
    return <>{children}</>;
  }

  const pageEnterDuration = preference === "reduced" ? 0.16 : 0.31;
  const pageExitDuration = preference === "reduced" ? 0.07 : 0.1;
  const contentEnterDelay = preference === "reduced" ? 0.025 : 0.07;
  const contentEnterDuration = preference === "reduced" ? 0.15 : 0.28;
  const contentExitDuration = preference === "reduced" ? 0.06 : 0.09;

  const pageVariants: Variants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        duration: pageEnterDuration,
        ease: [0.16, 1, 0.3, 1],
      },
    },
    exit: {
      opacity: 0,
      transition: {
        duration: pageExitDuration,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  };

  const contentVariants: Variants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        delay: contentEnterDelay,
        duration: contentEnterDuration,
        ease: [0.16, 1, 0.3, 1],
      },
    },
    exit: {
      opacity: 0,
      transition: {
        duration: contentExitDuration,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  };

  return (
    <AnimatePresence mode="wait" initial>
      <motion.div
        key={pathname}
        variants={pageVariants}
        initial="initial"
        animate={isNavigating ? "exit" : "animate"}
        exit="exit"
        className={isNavigating ? "pointer-events-none will-change-transform" : "will-change-transform"}
        onAnimationComplete={() => {
          if (isNavigating) {
            completeNavigation();
          }
        }}
      >
        <motion.div
          variants={contentVariants}
          initial="initial"
          animate={isNavigating ? "exit" : "animate"}
          exit="exit"
          className="will-change-transform"
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

const overlayVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const panelVariants: Variants = {
  initial: { opacity: 0, scale: 0.96, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.97, y: 8 },
};

// Overlay + panel used by both the shared Modal primitive and by existing bespoke modals that
// wrap their own JSX with this instead of migrating wholesale. Rest props (role, aria-*, etc.)
// pass straight through so these are drop-in replacements for the plain <div>s they came from.
export function AnimatedOverlay({
  children,
  className,
  onClick,
  ...rest
}: MotionDivProps) {
  return (
    <motion.div
      className={className}
      variants={overlayVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      onClick={onClick}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedPanel({
  children,
  className,
  ...rest
}: MotionDivProps) {
  return (
    <motion.div
      className={className}
      variants={panelVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ type: "spring", damping: 26, stiffness: 320 }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

const listItemVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
};

// Stagger-friendly wrapper for table rows / list items. Index is capped so long lists don't end
// up with a multi-second staggered entrance.
export function AnimatedListItem({
  children,
  index = 0,
  as = "div",
  className,
}: {
  children?: React.ReactNode;
  index?: number;
  as?: "div" | "tr" | "li";
  className?: string;
}) {
  const MotionTag = motion[as];
  const delay = Math.min(index, 12) * 0.025;
  return (
    <MotionTag
      className={className}
      variants={listItemVariants}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.2, delay, ease: "easeOut" }}
    >
      {children}
    </MotionTag>
  );
}

// Small hover/tap micro-interaction for cards and action buttons.
export function AnimatedCard({
  children,
  className,
  onClick,
}: {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <motion.div
      className={className}
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.15 }}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedSection({
  children,
  className,
  index = 0,
  as = "div",
}: {
  children?: React.ReactNode;
  className?: string;
  index?: number;
  as?: "div" | "section" | "main";
}) {
  const { preference } = useAnimationPreference();
  const MotionTag = motion[as];

  if (preference === "off") {
    return React.createElement(as, { className }, children);
  }

  const delayStep = preference === "reduced" ? 0.0175 : 0.035;
  const delay = Math.min(index, 8) * delayStep;

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        delay,
        duration: preference === "reduced" ? 0.17 : 0.29,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </MotionTag>
  );
}

export const AnimatedButton = motion.button;
