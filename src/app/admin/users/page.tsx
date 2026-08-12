'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/AppIcon';

type RoleFilter = 'all' | 'user' | 'artisan' | 'admin';

type UserRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: string;
  location: string | null;
  createdAt: string;
  artisanProfile: {
    trade: string;
    serviceArea: string | null;
    verificationStatus: string;
    jobsCompleted: number;
    averageRating: string | number;
    subscriptionStatus: string;
  } | null;
};

type Summary = { all: number; user: number; artisan: number; admin: number };

const FILTERS: { id: RoleFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'user', label: 'Customers' },
  { id: 'artisan', label: 'Artisans' },
  { id: 'admin', label: 'Admins' },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}

function roleBadge(role: string) {
  if (role === 'artisan') return 'bg-primary/10 text-primary';
  if (role === 'admin') return 'bg-secondary text-secondary-foreground';
  return 'bg-muted text-muted-foreground';
}

function verifyBadge(status: string) {
  if (status === 'approved') return 'bg-green-100 text-green-800';
  if (status === 'rejected') return 'bg-red-100 text-red-700';
  return 'bg-amber-100 text-amber-800';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [summary, setSummary] = useState<Summary>({ all: 0, user: 0, artisan: 0, admin: 0 });
  const [role, setRole] = useState<RoleFilter>('all');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (filter: RoleFilter) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/users?role=${filter}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Failed to load users.');
        return;
      }
      setUsers(data.users || []);
      setSummary(data.summary || { all: 0, user: 0, artisan: 0, admin: 0 });
    } catch {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(role);
  }, [role, load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.artisanProfile?.trade || '').toLowerCase().includes(q) ||
        (u.location || '').toLowerCase().includes(q)
    );
  }, [users, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Users & artisans</h1>
          <p className="mt-2 text-muted-foreground">
            Browse and filter everyone on the platform by account type.
          </p>
        </div>
        <div className="relative w-full lg:w-72">
          <Icon
            name="MagnifyingGlassIcon"
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone, trade…"
            className="w-full pl-10 pr-4 py-3 rounded-2xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = summary[f.id];
          const active = role === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setRole(f.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/20'
              }`}
            >
              {f.label}
              <span className={`ml-1.5 ${active ? 'opacity-80' : 'opacity-60'}`}>({count})</span>
            </button>
          );
        })}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="rounded-3xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  User
                </th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Type
                </th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Contact
                </th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Profile
                </th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Status
                </th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td colSpan={6} className="px-5 py-4">
                      <div className="h-10 rounded-xl bg-muted/60 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    No users match this filter.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                          {initials(u.name) || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{u.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {u.location || u.artisanProfile?.serviceArea || '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${roleBadge(u.role)}`}
                      >
                        {u.role === 'user' ? 'customer' : u.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-foreground">{u.phone}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {u.email || 'No email'}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      {u.artisanProfile ? (
                        <div>
                          <p className="text-sm font-medium text-foreground capitalize">
                            {u.artisanProfile.trade}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {u.artisanProfile.jobsCompleted} jobs ·{' '}
                            {Number(u.artisanProfile.averageRating).toFixed(1)}★
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {u.artisanProfile ? (
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${verifyBadge(u.artisanProfile.verificationStatus)}`}
                        >
                          {u.artisanProfile.verificationStatus}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Active</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(u.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
          Showing {filtered.length} of {users.length} loaded
          {role !== 'all' ? ` · filtered by ${role === 'user' ? 'customers' : `${role}s`}` : ''}
        </div>
      </div>
    </div>
  );
}
