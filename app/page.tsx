"use client";

import { useState } from "react";
import { DemoCenterHeader } from "@/components/home/header";
import { DemoSelector } from "@/components/home/demo-selector";
import { SignInTab } from "@/components/home/tab/sign-in";
import { DataTransferTab } from "@/components/home/tab/data-transfer";
import { IdVerificationTab } from "@/components/home/tab/id-verification";
import { DEFAULT_SCOPE_ITEMS } from "@/lib/scopes";

export default function Home() {
  const [selectedDemo, setSelectedDemo] = useState<string>("sign-in");
  const [scopeItems, setScopeItems] = useState(DEFAULT_SCOPE_ITEMS);

  return (
    <div className="py-6 sm:py-12">
      <div className="container relative mx-auto px-4 py-4">
        <DemoCenterHeader />
        <div className="grid grid-cols-1 md:grid-cols-[300px,1fr] lg:grid-cols-[360px,1fr] gap-8 md:gap-16 max-w-[1200px] mx-auto">
          <DemoSelector
            selectedDemo={selectedDemo}
            onDemoSelect={setSelectedDemo}
          />

          <div className="bg-white rounded-[20px] sm:rounded-[32px] p-6 sm:p-12 border border-gray-100">
            {selectedDemo === "verification" && <IdVerificationTab />}
            {selectedDemo === "sign-in" && (
              <SignInTab
                scopeItems={scopeItems}
                setScopeItems={setScopeItems}
              />
            )}

            {selectedDemo === "data-transfer" && (
              <DataTransferTab
                scopeItems={scopeItems}
                setScopeItems={setScopeItems}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
