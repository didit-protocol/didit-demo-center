"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Database } from "lucide-react";
import { ScopeSelector } from "@/components/general/scope-selector";
import { ScopeItems } from "@/lib/scopes";
import { useAuth } from "@/app/hooks/useAuth";
import { JsonViewer } from "@/components/general/json-viewer";
import { QRViewer } from "@/components/general/qr-viewer";

interface DataTransferTabProps {
  scopeItems: ScopeItems;
  setScopeItems: React.Dispatch<React.SetStateAction<ScopeItems>>;
}

export function DataTransferTab({
  scopeItems,
  setScopeItems,
}: DataTransferTabProps) {
  const {
    sessionData,
    sessionStatus,
    decisionData,
    createSessionWithScope,
    isMobileDevice,
  } = useAuth();

  const handleCreateSession = async () => {
    await createSessionWithScope(scopeItems);
  };

  return (
    <div className="flex flex-col py-2 space-y-6 sm:space-y-8">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="bg-[#f4f4f6] p-2 sm:p-3 rounded-full">
          <Database className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
        </div>
        <h2 className="text-lg sm:text-xl font-medium">Data Transfer</h2>
      </div>
      {!sessionData && !decisionData && (
        <ScopeSelector scopeItems={scopeItems} setScopeItems={setScopeItems} />
      )}

      {sessionData && sessionData.url && !decisionData && (
        <>
          {isMobileDevice() ? (
            <Button
              variant="default"
              onClick={() => (window.location.href = sessionData.url)}
              className="w-full h-12 sm:h-14 px-6 sm:px-8 rounded-full text-sm font-normal border-2 border-gray-200"
            >
              Open Didit App (to continue)
              <div className="bg-white/20 rounded-full p-1 ml-2">
                <ArrowRight className="h-3 w-3" />
              </div>
            </Button>
          ) : (
            <QRViewer url={sessionData.url} status={sessionStatus} />
          )}
        </>
      )}

      {decisionData && <JsonViewer title="Decision Data" data={decisionData} />}

      <div className="flex flex-col py-8 space-y-8">
        <div className="flex justify-between items-center">
          <Button
            onClick={handleCreateSession}
            variant="default"
            className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 rounded-full bg-[#2667ff] hover:bg-[#2667ff]/90 text-sm sm:text-base font-normal"
          >
            {sessionData || decisionData ? (
              <>
                <span>Create new session</span>
                <div className="bg-white/20 rounded-full p-1 ml-2">
                  <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                </div>
              </>
            ) : (
              <>
                <span>Create session</span>
                <div className="bg-white/20 rounded-full p-1 ml-2">
                  <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                </div>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
