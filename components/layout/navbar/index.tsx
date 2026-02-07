"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

export const Navbar = () => {
  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Glass background */}
      <div className="absolute inset-0 glass-effect border-b border-[#e5e5e5]" />

      <div className="relative mx-auto max-w-[1234px] px-4 sm:px-6 lg:px-10">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <Image
              priority
              alt="Didit"
              height={32}
              src="/didit-logo-wordmark-black.svg"
              width={90}
            />
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Documentation link */}
            <Link
              href="https://docs.didit.me"
              target="_blank"
              className="btn-ghost hidden items-center gap-1.5 sm:inline-flex"
            >
              Documentation
              <ArrowUpRight className="size-3.5" />
            </Link>

            {/* Get Started CTA */}
            <Link
              href="https://business.didit.me"
              target="_blank"
              className="btn-primary inline-flex items-center gap-1.5 !py-2 !px-4 !text-[13px]"
            >
              Get Started
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};
