"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

/** Re-mounts on every navigation, giving each page a soft entrance. */
export default function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}
