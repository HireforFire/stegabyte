import * as React from "react";
import { cn } from "@/lib/utils";

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

/** Tech label — uppercase, tracked, low-opacity. Matches PortfolioSite FormField label. */
const Label = React.forwardRef<HTMLLabelElement, LabelProps>(function Label(
  { className, ...props },
  ref,
) {
  return (
    <label
      ref={ref}
      data-slot="label"
      className={cn(
        "mb-2 block text-xs font-normal uppercase tracking-[0.2em] text-white/40",
        className,
      )}
      {...props}
    />
  );
});

export { Label };
