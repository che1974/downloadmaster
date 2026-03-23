import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { SortRule } from "../types";

interface RuleEditorProps {
  rule?: SortRule | null;
  onSave: (name: string, pattern: string, targetDir: string, priority: number) => void;
  onClose: () => void;
}

export function RuleEditor({ rule, onSave, onClose }: RuleEditorProps) {
  const [name, setName] = useState(rule?.name ?? "");
  const [pattern, setPattern] = useState(rule?.pattern ?? "");
  const [targetDir, setTargetDir] = useState(rule?.target_dir ?? "");
  const [priority, setPriority] = useState(rule?.priority ?? 100);

  useEffect(() => {
    if (rule) {
      setName(rule.name);
      setPattern(rule.pattern);
      setTargetDir(rule.target_dir);
      setPriority(rule.priority);
    }
  }, [rule]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !pattern.trim() || !targetDir.trim()) return;
    onSave(name.trim(), pattern.trim(), targetDir.trim(), priority);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">
            {rule ? "Edit Rule" : "New Rule"}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Documents"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Pattern</label>
            <input
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="e.g., *.pdf, *.docx"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 mt-1">Comma-separated glob patterns. Use * as wildcard.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Target Folder</label>
            <input
              type="text"
              value={targetDir}
              onChange={(e) => setTargetDir(e.target.value)}
              placeholder="e.g., Documents"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 mt-1">Subfolder name inside Downloads.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
            <input
              type="number"
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value) || 100)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 mt-1">Lower number = higher priority. First matching rule wins.</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 cursor-pointer"
            >
              {rule ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
