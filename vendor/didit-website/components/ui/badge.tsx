import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@website/lib/utils";

/**
 * Didit Badge — the console Design System "Badge Label", ported to website
 * tokens. One shape everywhere: fully-rounded pill, 1px border, Inter 500 /
 * 10px / 0.18px tracking / uppercase. Only colour and size change.
 *
 * Sizes mirror the console scale — sm 22 · md 24 · lg 28 (default) · xl 36.
 */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-pill border text-[10px] font-medium uppercase leading-none tracking-[0.18px]",
  {
    variants: {
      variant: {
        default: "border-black/[0.08] bg-black/[0.04] text-ink",
        blue: "border-transparent bg-blue text-canvas",
        soft: "border-blue/20 bg-blue-soft text-blue-deep",
        ink: "border-ink bg-ink text-canvas",
        outline: "border-line bg-canvas text-ink",
        // Translucent white-on-dark — for dark / Blue surfaces (e.g. the
        // funding TopBar): white @ 25% fill + backdrop blur + Canvas text.
        // Never use on a light canvas.
        white: "border-canvas/25 bg-canvas/25 text-canvas backdrop-blur-[6px]",
        success: "border-success/20 bg-success-bg text-success",
        warning: "border-warning/20 bg-warning-bg text-warning",
        danger: "border-danger/20 bg-danger-bg text-danger"
      },
      size: {
        sm: "h-[22px] px-2",
        md: "h-6 px-2",
        lg: "h-7 px-2.5",
        xl: "h-9 px-3"
      }
    },
    defaultVariants: { variant: "default", size: "lg" }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span
      data-didit-component="badge"
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
