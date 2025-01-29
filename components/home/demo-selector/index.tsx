import { FileCheck, LogIn, FileUp } from "lucide-react";

import { Button } from "@/components/ui/button";

interface DemoSelectorProps {
  selectedDemo: string;
  onDemoSelect: (demo: string) => void;
}

export function DemoSelector({
  selectedDemo,
  onDemoSelect,
}: DemoSelectorProps) {
  const demos = [
    {
      id: "verification",
      icon: FileCheck,
      title: "Identity Verification (KYC)",
      description: "Government ID + Biometrics",
      category: "Identity Verification",
    },
    {
      id: "sign-in",
      icon: LogIn,
      title: "Sign In",
      description: "Manage users access",
      category: "Auth + Data",
    },
    {
      id: "data-transfer",
      icon: FileUp,
      title: "Data transfer",
      description: "Request data to authorize",
      category: "Auth + Data",
    },
  ];

  // Group demos by category
  const groupedDemos = demos.reduce(
    (acc, demo) => {
      if (!acc[demo.category]) {
        acc[demo.category] = [];
      }
      acc[demo.category].push(demo);

      return acc;
    },
    {} as Record<string, typeof demos>,
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="font-medium text-base sm:text-lg mb-2">Select Demo</h2>
        <p className="hidden sm:block text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">
          Scan each generated QR code with Didit Identity Wallet app to see how
          the process in action
        </p>
      </div>

      {/* Mobile view - all demos in one row */}
      <div className="grid grid-cols-3 gap-2 sm:hidden">
        {demos.map((demo) => (
          <Button
            key={demo.id}
            className={`w-full justify-center h-auto py-2 px-2 rounded-lg ${
              selectedDemo === demo.id
                ? "border-[#2667ff] border-2 bg-blue-50"
                : ""
            }`}
            variant="outline"
            onClick={() => onDemoSelect(demo.id)}
          >
            <div className="flex flex-col items-center">
              <demo.icon className="h-4 w-4 shrink-0" />
              <div className="text-center min-w-0 mt-1">
                <div className="font-medium text-xs truncate">
                  {demo.id === "verification" ? "KYC" : demo.title}
                </div>
              </div>
            </div>
          </Button>
        ))}
      </div>
      {/* Desktop view - grouped by category */}
      <div className="hidden sm:block space-y-6">
        {Object.entries(groupedDemos).map(([category, categoryDemos]) => (
          <div key={category} className="space-y-3">
            <h3 className="font-medium text-sm text-gray-600">{category}</h3>
            <div className="grid grid-cols-1 gap-3">
              {categoryDemos.map((demo) => (
                <Button
                  key={demo.id}
                  className={`w-full justify-start h-auto py-4 px-6 rounded-xl ${
                    selectedDemo === demo.id
                      ? "border-[#2667ff] border-2 bg-blue-50"
                      : ""
                  }`}
                  variant="outline"
                  onClick={() => onDemoSelect(demo.id)}
                >
                  <div className="flex flex-row items-center">
                    <demo.icon className="h-5 w-5 mr-3 shrink-0" />
                    <div className="text-left min-w-0">
                      <div className="font-medium text-base truncate">
                        {demo.title}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {demo.description}
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
