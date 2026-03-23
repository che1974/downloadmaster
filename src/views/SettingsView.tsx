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
      // Apply theme
      const root = document.documentElement;
      if (config.theme === "dark") {
        root.classList.add("dark");
      } else if (config.theme === "light") {
        root.classList.remove("dark");
      } else {
        if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      }
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
          <label className="block text-sm font-medium text-slate-700 mb-1">Theme</label>
          <select
            value={config.theme}
            onChange={(e) => setConfig({ ...config, theme: e.target.value as AppConfig["theme"] })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
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

        <div className="pt-2 border-t border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">AI Analysis</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-700">Enable AI categorization</label>
              <input
                type="checkbox"
                checked={config.ai_enabled}
                onChange={(e) => setConfig({ ...config, ai_enabled: e.target.checked })}
                className="rounded cursor-pointer"
              />
            </div>
            {config.ai_enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Provider</label>
                  <select
                    value={config.ai_provider}
                    onChange={(e) => {
                      const provider = e.target.value as AppConfig["ai_provider"];
                      const defaults: Record<string, { model: string; url: string }> = {
                        anthropic: { model: "claude-haiku-4-5-20251001", url: "" },
                        openai: { model: "gpt-4o-mini", url: "" },
                        ollama: { model: "llama3.2", url: "http://localhost:11434" },
                      };
                      const d = defaults[provider];
                      setConfig({ ...config, ai_provider: provider, ai_model: d.model, ai_base_url: d.url, ai_api_key: "" });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="openai">OpenAI (GPT)</option>
                    <option value="ollama">Ollama (Local)</option>
                  </select>
                </div>
                {config.ai_provider !== "ollama" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
                    <input
                      type="password"
                      value={config.ai_api_key}
                      onChange={(e) => setConfig({ ...config, ai_api_key: e.target.value })}
                      placeholder={config.ai_provider === "anthropic" ? "sk-ant-..." : "sk-..."}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
                {config.ai_provider === "ollama" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ollama URL</label>
                    <input
                      type="text"
                      value={config.ai_base_url}
                      onChange={(e) => setConfig({ ...config, ai_base_url: e.target.value })}
                      placeholder="http://localhost:11434"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-slate-400 mt-1">Make sure Ollama is running and the model is pulled.</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
                  {config.ai_provider === "ollama" ? (
                    <input
                      type="text"
                      value={config.ai_model}
                      onChange={(e) => setConfig({ ...config, ai_model: e.target.value })}
                      placeholder="llama3.2"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <select
                      value={config.ai_model}
                      onChange={(e) => setConfig({ ...config, ai_model: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {config.ai_provider === "anthropic" ? (
                        <>
                          <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
                          <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
                        </>
                      ) : (
                        <>
                          <option value="gpt-4o-mini">GPT-4o Mini</option>
                          <option value="gpt-4o">GPT-4o</option>
                          <option value="gpt-4.1-mini">GPT-4.1 Mini</option>
                          <option value="gpt-4.1">GPT-4.1</option>
                        </>
                      )}
                    </select>
                  )}
                </div>
              </>
            )}
          </div>
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
