import { ShieldCheck, Code2, SlidersHorizontal, Timer } from "lucide-react";
export function DemoCenterHeader() {
  return (
    <div className="text-center mb-6 sm:mb-8">
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-3 sm:mb-4">
        <span className="text-[#2667ff]">Didit</span>{" "}
        <span className="text-app-black">Demo Center</span>
      </h1>
      <p className="text-base sm:text-lg md:text-lg text-gray-500 max-w-3xl mx-auto mb-4">
        Test our most popular identity verification workflows below. These are
        live examples of what you can build and fully customize in your own
        Didit Console. Every feature is also accessible via our powerful
        Standalone APIs for developers.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 max-w-4xl mx-auto">
        <span className="inline-flex items-center rounded-full border border-gray-200 bg-white/80 backdrop-blur px-3 py-1 text-xs sm:text-sm text-gray-800 shadow-sm hover:shadow transition">
          <Code2 className="h-3.5 w-3.5 mr-1.5 text-[#2667ff]" />
          Start Free • Unlimited Core KYC
        </span>
        <span className="inline-flex items-center rounded-full border border-gray-200 bg-white/80 backdrop-blur px-3 py-1 text-xs sm:text-sm text-gray-800 shadow-sm hover:shadow transition">
          <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-[#2667ff]" />
          Fully Customizable Workflows & APIs
        </span>
        <span className="inline-flex items-center rounded-full border border-gray-200 bg-white/80 backdrop-blur px-3 py-1 text-xs sm:text-sm text-gray-800 shadow-sm hover:shadow transition">
          <Code2 className="h-3.5 w-3.5 mr-1.5 text-[#2667ff]" />
          Developer-First • Instant Sandbox Access
        </span>
        <span className="inline-flex items-center rounded-full border border-gray-200 bg-white/80 backdrop-blur px-3 py-1 text-xs sm:text-sm text-gray-800 shadow-sm hover:shadow transition">
          <ShieldCheck className="h-3.5 w-3.5 mr-1.5 text-[#2667ff]" />
          ISO 27001 Certified & GDPR Ready
        </span>
        <span className="inline-flex items-center rounded-full border border-[#2667ff] bg-blue-50 px-3 py-1 text-xs sm:text-sm text-[#2667ff] shadow-sm hover:shadow transition">
          <Timer className="h-3.5 w-3.5 mr-1.5" />
          Start in <span className="mx-1 font-semibold">2 min</span>
        </span>
      </div>
    </div>
  );
}
