import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type = "text", autoComplete, ...props },
  ref,
) {
  const defaultAutoComplete = "off";
  return (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      autoComplete={autoComplete ?? defaultAutoComplete}
      spellCheck={false}
      className={cn(
        "tech-input h-11",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "aria-invalid:border-crimson/60",
        className,
      )}
      {...props}
    />
  );
});

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      data-slot="textarea"
      spellCheck={false}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      className={cn(
        "tech-input scrollbar-thin min-h-[120px]",
        "aria-invalid:border-crimson/60",
        className,
      )}
      {...props}
    />
  );
});

export { Input, Textarea };
