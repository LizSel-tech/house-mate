'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/Button';
import Pagination, { usePagination } from '@/components/ui/Pagination';
import { categoryLabel } from '@/lib/categories';
import {
  AdminPageHeader,
  StatusBadge,
} from '@/components/admin/AdminUI';
import { ConfirmModal, IconActionButton } from '@/components/admin/AdminModal';
import RolesPanel, { type AdminRoleRow } from '@/components/admin/RolesPanel';
import UserFormModal from '@/components/admin/UserFormModal';

type RoleFilter = 'all' | 'user' | 'artisan' | 'admin';
type Tab = 'people' | 'roles';

type Viewer = {
  id: string;
  isSuperAdmin: boolean;
  permissions: string[];
};

type UserRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: string;
  location: string | null;
  accountStatus: string;
  adminRole: { id?: string; name: string; isSystem?: boolean } | null;
  createdAt: string;
  artisanProfile: {
    trade: string;
    serviceArea: string | null;
    verificationStatus: string;
    jobsCompleted: number;
    averageRating: string | number;
    subscriptionStatus: string;
  } | null;
  bookingsMade?: number;
  jobsReceived?: number;
};

type Summary = { all: number; user: number; artisan: number; admin: number };

const FILTERS: { id: RoleFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'user', label: 'Clients' },
  { id: 'artisan', label: 'Service providers' },
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

function roleTone(role: string): 'success' | 'warning' | 'danger' | 'primary' | 'neutral' {
  if (role === 'artisan') return 'primary';
  if (role === 'admin') return 'neutral';
  return 'warning';
}

