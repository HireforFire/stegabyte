import * as React from "react";
import { cn } from "@/lib/utils";

const noop = () => {};

export interface SwitchProps {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  className?: string;
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { checked, onCheckedChange = noop, disabled, id, className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "border-white/8 relative inline-flex h-7 w-12 items-center rounded-full border transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-gradient-to-r from-indigo to-cyan" : "bg-white/8",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
});
