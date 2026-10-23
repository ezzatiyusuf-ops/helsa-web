"use client";

/**
 * MotionProvider — پوشش سراسری Framer Motion برای prefers-reduced-motion (§51 بریف UI/UX).
 * با reducedMotion="user": وقتی کاربر در سیستم‌عامل «کاهش حرکت» را فعال کرده باشد،
 * انیمیشن‌های transform/layout (جابه‌جایی y، zoom و…) در کل سایت به‌صورت خودکار رد می‌شوند
 * و فقط مقدار نهایی اعمال می‌شود؛ opacity/color با سرعت عادی می‌مانند (ملایم و مجاز).
 * قاعدهٔ CSS معادل در globals.css هست — این پوشش، انیمیشن‌های JS-driven فریم‌موشن را می‌پوشاند.
 */
import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
