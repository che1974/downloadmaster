import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Play } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { RuleEditor } from "../components/RuleEditor";
import { SortPreview } from "../components/SortPreview";
import type { SortRule } from "../types";

export function RulesView() {
  const {
    rules, fetchRules, addRule, editRule, removeRule, toggleRuleEnabled,
    sortPreview, sorting, runPreview, runSort, clearPreview,
  } = useAppStore();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SortRule | null>(null);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleSave = async (name: string, pattern: string, targetDir: string, priority: number) => {
    if (editingRule) {
      await editRule(editingRule.id, name, pattern, targetDir, priority);
    } else {
      await addRule(name, pattern, targetDir, priority);
    }
    setEditorOpen(false);
    setEditingRule(null);
  };

  const handleEdit = (rule: SortRule) => {
    setEditingRule(rule);
    setEditorOpen(true);
  };

  const handleDelete = async (id: number) => {
    await removeRule(id);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Sort Rules</h2>
          <p className="text-sm text-slate-500 mt-0.5">{rules.length} rules configured</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setEditingRule(null); setEditorOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50 cursor-pointer"
          >
            <Plus size={16} /> Add Rule
          </button>
          <button
            onClick={runPreview}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 cursor-pointer"
          >
            <Play size={16} /> Sort Now
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Enabled</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Name</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Pattern</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Target</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Priority</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rules.map((rule) => (
              <tr key={rule.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={() => toggleRuleEnabled(rule.id, !rule.enabled)}
                    className="rounded cursor-pointer"
                  />
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">{rule.name}</td>
                <td className="px-4 py-3">
                  <code className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {rule.pattern}
                  </code>
                </td>
                <td className="px-4 py-3 text-slate-600">{rule.target_dir}/</td>
                <td className="px-4 py-3 text-slate-500">{rule.priority}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(rule)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 cursor-pointer"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                  No rules yet. Click "Add Rule" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editorOpen && (
        <RuleEditor
          rule={editingRule}
          onSave={handleSave}
          onClose={() => { setEditorOpen(false); setEditingRule(null); }}
        />
      )}

      {sortPreview !== null && (
        <SortPreview
          actions={sortPreview}
          sorting={sorting}
          onExecute={runSort}
          onClose={clearPreview}
        />
      )}
    </div>
  );
}
