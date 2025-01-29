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
            width={80}
            height={33}
            src="/didit-logo-wordmark-black.svg"
            alt="Didit"
            priority
          />
        </Link>
        <div className="flex items-center space-x-4">
          <Link
            href={siteConfig.links.twitter}
            target="_blank"
            className="text-gray-600 hover:text-gray-900"
          >
            <Twitter className="h-5 w-5" />
          </Link>
          <Link
            href={siteConfig.links.github}
            target="_blank"
            className="text-gray-600 hover:text-gray-900"
          >
            <Github className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>
  );
};
