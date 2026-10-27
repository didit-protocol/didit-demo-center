"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@website/lib/utils";

/**
 * Didit v5 Button — pill-shaped, one black Primary and one Blue Accent.
 * Everything else is neutral. Never use semantic colors (success/warning) on buttons.
 *
 * Geometry is standardized with the console Button (fe-application-console
 * src/modules/shared/components/ui/button.tsx, "Remix v5"): heights sm 28 ·
 * md 36 · lg 44 and icon-aware asymmetric padding (see PADDING). Marketing
 * keeps `default` at the lg geometry with the roomy 24px hero-CTA padding, and
 * shares its typography with the console: 14px, tracking −0.025rem, default
 * leading. Rendered weight is 500 site-wide via the global button rule in
 * globals.css. Variant colors stay website-specific (primary = ink frost
 * here, blue in the console).
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-sans font-medium text-sm tracking-[-0.025rem] transition-colors duration-fast ease-out focus-visible:outline-none focus-visible:shadow-ring disabled:pointer-events-none disabled:bg-[#787880]/10 disabled:text-[#9DA1A1] disabled:border-transparent [&_svg]:pointer-events-none [&_svg]:shrink-0 rounded-pill",
  {
    variants: {
      variant: {
        // Primary is solid ink that lifts to a lighter — still opaque — charcoal
        // on hover (never translucent). Secondary keeps the backdrop-blur(6px)
        // frost on a faint cool tint + hairline border so it sits cleanly over
        // the network globe / any imagery.
        primary: "bg-ink text-canvas hover:bg-[#2a2a2a]",
        accent: "bg-blue text-canvas hover:bg-blue-deep",
        secondary:
          "border border-[rgba(33,34,38,0.06)] bg-[rgba(183,191,217,0.10)] text-ink backdrop-blur-[6px] hover:bg-[rgba(183,191,217,0.18)]",
        outline: "bg-canvas text-ink border border-line hover:bg-black/[0.04]",
        ghost: "bg-transparent text-ink hover:bg-black/[0.04]",
        link: "bg-transparent text-blue underline-offset-4 hover:underline rounded-none",
        // Soft-outline destructive (white bg, red border + label) — never a
        // solid red fill. Matches the console danger treatment.
        danger: "bg-canvas text-danger border border-danger hover:bg-danger/[0.06]"
      },
      size: {
        // Console height scale: sm 28 · md 36 · lg 44. `default` = lg geometry —
        // hero-CTA proportions keep the roomy 24px padding vs the console's 14px.
        // Horizontal padding lives in PADDING (icon-aware), not here.
        default: "h-11 gap-2 [&_svg]:size-5",
        sm: "h-7 gap-1.5 text-xs [&_svg]:size-4",
        md: "h-9 gap-2 [&_svg]:size-5",
        lg: "h-11 gap-2 [&_svg]:size-5",
        icon: "h-9 w-9 gap-0 p-0 [&_svg]:size-5"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "default"
    }
  }
);

// Horizontal padding keyed by size AND which side an icon sits on — the console
// Button's PADDING rule: the icon side hugs the pill cap (concentric icon), the
// text side keeps the size's optical padding. sm/md copy the console values;
// default/lg apply the same rule to the roomy website geometry: icon side is
// 24 − 8 = 16px (concentric with the pill cap for the DS ArrowDiagonal, whose
// glyph inks inside its 20px box), text side stays 24.
const PADDING = {
  default: { none: "px-6", leading: "pl-4 pr-6", trailing: "pl-6 pr-4" },
  lg: { none: "px-6", leading: "pl-4 pr-6", trailing: "pl-6 pr-4" },
  md: { none: "px-3.5", leading: "pl-2.5 pr-3.5", trailing: "pl-3.5 pr-2.5" },
  sm: { none: "px-2.5", leading: "pl-2 pr-2.5", trailing: "pl-2.5 pr-2" },
  icon: { none: "", leading: "", trailing: "" }
} as const;

// An icon is a component element (lucide, DS icons) or a host <svg> — server
// components pass icons across the RSC boundary already rendered to <svg>, so
// a component-only check never fires there. A label is a bare string or a host
// element like <span>.
const isIconNode = (node: React.ReactNode): boolean =>
  React.isValidElement(node) && (typeof node.type !== "string" || node.type === "svg");

function getIconSide(node: React.ReactNode): "leading" | "trailing" | null {
  const items = React.Children.toArray(node);
  if (items.length < 2) return null;
  const firstIsIcon = isIconNode(items[0]);
  const lastIsIcon = isIconNode(items[items.length - 1]);
  if (firstIsIcon && !lastIsIcon) return "leading";
  if (lastIsIcon && !firstIsIcon) return "trailing";
  return null;
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /**
   * Which side the icon sits on, for the concentric PADDING rule. Auto-detected
   * from children in client trees — but children rendered by a SERVER component
   * cross the RSC boundary opaque (the icon isn't inspectable), so server call
   * sites (e.g. hero.tsx CTAs) must pass this explicitly.
   */
  iconSide?: "leading" | "trailing";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, iconSide: iconSideProp, children, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    const resolvedVariant = variant ?? "primary";
    // With asChild the real content lives inside the slotted child (e.g. <Link>).
    const contentForIcons =
      asChild && React.isValidElement(children)
        ? (children.props as { children?: React.ReactNode }).children
        : children;
    const iconSide = iconSideProp ?? getIconSide(contentForIcons);
    return (
      <Comp
        data-didit-component="button"
        data-didit-variant={resolvedVariant}
        className={cn(
          buttonVariants({ variant, size }),
          PADDING[size ?? "default"][iconSide ?? "none"],
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
