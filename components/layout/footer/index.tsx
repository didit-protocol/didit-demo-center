"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUp } from "lucide-react";

const productLinks = [
  { label: "Free KYC", href: "https://didit.me/products/free-kyc" },
  { label: "ID Verification", href: "https://didit.me/products/id-verification" },
  { label: "Liveness", href: "https://didit.me/products/liveness" },
  { label: "AML Screening", href: "https://didit.me/products/aml-screening" },
  { label: "Age Estimation", href: "https://didit.me/products/age-estimation" },
  { label: "NFC Verification", href: "https://didit.me/products/nfc-verification" },
  { label: "Face Match (1:1)", href: "https://didit.me/products/face-match-1to1" },
  { label: "Biometric Auth", href: "https://didit.me/products/biometric-authentication" },
  { label: "Face Search (1:N)", href: "https://didit.me/products/face-search-1ton" },
  { label: "Proof of Address", href: "https://didit.me/products/proof-of-address" },
  { label: "IP Analysis", href: "https://didit.me/products/ip-analysis" },
  { label: "Phone Verification", href: "https://didit.me/products/phone-verification" },
  { label: "Reusable KYC", href: "https://didit.me/products/reusable-kyc" },
  { label: "White Label", href: "https://didit.me/products/white-label" },
  { label: "Email Verification", href: "https://didit.me/products/email-verification" },
  { label: "Questionnaires", href: "https://didit.me/products/questionnaires" },
  { label: "Database Validation", href: "https://didit.me/products/database-validation" },
];

const footerLinks = [
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "https://docs.didit.me" },
      { label: "API Reference", href: "https://docs.didit.me/api-reference" },
      { label: "Blog", href: "https://didit.me/blog" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "https://didit.me/about-us" },
      { label: "Pricing", href: "https://didit.me/pricing" },
      { label: "Contact", href: "https://didit.me/get-a-demo" },
    ],
  },
];

export const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="bg-[#0f0f0f] text-white">
      <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {/* Main footer content - single row layout */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 lg:gap-6">
          {/* Brand section */}
          <div className="shrink-0 lg:max-w-[200px]">
            <Link href="/" className="inline-block">
              <Image
                alt="Didit"
                height={28}
                priority
                src="/didit-logo-wordmark-white.svg"
                width={80}
              />
            </Link>
            <p className="mt-3 text-[13px] leading-[1.6] text-[#8e8e93]">
              Free identity verification for modern businesses.
            </p>
            <div className="mt-3 flex flex-col gap-1.5">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.5px] text-[#636366]">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                ISO 27001 Certified
              </div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.5px] text-[#636366]">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                iBeta Certified
              </div>
            </div>
          </div>

          {/* Products section - 2 columns */}
          <div className="flex-1 lg:max-w-[340px]">
            <h3 className="text-[11px] font-semibold uppercase tracking-[1px] text-white/50 mb-3">
              Products
            </h3>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    className="text-[13px] text-[#8e8e93] transition-colors hover:text-white"
                    href={link.href}
                    target="_blank"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div className="shrink-0">
            <h3 className="text-[11px] font-semibold uppercase tracking-[1px] text-white/50 mb-3">
              Resources
            </h3>
            <ul className="space-y-1.5">
              {footerLinks[0].links.map((link) => (
                <li key={link.label}>
                  <Link
                    className="text-[13px] text-[#8e8e93] transition-colors hover:text-white"
                    href={link.href}
                    target="_blank"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div className="shrink-0">
            <h3 className="text-[11px] font-semibold uppercase tracking-[1px] text-white/50 mb-3">
              Company
            </h3>
            <ul className="space-y-1.5">
              {footerLinks[1].links.map((link) => (
                <li key={link.label}>
                  <Link
                    className="text-[13px] text-[#8e8e93] transition-colors hover:text-white"
                    href={link.href}
                    target="_blank"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar - compact */}
        <div className="mt-8 pt-5 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[12px] text-[#48484a]">
            © {new Date().getFullYear()} Didit. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link
              className="text-[12px] text-[#48484a] hover:text-white transition-colors"
              href="https://didit.me/terms"
              target="_blank"
            >
              Terms
            </Link>
            <Link
              className="text-[12px] text-[#48484a] hover:text-white transition-colors"
              href="https://didit.me/privacy"
              target="_blank"
            >
              Privacy
            </Link>
            <button
              aria-label="Back to top"
              className="flex size-7 items-center justify-center rounded-full text-[#636366] transition-all hover:text-white"
              onClick={scrollToTop}
            >
              <ArrowUp className="size-3" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
