import { Checkbox } from "@/components/ui/checkbox";
import { ScopeItems, SCOPE_ICONS } from "@/lib/scopes";

interface ScopeSelectorProps {
  scopeItems: ScopeItems;
  setScopeItems: React.Dispatch<React.SetStateAction<ScopeItems>>;
}

export function ScopeSelector({
  scopeItems,
  setScopeItems,
}: ScopeSelectorProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-medium text-[15px] mb-2">Available scopes</h2>
        <p className="text-sm text-gray-500">
          Choose which data are required for authorization
        </p>
      </div>

      <div className="grid grid-cols-2 xs:grid-cols-2 lg:grid-cols-3 gap-2">
        {Object.entries(scopeItems).map(([item, isSelected]) => {
          const Icon = SCOPE_ICONS[item] || SCOPE_ICONS.user_id;
          return (
            <div
              key={item}
              role="button"
              tabIndex={0}
              onClick={() =>
                setScopeItems({ ...scopeItems, [item]: !isSelected })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setScopeItems({ ...scopeItems, [item]: !isSelected });
                }
              }}
              className={`
                flex items-center space-x-3 p-2 sm:p-3 rounded-lg cursor-pointer transition-colors
                ${isSelected ? "bg-[#f4f4f6]" : "bg-white hover:bg-[#f4f4f6]"}
              `}
            >
              <div className="flex items-center flex-1 min-w-0 space-x-2 sm:space-x-3">
                <div className="bg-[#f4f4f6] p-1.5 sm:p-2 rounded-full flex-shrink-0">
                  <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] sm:text-xs font-medium truncate">
                    {item.replace(/_/g, " ").toUpperCase()}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-gray-500 truncate">
                    {item}
                  </span>
                </div>
              </div>
              <Checkbox
                id={item}
                checked={isSelected}
                onCheckedChange={() =>
                  setScopeItems({ ...scopeItems, [item]: !isSelected })
                }
                className="rounded-sm flex-shrink-0"
                tabIndex={-1}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
