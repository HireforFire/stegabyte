import * as React from "react";
import { cn } from "@/lib/utils";
import { GlassPanel } from "./glass-panel";

/**
 * Glass card — built on top of GlassPanel so it inherits the corner
 * brackets, scan line and shadow stack.
 */
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function Card({ className, ...props }, ref) {
    return (
      <GlassPanel
        ref={ref}
        data-slot="card"
        className={cn("text-foreground", className)}
        {...props}
      />
    );
  },
);

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CardHeader({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        data-slot="card-header"
        className={cn("flex flex-col gap-1.5 p-6 md:p-8", className)}
        {...props}
      />
    );
  },
);

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(function CardTitle({ className, ...props }, ref) {
  return (
    <h3
      ref={ref}
      data-slot="card-title"
      className={cn(
        "text-lg font-extralight leading-tight tracking-tight text-white/90 md:text-xl",
        className,
      )}
      {...props}
    />
  );
});

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(function CardDescription({ className, ...props }, ref) {
  return (
    <p
      ref={ref}
      data-slot="card-description"
      className={cn("text-[13px] leading-relaxed text-white/50", className)}
      {...props}
    />
  );
});

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function CardContent({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      data-slot="card-content"
      className={cn("p-6 pt-0 md:p-8", className)}
      {...props}
    />
  );
});

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CardFooter({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        data-slot="card-footer"
        className={cn("flex items-center gap-3 p-6 pt-0 md:p-8", className)}
        {...props}
      />
    );
  },
);

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
