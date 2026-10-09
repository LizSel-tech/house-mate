'use client';

import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/AppIcon';

export function usePagination<T>(items: T[], options?: { pageSize?: number; resetKey?: unknown }) {
  const [page, setPage] = useState(1);
  const pageSize = options?.pageSize ?? 10;

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
    pageCount,
    total,
    pageItems,
    props: {
      page,
      pageCount,
      pageSize,
      total,
      onPageChange: setPage,
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
  label = 'results',
  className = '',
}: {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  label?: string;
  className?: string;
}) {
  if (total === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const stepBtn =
    'inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:pointer-events-none';
  const pageBtn =
    'inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2.5 text-xs font-semibold tabular-nums transition-colors';

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 border-t border-border bg-muted/20 ${className}`}
    >
      <p className="text-xs text-muted-foreground">
        Showing <span className="font-semibold text-foreground tabular-nums">{start}</span> to{' '}
        <span className="font-semibold text-foreground tabular-nums">{end}</span> of{' '}
        <span className="font-semibold text-foreground tabular-nums">{total}</span> {label}
      </p>

      <nav className="flex items-center justify-between sm:justify-end gap-1" aria-label="Pagination">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className={stepBtn}
        >
          <Icon name="ChevronLeftIcon" size={14} />
          Previous
        </button>

        <div className="hidden sm:flex items-center gap-1 mx-1">
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
                className={`${pageBtn} ${
                  p === page
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-foreground hover:bg-muted'
                }`}
              >
                {p}
              </button>
            ),
          )}
        </div>
        <span className="sm:hidden px-2 text-xs text-muted-foreground tabular-nums">
          Page {page} of {pageCount}
        </span>

        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          className={stepBtn}
        >
          Next
          <Icon name="ChevronRightIcon" size={14} />
        </button>
      </nav>
    </div>
  );
}
