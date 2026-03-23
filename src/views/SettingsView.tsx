import { useEffect, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { getConfig, saveConfig, startWatcher, stopWatcher, watcherStatus } from "../hooks/useTauri";
import type { AppConfig } from "../types";

export function SettingsView() {
  const { runScan } = useAppStore();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [watching, setWatching] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getConfig().then(setConfig);
    watcherStatus().then(setWatching);
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await saveConfig(config);
      await runScan();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleWatcher = async () => {
    if (watching) {
      await stopWatcher();
    } else {
      await startWatcher();
    }
    setWatching(await watcherStatus());
  };

  if (!config) return null;

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Settings</h2>
        <p className="text-sm text-slate-500 mt-0.5">Configure DownloadMaster</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Watch Directory</label>
          <input
            type="text"
            value={config.watch_dir}
            onChange={(e) => setConfig({ ...config, watch_dir: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Sort Mode</label>
          <select
            value={config.sort_mode}
            onChange={(e) => setConfig({ ...config, sort_mode: e.target.value as AppConfig["sort_mode"] })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="manual">Manual</option>
            <option value="scheduled">Scheduled</option>
            <option value="realtime">Realtime</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Stale Threshold (days)</label>
          <input
            type="number"
            value={config.stale_threshold_days}
            onChange={(e) => setConfig({ ...config, stale_threshold_days: parseInt(e.target.value) || 90 })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Archive Directory</label>
          <input
            type="text"
            value={config.archive_dir}
            onChange={(e) => setConfig({ ...config, archive_dir: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div>
            <p className="text-sm font-medium text-slate-700">File Watcher</p>
            <p className="text-xs text-slate-400">
              {watching ? "Monitoring Downloads for new files" : "Not running"}
            </p>
          </div>
          <button
            onClick={handleToggleWatcher}
            className={`px-4 py-2 rounded-lg text-sm cursor-pointer ${
              watching
                ? "bg-red-50 text-red-600 hover:bg-red-100"
                : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
            }`}
          >
            {watching ? "Stop" : "Start"}
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
