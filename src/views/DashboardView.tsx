import { useEffect } from "react";
import { FileText, HardDrive, Clock, Copy, RefreshCw } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useAppStore } from "../store/useAppStore";
import { MetricCard } from "../components/MetricCard";
import { FileTable } from "../components/FileTable";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16"];

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function DashboardView() {
  const { files, stats, scanning, runScan, fetchFiles, fetchStats } = useAppStore();

  useEffect(() => {
    fetchFiles();
    fetchStats();
  }, [fetchFiles, fetchStats]);

  const chartData =
    stats?.categories.map((c) => ({
      name: c.name || "other",
      value: c.count,
    })) ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Dashboard</h2>
          <p className="text-sm text-slate-500 mt-0.5">Overview of your Downloads folder</p>
        </div>
        <button
          onClick={runScan}
          disabled={scanning}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
        >
          <RefreshCw size={16} className={scanning ? "animate-spin" : ""} />
          {scanning ? "Scanning..." : "Scan"}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="Total Files"
          value={stats?.total_files.toLocaleString() ?? "—"}
          icon={<FileText size={20} />}
        />
        <MetricCard
          title="Disk Usage"
          value={stats ? formatSize(stats.total_size) : "—"}
          icon={<HardDrive size={20} />}
          color="text-emerald-600"
        />
        <MetricCard
          title="Stale Files"
          value={stats?.stale_files.toLocaleString() ?? "—"}
          subtitle="older than 90 days"
          icon={<Clock size={20} />}
          color="text-amber-600"
        />
        <MetricCard
          title="Duplicates"
          value={stats?.duplicate_groups.toLocaleString() ?? "—"}
          subtitle="groups found"
          icon={<Copy size={20} />}
          color="text-red-500"
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <h3 className="text-sm font-medium text-slate-700 mb-3">Recent Files</h3>
          <FileTable files={files.slice(0, 15)} />
        </div>
        <div>
          <h3 className="text-sm font-medium text-slate-700 mb-3">File Types</h3>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm">
                No data yet. Run a scan first.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
