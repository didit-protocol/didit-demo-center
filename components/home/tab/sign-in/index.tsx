"use client";

import { LogIn, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AuthService } from "@/lib/auth-service";
import { ScopeItems } from "@/lib/scopes";
import { useAuth } from "@/app/hooks/useAuth";
import { ScopeSelector } from "@/components/general/scope-selector";
import { JsonViewer } from "@/components/general/json-viewer";

interface SignInTabProps {
  scopeItems: ScopeItems;
  setScopeItems: React.Dispatch<React.SetStateAction<ScopeItems>>;
}

export function SignInTab({ scopeItems, setScopeItems }: SignInTabProps) {
  const { isLoggedIn, logout, userData } = useAuth();

  const handleSignIn = () => {
    const selectedScopes = AuthService.getSelectedScopes(scopeItems);
    const authorizeUrl = AuthService.getAuthorizeUrl(selectedScopes);

    window.open(authorizeUrl, "_blank");
  };

  return (
    <div className="flex flex-col py-2 space-y-6 sm:space-y-8">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="bg-[#f4f4f6] p-2 sm:p-3 rounded-full">
          <LogIn className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
        </div>
        <h2 className="text-lg sm:text-xl font-medium">Sign in with Didit</h2>
      </div>
      {isLoggedIn ? (
        userData && <JsonViewer data={userData} title="User Data" />
      ) : (
        <ScopeSelector scopeItems={scopeItems} setScopeItems={setScopeItems} />
      )}

      <div className="flex flex-col py-8 space-y-8">
        <div className="flex justify-between items-center">
          {isLoggedIn ? (
            <Button
              className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 rounded-full text-sm sm:text-base font-normal"
              variant="destructive"
              onClick={logout}
            >
              <span>Logout</span>
              <div className="bg-white/20 rounded-full p-1 ml-2">
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
              </div>
            </Button>
          ) : (
            <Button
              className="h-14 px-8 rounded-full bg-[#2667ff] hover:bg-[#2667ff]/90 text-base font-normal"
              onClick={handleSignIn}
            >
              <span>Sign in with Didit</span>
              <div className="bg-white/20 rounded-full p-1 ml-2">
                <LogIn className="h-4 w-4" />
              </div>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
