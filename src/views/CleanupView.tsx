import { useEffect, useState } from "react";
import { Hash, Clock, HardDrive, Archive } from "lucide-react";
import type { FileRecord, DuplicateGroup, CleanupTab } from "../types";
import { useAppStore } from "../store/useAppStore";
import {
  hashFiles,
  getDuplicates,
  getStaleFiles,
  getLargeFiles,
  archiveFiles,
} from "../hooks/useTauri";

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function CleanupView() {
  const { fetchFiles, fetchStats } = useAppStore();
  const [tab, setTab] = useState<CleanupTab>("duplicates");
  const [hashing, setHashing] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [staleFiles, setStaleFiles] = useState<FileRecord[]>([]);
  const [largeFiles, setLargeFiles] = useState<FileRecord[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const loadData = async () => {
    const [dups, stale, large] = await Promise.all([
      getDuplicates(),
      getStaleFiles(90),
      getLargeFiles(50),
    ]);
    setDuplicates(dups);
    setStaleFiles(stale);
    setLargeFiles(large);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleHash = async () => {
    setHashing(true);
    try {
      await hashFiles();
      await loadData();
    } finally {
      setHashing(false);
    }
  };

  const handleArchive = async () => {
    if (selected.size === 0) return;
    await archiveFiles(Array.from(selected));
    setSelected(new Set());
    await loadData();
    await Promise.all([fetchFiles(), fetchStats()]);
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const selectAllDuplicates = () => {
    const ids = new Set<number>();
    for (const group of duplicates) {
      // Keep the newest, select the rest
      const sorted = [...group.files].sort(
        (a, b) => new Date(b.modified_at ?? "").getTime() - new Date(a.modified_at ?? "").getTime()
      );
      sorted.slice(1).forEach((f) => ids.add(f.id));
    }
    setSelected(ids);
  };

  const tabs: { id: CleanupTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: "duplicates", label: "Duplicates", icon: <Hash size={16} />, count: duplicates.length },
    { id: "stale", label: "Stale Files", icon: <Clock size={16} />, count: staleFiles.length },
    { id: "large", label: "Large Files", icon: <HardDrive size={16} />, count: largeFiles.length },
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Cleanup</h2>
          <p className="text-sm text-slate-500 mt-0.5">Find duplicates, stale, and large files</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleHash}
            disabled={hashing}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          >
            <Hash size={16} />
            {hashing ? "Hashing..." : "Hash Files"}
          </button>
          {selected.size > 0 && (
            <button
              onClick={handleArchive}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 cursor-pointer"
            >
              <Archive size={16} />
              Archive {selected.size} file(s)
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setSelected(new Set()); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors cursor-pointer ${
              tab === t.id
                ? "bg-white text-slate-900 shadow-sm font-medium"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.icon}
            {t.label}
            {t.count > 0 && (
              <span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "duplicates" && (
        <div className="space-y-3">
          {duplicates.length > 0 && (
            <button
              onClick={selectAllDuplicates}
              className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              Select all duplicates (keep newest)
            </button>
          )}
          {duplicates.map((group) => (
            <div key={group.hash} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-400 mb-3">
                Hash: {group.hash} &middot; {group.files.length} copies &middot; {formatSize(group.files[0]?.size_bytes ?? 0)} each
              </p>
              <div className="space-y-2">
                {group.files.map((file) => (
                  <label
                    key={file.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      selected.has(file.id) ? "bg-red-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(file.id)}
                      onChange={() => toggleSelect(file.id)}
                      className="rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{file.filename}</p>
                      <p className="text-xs text-slate-400 truncate">{file.path}</p>
                    </div>
                    <span className="text-xs text-slate-500">{formatDate(file.modified_at)}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          {duplicates.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              No duplicates found. Click "Hash Files" to detect duplicates.
            </div>
          )}
        </div>
      )}

      {tab === "stale" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 w-8"></th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Name</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Size</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Last Modified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staleFiles.map((file) => (
                <tr key={file.id} className={`hover:bg-slate-50 ${selected.has(file.id) ? "bg-amber-50" : ""}`}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(file.id)}
                      onChange={() => toggleSelect(file.id)}
                      className="rounded cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900 truncate max-w-xs">{file.filename}</td>
                  <td className="px-4 py-3 text-slate-500">{formatSize(file.size_bytes)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(file.modified_at)}</td>
                </tr>
              ))}
              {staleFiles.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-400">
                    No stale files found (older than 90 days).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "large" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 w-8"></th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Name</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Size</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Type</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Modified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {largeFiles.map((file) => (
                <tr key={file.id} className={`hover:bg-slate-50 ${selected.has(file.id) ? "bg-amber-50" : ""}`}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(file.id)}
                      onChange={() => toggleSelect(file.id)}
                      className="rounded cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900 truncate max-w-xs">{file.filename}</td>
                  <td className="px-4 py-3 text-slate-600 font-medium">{formatSize(file.size_bytes)}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase">
                      {file.extension || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(file.modified_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
