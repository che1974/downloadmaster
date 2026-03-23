import { X, ArrowRight } from "lucide-react";
import type { SortAction } from "../types";

interface SortPreviewProps {
  actions: SortAction[];
  sorting: boolean;
  onExecute: () => void;
  onClose: () => void;
}

export function SortPreview({ actions, sorting, onExecute, onClose }: SortPreviewProps) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Sort Preview</h3>
            <p className="text-sm text-slate-500">{actions.length} file(s) will be moved</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          {actions.length === 0 ? (
            <div className="text-center text-slate-400 py-12">
              No files match the current rules.
            </div>
          ) : (
            <div className="space-y-2">
              {actions.map((action, i) => (
                <div key={i} className="flex items-center gap-2 text-sm p-3 bg-slate-50 rounded-lg">
                  <span className="font-medium text-slate-900 truncate flex-1" title={action.filename}>
                    {action.filename}
                  </span>
                  <ArrowRight size={14} className="text-slate-400 shrink-0" />
                  <span className="text-blue-600 truncate flex-1" title={action.to_path}>
                    {action.to_path.split("/").slice(-2).join("/")}
                  </span>
                  <span className="text-xs text-slate-400 shrink-0">{action.rule_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onExecute}
            disabled={actions.length === 0 || sorting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
          >
            {sorting ? "Moving..." : `Move ${actions.length} file(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}
