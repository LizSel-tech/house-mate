'use client';

import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/AppIcon';

const PAGE_SIZES = [10, 25, 50];

export function usePagination<T>(items: T[], options?: { pageSize?: number; resetKey?: unknown }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(options?.pageSize ?? 10);

  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage(1);
  }, [options?.resetKey, pageSize]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  );

  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    total,
    pageItems,
    props: {
      page,
      pageCount,
      pageSize,
      total,
      onPageChange: setPage,
      onPageSizeChange: setPageSize,
    },
  };
}

function pageWindow(page: number, pageCount: number): (number | 'gap')[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('gap');
    out.push(p);
  });
  return out;
}

export default function Pagination({
  page,
  pageCount,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  label = 'items',
  className = '',
}: {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  label?: string;
  className?: string;
}) {
  if (total === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const navBtn =
    'inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none';

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 border-t border-border bg-muted/20 ${className}`}
    >
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>
          Showing <span className="font-semibold text-foreground tabular-nums">{start}–{end}</span> of{' '}
          <span className="font-semibold text-foreground tabular-nums">{total}</span> {label}
        </span>
        {onPageSizeChange && (
          <label className="hidden sm:flex items-center gap-1.5">
            <span>Rows</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {pageCount > 1 && (
        <nav className="flex items-center gap-1" aria-label="Pagination">
          <button
            type="button"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className={`${navBtn} border-border text-foreground hover:bg-muted`}
          >
            <Icon name="ChevronLeftIcon" size={14} />
          </button>
          {pageWindow(page, pageCount).map((p, i) =>
            p === 'gap' ? (
              <span key={`gap-${i}`} className="px-1 text-xs text-muted-foreground">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                aria-current={p === page ? 'page' : undefined}
                onClick={() => onPageChange(p)}
                className={`${navBtn} ${
                  p === page
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-foreground hover:bg-muted'
                }`}
              >
                {p}
              </button>
            ),
          )}
          <button
            type="button"
            aria-label="Next page"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
            className={`${navBtn} border-border text-foreground hover:bg-muted`}
          >
            <Icon name="ChevronRightIcon" size={14} />
          </button>
        </nav>
      )}
    </div>
  );
}
