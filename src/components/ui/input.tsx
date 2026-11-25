import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leadingIcon?: ReactNode;
  trailingElement?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    id,
    label,
    helperText,
    error,
    leadingIcon,
    trailingElement,
    className,
    ...props
  },
  ref
) {
  const describedById = error
    ? `${id ?? "input"}-error`
    : helperText
      ? `${id ?? "input"}-helper`
      : undefined;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-medium tracking-wide text-foreground"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leadingIcon && (
          <span
            className="pointer-events-none absolute left-3.5 flex items-center text-muted"
            aria-hidden="true"
          >
            {leadingIcon}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedById}
          className={cn(
            "h-11 w-full rounded-lg border bg-subtle px-3.5 text-sm text-foreground placeholder:text-muted/80 transition-colors duration-150 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-60",
            leadingIcon ? "pl-10" : undefined,
            trailingElement ? "pr-11" : undefined,
            error
              ? "border-error focus:border-error focus:ring-error/25"
              : "border-border-strong hover:border-muted/60",
            className
          )}
          {...props}
        />
        {trailingElement && (
          <div className="absolute right-2 flex items-center">{trailingElement}</div>
        )}
      </div>
      {error ? (
        <p id={describedById} role="alert" className="text-xs text-error-text">
          {error}
        </p>
      ) : helperText ? (
        <p id={describedById} className="text-xs text-muted">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    { id, label, helperText, error, className, ...props },
    ref
  ) {
    const describedById = error
      ? `${id ?? "textarea"}-error`
      : helperText
        ? `${id ?? "textarea"}-helper`
        : undefined;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={id}
            className="block text-xs font-medium tracking-wide text-foreground"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedById}
          className={cn(
            "min-h-[140px] w-full rounded-lg border bg-subtle p-3.5 text-sm leading-relaxed text-foreground placeholder:text-muted/80 transition-colors duration-150 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-60",
            error
              ? "border-error focus:border-error focus:ring-error/25"
              : "border-border-strong hover:border-muted/60",
            className
          )}
          {...props}
        />
        {error ? (
          <p id={describedById} role="alert" className="text-xs text-error-text">
            {error}
          </p>
        ) : helperText ? (
          <p id={describedById} className="text-xs text-muted">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);
