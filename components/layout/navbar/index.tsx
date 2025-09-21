"use client";

import Link from "next/link";
import Image from "next/image";
import { Twitter, Github } from "lucide-react";

import { siteConfig } from "@/config/site";

export const Navbar = () => {
  return (
    <header className="border-b border-gray-200">
      <div className="max-w-[1200px] mx-auto flex items-center justify-between h-16 px-4">
        <Link className="flex justify-start items-center gap-1" href="/">
          <Image
            priority
            alt="Didit"
            height={33}
            src="/didit-logo-wordmark-black.svg"
            width={80}
          />
        </Link>
        <div className="flex items-center space-x-4">
          <Link
            className="hidden sm:inline-flex items-center rounded-lg bg-[#2667ff] hover:bg-[#2667ff]/90 text-white px-4 py-2 text-sm font-semibold"
            href="https://business.didit.me"
            target="_blank"
          >
            Create a free account
          </Link>
          <Link
            className="text-gray-600 hover:text-gray-900"
            href={siteConfig.links.twitter}
            target="_blank"
          >
            <Twitter className="h-5 w-5" />
          </Link>
          <Link
            className="text-gray-600 hover:text-gray-900"
            href={siteConfig.links.github}
            target="_blank"
          >
            <Github className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>
  );
};