function verifyTone(status: string): 'success' | 'warning' | 'danger' | 'primary' | 'neutral' {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'danger';
  return 'warning';
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
  const [onlyProviderBookers, setOnlyProviderBookers] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('people');
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [roles, setRoles] = useState<AdminRoleRow[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [flash, setFlash] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [statusTarget, setStatusTarget] = useState<UserRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const canManageUsers = Boolean(viewer?.permissions.includes('users.manage'));
  const canManageRoles = Boolean(viewer?.permissions.includes('roles.manage'));

  const notify = useCallback((message: string, tone: 'success' | 'error' = 'success') => {
    setFlash({ message, tone });
  }, []);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 6000);
    return () => clearTimeout(t);
  }, [flash]);

  const loadRoles = useCallback(async () => {
    setRolesLoading(true);
    try {
      const res = await fetch('/api/admin/roles');
      const data = await res.json().catch(() => ({}));
      if (res.ok) setRoles(data.roles || []);
    } finally {
      setRolesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch('/api/admin/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setViewer(data))
      .catch(() => undefined);
    loadRoles();
  }, [loadRoles]);

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

  const refreshAll = () => {
    load(role);
    loadRoles();
  };

  const resendInvite = async (u: UserRow) => {
    setBusyId(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend_invite' }),
      });
      const data = await res.json().catch(() => ({}));
      notify(res.ok ? data.message || 'Sign-in email sent.' : data.error || 'Could not send the email.', res.ok ? 'success' : 'error');
    } finally {
      setBusyId(null);
    }
  };

  const toggleStatus = async () => {
    if (!statusTarget) return;
    const next = statusTarget.accountStatus === 'suspended' ? 'active' : 'suspended';
    setBusyId(statusTarget.id);
    try {
      const res = await fetch(`/api/admin/users/${statusTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountStatus: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        notify(data.error || 'Could not update this account.', 'error');
      } else {
        notify(`${statusTarget.name} was ${next === 'suspended' ? 'suspended' : 'reactivated'}.`);
        refreshAll();
      }
    } finally {
      setBusyId(null);
      setStatusTarget(null);
    }
  };

  const providerBookers = useMemo(
    () => users.filter((u) => u.role === 'artisan' && Number(u.bookingsMade || 0) > 0),
    [users],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = onlyProviderBookers ? providerBookers : users;
    if (!q) return base;
    return base.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.artisanProfile?.trade || '').toLowerCase().includes(q) ||
        (u.location || '').toLowerCase().includes(q),
    );
  }, [users, providerBookers, onlyProviderBookers, query]);
  const pager = usePagination(filtered, { resetKey: `${role}|${query}|${onlyProviderBookers}` });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="User management"
        title="Users, admins & roles"
        description="Browse everyone on the platform, add admin staff and control what each admin role can do."
        actions={
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            {tab === 'people' && (
              <div className="relative w-full sm:w-72">
                <Icon
                  name="MagnifyingGlassIcon"
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name, phone, trade…"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}
            {canManageRoles && (
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
                className="!rounded-xl shrink-0"
              >
                <Icon name="UserPlusIcon" size={16} />
                New admin user
              </Button>
            )}
          </div>
        }
      />

      <div className="flex gap-1 p-1 rounded-xl bg-muted/60 w-fit">
        {(
          [
            { id: 'people', label: 'People', icon: 'UsersIcon' },
            { id: 'roles', label: `Admin roles (${roles.length})`, icon: 'KeyIcon' },
          ] as { id: Tab; label: string; icon: string }[]
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon name={t.icon} size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {flash && (
        <p
          className={`text-sm rounded-xl px-4 py-3 border ${
            flash.tone === 'error'
              ? 'text-red-700 bg-red-50 border-red-100'
              : 'text-green-800 bg-green-50 border-green-100'
          }`}
        >
          {flash.message}
        </p>
      )}

      {tab === 'roles' ? (
        <RolesPanel
          roles={roles}
          loading={rolesLoading}
          canManage={canManageRoles}
          onChanged={refreshAll}
          onMessage={notify}
        />
      ) : (
      <>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = summary[f.id];
          const active = role === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setRole(f.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-colors ${
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
        {(role === 'all' || role === 'artisan') && (
          <button
            type="button"
            onClick={() => setOnlyProviderBookers((v) => !v)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border border-dashed transition-colors ${
              onlyProviderBookers
                ? 'bg-primary/10 text-primary border-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/20'
            }`}
          >
            Providers who book
            <span className="ml-1.5 opacity-60">({providerBookers.length})</span>
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {['User', 'Type', 'Contact', 'Profile', 'Status', 'Joined', ''].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td colSpan={7} className="px-5 py-4">
                      <div className="h-10 rounded-xl bg-muted/60 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    No users match this filter.
                  </td>
                </tr>
              ) : (
                pager.pageItems.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold shrink-0">
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
                      <StatusBadge tone={roleTone(u.role)}>
                        {u.role === 'user' ? 'client' : u.role === 'artisan' ? 'provider' : u.role}
                      </StatusBadge>
                      {u.adminRole && (
                        <p className="text-xs font-semibold text-foreground mt-1.5 flex items-center gap-1">
                          <Icon name="KeyIcon" size={12} className="text-muted-foreground" />
                          {u.adminRole.name}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-foreground">{u.phone}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {u.email || 'No email'}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      {u.artisanProfile ? (
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {categoryLabel(u.artisanProfile.trade) || 'No category yet'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {u.jobsReceived ?? u.artisanProfile.jobsCompleted} jobs received ·{' '}
                            {Number(u.artisanProfile.averageRating).toFixed(1)}★ ·{' '}
                            {u.artisanProfile.subscriptionStatus}
                          </p>
                          {Number(u.bookingsMade || 0) > 0 && (
                            <p className="text-xs font-semibold text-primary mt-0.5">
                              {u.bookingsMade} booking{u.bookingsMade === 1 ? '' : 's'} made as a client
                            </p>
                          )}
                        </div>
                      ) : u.role === 'user' ? (
                        <span className="text-sm text-muted-foreground">
                          {u.bookingsMade ?? 0} booking{u.bookingsMade === 1 ? '' : 's'} made
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {u.accountStatus === 'suspended' ? (
                        <StatusBadge tone="danger">suspended</StatusBadge>
                      ) : u.accountStatus === 'pending_payment' ? (
                        <StatusBadge tone="warning">awaiting payment</StatusBadge>
                      ) : u.artisanProfile ? (
                        <StatusBadge tone={verifyTone(u.artisanProfile.verificationStatus)}>
                          {u.artisanProfile.verificationStatus}
                        </StatusBadge>
                      ) : (
                        <span className="text-sm text-muted-foreground">Active</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <RowActions
                        u={u}
                        viewerId={viewer?.id}
                        canManageUsers={canManageUsers}
                        canManageRoles={canManageRoles}
                        busy={busyId === u.id}
                        onEdit={() => {
                          setEditing(u);
                          setFormOpen(true);
                        }}
                        onResend={() => resendInvite(u)}
                        onToggleStatus={() => setStatusTarget(u)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && <Pagination {...pager.props} label="users" />}
      </div>
      </>
      )}

      {viewer && (
        <UserFormModal
          open={formOpen}
          mode={editing ? 'edit' : 'create'}
          user={editing}
          roles={roles}
          canAssignRoles={canManageRoles}
          isSuperAdmin={viewer.isSuperAdmin}
          viewerId={viewer.id}
          onClose={() => setFormOpen(false)}
          onSaved={(message) => {
            setFormOpen(false);
            notify(message);
            refreshAll();
          }}
        />
      )}

      <ConfirmModal
        open={Boolean(statusTarget)}
        title={statusTarget?.accountStatus === 'suspended' ? 'Reactivate account?' : 'Suspend account?'}
        description={
          statusTarget?.accountStatus === 'suspended'
            ? `${statusTarget?.name} will be able to sign in again.`
            : `${statusTarget?.name} will lose access immediately and can’t sign in until reactivated.`
        }
        confirmLabel={statusTarget?.accountStatus === 'suspended' ? 'Reactivate' : 'Suspend'}
        tone={statusTarget?.accountStatus === 'suspended' ? 'primary' : 'danger'}
        loading={Boolean(statusTarget && busyId === statusTarget.id)}
        onConfirm={toggleStatus}
        onClose={() => setStatusTarget(null)}
      />
    </div>
  );
}

function RowActions({
  u,
  viewerId,
  canManageUsers,
  canManageRoles,
  busy,
  onEdit,
  onResend,
  onToggleStatus,
}: {
  u: UserRow;
  viewerId?: string;
  canManageUsers: boolean;
  canManageRoles: boolean;
  busy: boolean;
  onEdit: () => void;
  onResend: () => void;
  onToggleStatus: () => void;
}) {
  if (!canManageUsers) return <span className="text-sm text-muted-foreground">—</span>;
  if (u.role === 'admin' && u.id !== viewerId && !canManageRoles) {
    return <span className="text-xs text-muted-foreground">Needs roles permission</span>;
  }
  const isSelf = u.id === viewerId;
  const suspended = u.accountStatus === 'suspended';
  return (
    <div className="flex gap-2 justify-end">
      <IconActionButton icon="PencilSquareIcon" label="Edit" onClick={onEdit} disabled={busy} />
      {u.accountStatus === 'active' && u.email && (
        <IconActionButton
          icon="EnvelopeIcon"
          label="Resend sign-in email"
          onClick={onResend}
          disabled={busy}
        />
      )}
      {!isSelf && u.accountStatus !== 'pending_payment' && (
        <IconActionButton
          icon={suspended ? 'LockOpenIcon' : 'NoSymbolIcon'}
          label={suspended ? 'Reactivate' : 'Suspend'}
          tone={suspended ? 'success' : 'danger'}
          onClick={onToggleStatus}
          disabled={busy}
        />
      )}
    </div>
  );
}
