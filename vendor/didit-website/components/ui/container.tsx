import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@website/lib/utils";

/**
 * Didit v5 Container — matches OpenAI's /business and /api max-widths.
 * Default `size="lg"` = 1200px (their marketing default). Use `size="xl"` (1400px)
 * for hero sections with big imagery. `size="prose"` (720px) for long-form editorial.
 */
const containerVariants = cva("mx-auto w-full px-4 sm:px-6 md:px-10 lg:px-12", {
  variants: {
    size: {
      sm: "max-w-3xl" /* 768px  — tight editorial */,
      prose: "max-w-[45rem]" /* 720px  — long-form copy */,
      md: "max-w-5xl" /* 1024px — focused pages */,
      lg: "max-w-[75rem]" /* 1200px — marketing default (OpenAI) */,
      xl: "max-w-[87.5rem]" /* 1400px — hero with imagery */,
      full: "max-w-none"
    }
  },
  defaultVariants: { size: "lg" }
});

export interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof containerVariants> {
  as?: React.ElementType;
}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size, as: Comp = "div", ...props }, ref) => (
    <Comp
      data-didit-component="container"
      ref={ref}
      className={cn(containerVariants({ size }), className)}
      {...props}
    />
  )
);
Container.displayName = "Container";

export { Container, containerVariants };
