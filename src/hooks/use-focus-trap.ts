"use client";

import * as React from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
  "[contenteditable]:not([contenteditable='false'])",
].join(",");

export interface FocusTrapOptions {
  /** When true, trap focus inside the container. Default: true. */
  active?: boolean | undefined;
  /** Element to restore focus to when the trap unmounts. */
  restoreTo?: React.RefObject<HTMLElement | null> | HTMLElement | null | undefined;
  /** Auto-focus the first focusable child on mount. Default: true. */
  autoFocus?: boolean | undefined;
}

/**
 * Lightweight focus-trap for modals/drawers/palettes.
 *
 * - Traps Tab/Shift+Tab within the container.
 * - Restores focus to `restoreTo` (or the previously-focused element) on unmount.
 * - Honors `prefers-reduced-motion` is not relevant here — only focus.
 *
 * Designed to be used inside a portal that has rendered the overlay.
 * Returns the container ref.
 */
export function useFocusTrap<T extends HTMLElement>(options: FocusTrapOptions = {}) {
  const { active = true, restoreTo, autoFocus = true } = options;
  const containerRef = React.useRef<T | null>(null);
  const previouslyFocusedRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    // Remember the element that had focus before opening.
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    previouslyFocusedRef.current = previousFocus;

    // Snapshot the restoreTo ref so the cleanup function is stable.
    const explicitRestore =
      restoreTo instanceof HTMLElement
        ? restoreTo
        : restoreTo && "current" in restoreTo
          ? restoreTo.current
          : null;

    const focusables = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute("aria-hidden"),
      );

    if (autoFocus) {
      const first = focusables()[0] ?? container;
      first.focus();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const current = document.activeElement;

      if (e.shiftKey) {
        if (current === first || !container.contains(current)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (current === last || !container.contains(current)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener("keydown", onKeyDown);

    return () => {
      container.removeEventListener("keydown", onKeyDown);
      // Restore focus to explicit target (snapshotted), then fall back to previous focus.
      const restoreTarget = explicitRestore ?? previousFocus;
      restoreTarget?.focus?.();
    };
  }, [active, autoFocus, restoreTo]);

  return containerRef;
}
