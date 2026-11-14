import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost" | "glow" | "outline-dark";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-ivory hover:bg-midnight-2 shadow-soft",
  secondary: "bg-paper text-ink border border-line-strong hover:border-ink/40 shadow-soft",
  ghost: "text-ink hover:bg-ink/5",
  /** For dark sections: luminous ivory pill. */
  glow: "bg-ivory text-midnight hover:bg-white shadow-[0_0_0_1px_rgb(255_255_255/0.4),0_10px_40px_-8px_rgb(186_172_247/0.65)]",
  "outline-dark": "text-ivory border border-white/25 hover:border-white/60 hover:bg-white/5",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-14 px-7 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return `inline-flex items-center justify-center gap-2 rounded-full font-medium transition-[background-color,border-color,box-shadow,transform,opacity] duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 select-none ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
