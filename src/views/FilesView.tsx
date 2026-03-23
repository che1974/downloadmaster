import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import { FileTable } from "../components/FileTable";
import { RefreshCw } from "lucide-react";

export function FilesView() {
  const { files, scanning, runScan, fetchFiles } = useAppStore();

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">All Files</h2>
          <p className="text-sm text-slate-500 mt-0.5">{files.length} files in Downloads</p>
        </div>
        <button
          onClick={runScan}
          disabled={scanning}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
        >
          <RefreshCw size={16} className={scanning ? "animate-spin" : ""} />
          {scanning ? "Scanning..." : "Refresh"}
        </button>
      </div>
      <FileTable files={files} />
    </div>
  );
}
