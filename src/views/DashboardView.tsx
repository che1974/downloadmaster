import { useEffect } from "react";
import { FileText, HardDrive, Clock, Copy, RefreshCw, Sparkles, ArrowRight, Hash, Archive, Tag } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useAppStore } from "../store/useAppStore";
import { MetricCard } from "../components/MetricCard";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16"];

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

interface Recommendation {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  action: string;
  nav: "cleanup" | "rules" | "files";
}

export function DashboardView() {
  const { files, stats, scanning, runScan, fetchFiles, fetchStats, analyzing, analysisResult, runAnalysis, setActiveNav } = useAppStore();

  useEffect(() => {
    fetchFiles();
    fetchStats();
  }, [fetchFiles, fetchStats]);

  const chartData =
    stats?.categories.map((c) => ({
      name: c.name || "other",
      value: c.count,
    })) ?? [];

  const uncategorized = files.filter((f) => !f.ai_category).length;
  const unhashed = files.filter((f) => !f.hash_xxh3).length;

  const recommendations: Recommendation[] = [];

  if (stats && stats.duplicate_groups > 0) {
    recommendations.push({
      title: `${stats.duplicate_groups} duplicate group${stats.duplicate_groups > 1 ? "s" : ""}`,
      description: "Identical files taking up extra space. Review and archive copies.",
      icon: <Copy size={18} />,
      color: "text-red-600",
      bgColor: "bg-red-50 dark:bg-red-900/20",
      action: "Review duplicates",
      nav: "cleanup",
    });
  }

  if (stats && stats.stale_files > 0) {
    recommendations.push({
      title: `${stats.stale_files} stale file${stats.stale_files > 1 ? "s" : ""}`,
      description: "Files not modified in over 90 days. Consider archiving.",
      icon: <Clock size={18} />,
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
      action: "Review stale files",
      nav: "cleanup",
    });
  }

  if (uncategorized > 0 && files.length > 0) {
    recommendations.push({
      title: `${uncategorized} uncategorized file${uncategorized > 1 ? "s" : ""}`,
      description: "Run analysis to categorize files by content and type.",
      icon: <Tag size={18} />,
      color: "text-violet-600",
      bgColor: "bg-violet-50 dark:bg-violet-900/20",
      action: "Go to files",
      nav: "files",
    });
  }

  if (unhashed > 0 && files.length > 0) {
    recommendations.push({
      title: `${unhashed} file${unhashed > 1 ? "s" : ""} not hashed`,
      description: "Hash files to detect duplicates.",
      icon: <Hash size={18} />,
      color: "text-cyan-600",
      bgColor: "bg-cyan-50 dark:bg-cyan-900/20",
      action: "Go to cleanup",
      nav: "cleanup",
    });
  }

  if (files.length > 50) {
    recommendations.push({
      title: `${files.length} files in Downloads`,
      description: "Set up sort rules to keep your Downloads folder organized.",
      icon: <Archive size={18} />,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      action: "Set up rules",
      nav: "rules",
    });
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Dashboard</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Overview of your Downloads folder</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="flex items-center gap-2 px-4 py-2 border border-violet-300 text-violet-700 rounded-lg text-sm font-medium hover:bg-violet-50 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Sparkles size={16} className={analyzing ? "animate-pulse" : ""} />
            {analyzing ? "Analyzing..." : "Analyze"}
          </button>
          <button
            onClick={runScan}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <RefreshCw size={16} className={scanning ? "animate-spin" : ""} />
            {scanning ? "Scanning..." : "Scan"}
          </button>
        </div>
      </div>

      {analysisResult && (
        <div className="bg-violet-50 border border-violet-200 rounded-lg px-4 py-3 text-sm text-violet-700">
          Analysis complete: {analysisResult.quick_categorized} categorized locally
          {analysisResult.api_categorized > 0 && `, ${analysisResult.api_categorized} via AI`}
          {analysisResult.total_uncategorized > 0 && `. ${analysisResult.total_uncategorized} still uncategorized`}
        </div>
      )}

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
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Recommendations</h3>
          {recommendations.length > 0 ? (
            <div className="space-y-3">
              {recommendations.map((rec, i) => (
                <div
                  key={i}
                  className={`${rec.bgColor} rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-4`}
                >
                  <div className={`${rec.color} shrink-0`}>{rec.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{rec.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{rec.description}</p>
                  </div>
                  <button
                    onClick={() => setActiveNav(rec.nav)}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 shrink-0 cursor-pointer"
                  >
                    {rec.action}
                    <ArrowRight size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">All clear</p>
              <p className="text-xs text-slate-500 mt-1">No issues found. Your Downloads folder is in good shape.</p>
            </div>
          )}
        </div>
        <div>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">File Types</h3>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
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
