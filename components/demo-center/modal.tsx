"use client";

import * as React from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  /** Announced as the dialog's accessible name. */
  label: string;
  /** Tailwind max-width class for the panel, e.g. `max-w-[840px]`. */
  width?: string;
  /** Stacking order: detail < runner < results. */
  z?: string;
  children: React.ReactNode;
};

/**
 * The demo centre's one modal shell.
 *
 * Deliberately not Radix: the vendored didit.me chrome already owns the
 * `data-scroll-locked` body attribute for its own overlays, and a second
 * scroll-lock implementation on top of it fights the sticky header. This locks
 * the page on <html> the same way styles/website-chrome.css does, traps Tab
 * inside the panel, restores focus on close, and closes on Escape or a scrim
 * click.
 */
export function Modal({
  open,
  onClose,
  label,
  width = "max-w-[840px]",
  z = "z-[80]",
  children,
}: ModalProps) {
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    document.documentElement.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();

        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select, textarea, iframe, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null || el.tagName === "IFRAME");

      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    // Move focus into the panel so the keyboard path starts inside the dialog.
    panelRef.current?.focus();

    const restore = restoreFocusRef.current;

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.documentElement.style.overflow = "";
      restore?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 flex items-center justify-center p-4 sm:p-6",
        z,
      )}
    >
      <button
        aria-label="Close"
        className="modal-scrim animate-fade-in cursor-default"
        tabIndex={-1}
        type="button"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        aria-label={label}
        aria-modal="true"
        className={cn(
          "modal-panel animate-modal-in max-h-[calc(100vh-48px)]",
          width,
        )}
        role="dialog"
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}

/** The round close button every modal header uses. */
export function ModalCloseButton({
  onClose,
  size = "lg",
}: {
  onClose: () => void;
  size?: "sm" | "lg";
}) {
  return (
    <button
      aria-label="Close"
      className={cn(
        "flex flex-none items-center justify-center rounded-pill bg-black/[0.04] text-muted transition-colors duration-fast hover:bg-black/[0.1] hover:text-ink",
        size === "lg" ? "size-9" : "size-8",
      )}
      type="button"
      onClick={onClose}
    >
      <X className={size === "lg" ? "size-[18px]" : "size-4"} />
    </button>
  );
}
