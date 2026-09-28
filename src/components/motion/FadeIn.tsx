"use client";

import { motion, type HTMLMotionProps } from "motion/react";

interface FadeInProps extends HTMLMotionProps<"div"> {
  /** Position in a list; each step adds a small stagger delay. */
  index?: number;
  step?: number;
  offset?: number;
}

/** Fade-and-rise entrance used for list items, cards and conversation bubbles. */
export function FadeIn({ index = 0, step = 0.03, offset = 6, transition, ...props }: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: offset }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * step, ...transition }}
      {...props}
    />
  );
}
