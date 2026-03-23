import { useEffect } from "react";
import { Undo2, ArrowRight } from "lucide-react";
import { useAppStore } from "../store/useAppStore";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HistoryView() {
  const { actions, fetchActions, undoAction } = useAppStore();

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">History</h2>
        <p className="text-sm text-slate-500 mt-0.5">{actions.length} recorded actions</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Action</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">File</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">From / To</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Date</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Undo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {actions.map((action) => (
              <tr key={action.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded capitalize">
                    {action.action}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-slate-900 truncate max-w-[150px]" title={action.filename}>
                  {action.filename}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <span className="truncate max-w-[150px]" title={action.from_path ?? ""}>
                      {action.from_path?.split("/").pop()}
                    </span>
                    <ArrowRight size={12} className="text-slate-300 shrink-0" />
                    <span className="truncate max-w-[150px] text-blue-600" title={action.to_path ?? ""}>
                      {action.to_path?.split("/").slice(-2).join("/")}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {formatDate(action.performed_at)}
                </td>
                <td className="px-4 py-3">
                  {action.undoable ? (
                    <button
                      onClick={() => undoAction(action.id)}
                      className="p-1.5 text-slate-400 hover:text-amber-600 rounded hover:bg-amber-50 cursor-pointer"
                      title="Undo this action"
                    >
                      <Undo2 size={14} />
                    </button>
                  ) : (
                    <span className="text-xs text-slate-300">done</span>
                  )}
                </td>
              </tr>
            ))}
            {actions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                  No actions recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
