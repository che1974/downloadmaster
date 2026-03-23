import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import { ArrowUpDown } from "lucide-react";
import type { FileRecord } from "../types";
import { TagBadge } from "./TagBadge";

const columnHelper = createColumnHelper<FileRecord>();

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const columns = [
  columnHelper.accessor("filename", {
    header: "Name",
    cell: (info) => (
      <span className="font-medium text-slate-900 truncate block max-w-xs" title={info.getValue()}>
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("extension", {
    header: "Type",
    cell: (info) => (
      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase">
        {info.getValue() || "—"}
      </span>
    ),
  }),
  columnHelper.accessor("size_bytes", {
    header: "Size",
    cell: (info) => formatSize(info.getValue()),
  }),
  columnHelper.accessor("modified_at", {
    header: "Modified",
    cell: (info) => formatDate(info.getValue()),
  }),
  columnHelper.accessor("ai_category", {
    header: "Category",
    cell: (info) => {
      const val = info.getValue();
      return val ? <TagBadge category={val} /> : <span className="text-slate-300">—</span>;
    },
  }),
];

interface FileTableProps {
  files: FileRecord[];
}

export function FileTable({ files }: FileTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data: files,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 border-b border-slate-200">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer select-none"
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    <ArrowUpDown size={12} className="text-slate-300" />
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-slate-100">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50 transition-colors">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3 text-slate-600">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          {files.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400">
                No files found. Click "Scan" to analyze your Downloads folder.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
