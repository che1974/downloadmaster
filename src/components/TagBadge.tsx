const CATEGORY_COLORS: Record<string, string> = {
  Documents: "bg-blue-50 text-blue-700",
  Spreadsheets: "bg-blue-50 text-blue-700",
  Presentations: "bg-blue-50 text-blue-700",
  Images: "bg-emerald-50 text-emerald-700",
  Archives: "bg-amber-50 text-amber-700",
  Code: "bg-violet-50 text-violet-700",
  Video: "bg-pink-50 text-pink-700",
  Audio: "bg-rose-50 text-rose-700",
  Installers: "bg-orange-50 text-orange-700",
  Firmware: "bg-slate-100 text-slate-700",
  Data: "bg-cyan-50 text-cyan-700",
  Design: "bg-fuchsia-50 text-fuchsia-700",
  Fonts: "bg-gray-100 text-gray-700",
  Ebooks: "bg-teal-50 text-teal-700",
  Other: "bg-slate-100 text-slate-600",
};

interface TagBadgeProps {
  category: string;
}

export function TagBadge({ category }: TagBadgeProps) {
  const color = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.Other;
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${color}`}>
      {category}
    </span>
  );
}

interface TagListProps {
  tags: string;
}

export function TagList({ tags }: TagListProps) {
  let parsed: string[];
  try {
    parsed = JSON.parse(tags);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return null;

  return (
    <div className="flex gap-1 flex-wrap">
      {parsed.map((tag) => (
        <span key={tag} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
          {tag}
        </span>
      ))}
    </div>
  );
}
