"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";

/*
 * The Demo Center menu on a phone, where the bar has no room for its links:
 * a button that opens them in a panel under the bar. Escape, a tap outside
 * and following a link close it. The hub and the product demo pages share
 * it; their stylesheets decide below which width it shows.
 */

export interface MenuLink {
  label: string;
  href: string;
  current?: boolean;
  /** Opens in a new tab, with the outbound arrow. */
  external?: boolean;
}

export function MobileNav({
  links,
  className,
}: {
  links: MenuLink[];
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const root = React.useRef<HTMLDivElement>(null);
  const button = React.useRef<HTMLButtonElement>(null);
  const id = React.useId();

  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={root} className={`dc-menu ${className ?? ""}`}>
      <button
        ref={button}
        aria-controls={id}
        aria-expanded={open}
        aria-label="Menu"
        className="dc-menu-btn"
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? (
          <X aria-hidden size={20} />
        ) : (
          <Menu aria-hidden size={20} />
        )}
      </button>
      <nav
        aria-label="Menu"
        className="dc-menu-panel"
        hidden={!open}
        id={id}
      >
        <ul>
          {links.map((link) => (
            <li key={link.label}>
              {link.external ? (
                <a
                  href={link.href}
                  rel="noreferrer"
                  target="_blank"
                  onClick={close}
                >
                  {link.label} <ArrowUpRight aria-hidden size={16} />
                </a>
              ) : (
                <Link
                  aria-current={link.current ? "page" : undefined}
                  href={link.href}
                  onClick={close}
                >
                  {link.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
