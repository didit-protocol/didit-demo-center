"use client";

import { DemoCenterHeader } from "@/components/home/header";
import { WorkflowsTab } from "@/components/home/tab/workflows";

export default function Home() {
  return (
    <div className="py-6 sm:py-12">
      <div className="relative mx-auto px-4 py-4">
        <DemoCenterHeader />
        <div className="max-w-[1200px] mx-auto">
          <div className="bg-white rounded-[20px] sm:rounded-[32px] p-6 sm:p-12 border border-gray-100">
            <WorkflowsTab />
          </div>
        </div>
      </div>
    </div>
  );
}
