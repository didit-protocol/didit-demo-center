"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { WorkflowConfig } from "@/lib/workflows";

interface WorkflowCardProps {
  workflow: WorkflowConfig;
  onClick: () => void;
  index: number;
}

export function WorkflowCard({ workflow, onClick, index }: WorkflowCardProps) {
  const IconComponent = workflow.icon;

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3, ease: "easeOut" }}
      onClick={onClick}
      className={cn(
        "group relative flex flex-col text-left",
        "rounded-xl bg-[#f5f5f7] p-5",
        "transition-all duration-200",
        "hover:bg-[#ebebed] hover:shadow-sm",
        "focus:outline-none focus:ring-2 focus:ring-[#2567ff]/20 focus:ring-offset-2"
      )}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-white shadow-sm">
          <IconComponent className="size-5 text-[#1a1a1a]" strokeWidth={1.5} />
        </div>
        <h3 className="text-[16px] font-semibold text-[#1a1a1a] leading-tight flex-1">
          {workflow.shortTitle}
        </h3>
        <div className="flex size-8 items-center justify-center rounded-full bg-white/60 transition-all duration-200 group-hover:bg-[#2567ff] group-hover:shadow-sm">
          <ArrowRight className="size-4 text-[#6e6e73] transition-colors group-hover:text-white" />
        </div>
      </div>

      {/* Description */}
      <p className="text-[14px] leading-[1.6] text-[#6e6e73] line-clamp-2">
        {workflow.description}
      </p>
    </motion.button>
  );
}
