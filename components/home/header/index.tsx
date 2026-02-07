import { Check } from "lucide-react";

const features = [
  { text: "Free KYC Plan" },
  { text: "220+ Countries" },
  { text: "< 10s Verification" },
  { text: "ISO 27001 Certified" },
  { text: "Developer APIs" },
];

export function DemoCenterHeader() {
  return (
    <div className="text-center mb-8 sm:mb-10 animate-fade-in-up">
      {/* Preheader label */}
      <p className="text-label-lg text-[#2567ff] mb-3 tracking-wide uppercase">
        Live Demo Environment
      </p>

      {/* Main headline */}
      <h1 className="text-display text-[#1a1a1a] mb-6">
        Experience{" "}
        <span className="text-gradient">
          Identity Verification
        </span>
      </h1>

      {/* Feature pills */}
      <div className="flex flex-wrap justify-center gap-2 max-w-[700px] mx-auto">
        {features.map((feature) => (
          <div
            key={feature.text}
            className="feature-pill feature-pill-selected"
          >
            <div className="flex size-4 items-center justify-center rounded-full bg-[#2567ff]">
              <Check className="size-2.5 text-white" strokeWidth={3} />
            </div>
            {feature.text}
          </div>
        ))}
      </div>
    </div>
  );
}
