"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { cn } from "@/lib/utils";

export interface AdminTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  /** Enables column-header sorting. Return the raw comparable value for this row. */
  sortValue?: (row: T) => string | number;
  className?: string;
  headerClassName?: string;
}

export interface AdminBulkAction {
  key: string;
  label: string;
  onClick: () => void;
  variant?: "default" | "success" | "warning" | "danger";
}

const bulkActionStyles: Record<NonNullable<AdminBulkAction["variant"]>, string> = {
  default: "text-ensena-ink hover:bg-ensena-bg-soft",
  success: "text-ensena-success hover:bg-ensena-success/10",
  warning: "text-amber-600 hover:bg-amber-50",
  danger: "text-rose-600 hover:bg-rose-50",
};

export function AdminDataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  selectedRowKey,
  selectable = false,
  checked,
  onToggleCheck,
  onToggleCheckAll,
  bulkActions = [],
  emptyMessage = "No results match this filter.",
}: {
  columns: AdminTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectedRowKey?: string | null;
  selectable?: boolean;
  checked?: Set<string>;
  onToggleCheck?: (key: string) => void;
  onToggleCheckAll?: () => void;
  bulkActions?: AdminBulkAction[];
  emptyMessage?: string;
}) {
  const [sort, setSort] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.key === sort.key);
    if (!column?.sortValue) return rows;
    const withValues = rows.map((row) => ({ row, value: column.sortValue!(row) }));
    withValues.sort((a, b) => {
      if (a.value < b.value) return sort.direction === "asc" ? -1 : 1;
      if (a.value > b.value) return sort.direction === "asc" ? 1 : -1;
      return 0;
    });
    return withValues.map((w) => w.row);
  }, [rows, sort, columns]);

  function toggleSort(column: AdminTableColumn<T>) {
    if (!column.sortValue) return;
    setSort((prev) => {
      if (prev?.key !== column.key) return { key: column.key, direction: "asc" };
      if (prev.direction === "asc") return { key: column.key, direction: "desc" };
      return null;
    });
  }

  const allChecked = selectable && checked && rows.length > 0 && rows.every((r) => checked.has(rowKey(r)));

  return (
    <div>
      {selectable && checked && checked.size > 0 && bulkActions.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-ensena-primary/5 px-3.5 py-2.5 text-xs">
          <span className="font-medium text-ensena-ink">{checked.size} selected</span>
          {bulkActions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={action.onClick}
              className={cn(
                "rounded-full border border-ensena-border bg-ensena-surface px-2.5 py-1 font-medium",
                bulkActionStyles[action.variant ?? "default"]
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr className="border-b border-ensena-border text-xs text-ensena-muted">
              {selectable && (
                <th className="w-8 py-2 pr-2">
                  <input
                    type="checkbox"
                    checked={!!allChecked}
                    onChange={onToggleCheckAll}
                    className="size-3.5 rounded border-ensena-border"
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th key={column.key} className={cn("py-2 pr-4 font-medium", column.headerClassName)}>
                  {column.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column)}
                      className="flex items-center gap-1 hover:text-ensena-ink"
                    >
                      {column.header}
                      {sort?.key === column.key ? (
                        sort.direction === "asc" ? (
                          <ArrowUp className="size-3" />
                        ) : (
                          <ArrowDown className="size-3" />
                        )
                      ) : (
                        <ArrowUpDown className="size-3 opacity-40" />
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const key = rowKey(row);
              return (
                <tr
                  key={key}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "border-b border-ensena-border last:border-0",
                    onRowClick && "cursor-pointer hover:bg-ensena-bg-soft",
                    selectedRowKey === key && "bg-ensena-primary/5"
                  )}
                >
                  {selectable && (
                    <td className="py-3 pr-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={checked?.has(key) ?? false}
                        onChange={() => onToggleCheck?.(key)}
                        className="size-3.5 rounded border-ensena-border"
                        aria-label={`Select row ${key}`}
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td key={column.key} className={cn("py-3 pr-4 text-ensena-ink", column.className)}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        {sortedRows.length === 0 && <p className="py-10 text-center text-sm text-ensena-muted">{emptyMessage}</p>}
      </div>
    </div>
  );
}
