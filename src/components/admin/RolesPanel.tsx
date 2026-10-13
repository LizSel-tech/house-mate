'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AdminModal, ConfirmModal, IconActionButton } from '@/components/admin/AdminModal';
import { StatusBadge } from '@/components/admin/AdminUI';
import { Button } from '@/components/ui/Button';
import Icon from '@/components/ui/AppIcon';
import { ADMIN_PERMISSIONS, ALL_ADMIN_PERMISSIONS } from '@/lib/admin-permissions';

export type AdminRoleRow = {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
  memberCount: number;
};

const PERMISSION_LABEL: Record<string, string> = Object.fromEntries(
  ADMIN_PERMISSIONS.map((p) => [p.id, p.label]),
);

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring';
const labelClass = 'text-[11px] font-bold uppercase tracking-widest text-muted-foreground';

function RoleEditor({
  open,
  role,
  onClose,
  onSaved,
}: {
  open: boolean;
  role: AdminRoleRow | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(role?.name || '');
    setDescription(role?.description || '');
    setPermissions(role?.permissions || ['dashboard.view']);
    setError('');
    setSaving(false);
  }, [open, role]);

  const toggle = (id: string) =>
    setPermissions((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  const allSelected = permissions.length === ALL_ADMIN_PERMISSIONS.length;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!permissions.length) {
      setError('Pick at least one permission.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(role ? `/api/admin/roles/${role.id}` : '/api/admin/roles', {
        method: role ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, permissions }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not save this role.');
        return;
      }
      onSaved(role ? `Role “${name}” updated.` : `Role “${name}” created.`);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal
      open={open}
      size="lg"
      icon="KeyIcon"
      title={role ? `Edit role: ${role.name}` : 'Create role'}
      description="Choose exactly what admins in this role can see and do. Changes apply on their next page load."
      onClose={saving ? () => undefined : onClose}
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="role-name" className={labelClass}>Role name</label>
            <input
              id="role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Finance officer"
              className={inputClass}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="role-desc" className={labelClass}>
              Description <span className="normal-case tracking-normal font-medium">(optional)</span>
            </label>
            <input
              id="role-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Reviews signup payments"
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className={labelClass}>Permissions ({permissions.length}/{ALL_ADMIN_PERMISSIONS.length})</p>
            <button
              type="button"
              onClick={() => setPermissions(allSelected ? [] : [...ALL_ADMIN_PERMISSIONS])}
              className="text-xs font-semibold text-primary hover:text-accent"
            >
              {allSelected ? 'Clear all' : 'Select all'}
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {ADMIN_PERMISSIONS.map((p) => {
              const checked = permissions.includes(p.id);
              return (
                <label
                  key={p.id}
                  className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 cursor-pointer transition-colors ${
                    checked ? 'border-primary bg-primary/5' : 'border-border hover:border-foreground/20'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(p.id)}
                    className="mt-0.5 rounded border-border"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-foreground">{p.label}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">{p.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
          {(permissions.includes('roles.manage') || permissions.includes('users.manage')) && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              {permissions.includes('roles.manage')
                ? 'Roles & permissions lets this role create admins and edit roles. Only give it to people you fully trust.'
                : 'User management lets this role edit and suspend clients and providers.'}
            </p>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="flex-1 !rounded-xl">
            Cancel
          </Button>
          <Button type="submit" loading={saving} className="flex-1 !rounded-xl">
            {role ? 'Save role' : 'Create role'}
          </Button>
        </div>
      </form>
    </AdminModal>
  );
}

export default function RolesPanel({
  roles,
  loading,
  canManage,
  onChanged,
  onMessage,
}: {
  roles: AdminRoleRow[];
  loading: boolean;
  canManage: boolean;
  onChanged: () => void;
  onMessage: (message: string, tone?: 'success' | 'error') => void;
}) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AdminRoleRow | null>(null);
  const [deleting, setDeleting] = useState<AdminRoleRow | null>(null);
  const [busy, setBusy] = useState(false);

  const openEditor = (role: AdminRoleRow | null) => {
    setEditing(role);
    setEditorOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/roles/${deleting.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onMessage(data.error || 'Could not delete this role.', 'error');
      } else {
        onMessage(`Role “${deleting.name}” deleted.`);
        onChanged();
      }
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Roles control what each admin can see and do. Clients and service providers use fixed account
          types; roles apply to admin staff only.
        </p>
        {canManage && (
          <Button onClick={() => openEditor(null)} className="!rounded-xl shrink-0">
            <Icon name="PlusIcon" size={16} />
            New role
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {roles.map((role) => {
            const perms = role.isSystem ? ALL_ADMIN_PERMISSIONS : role.permissions;
            return (
              <div key={role.id} className="rounded-2xl border border-border bg-card p-5 flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-foreground truncate">{role.name}</p>
                      {role.isSystem && <StatusBadge tone="primary">Built in</StatusBadge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {role.description || 'No description'}
                    </p>
                  </div>
                  {canManage && !role.isSystem && (
                    <div className="flex gap-2 shrink-0">
                      <IconActionButton icon="PencilSquareIcon" label="Edit role" onClick={() => openEditor(role)} />
                      <IconActionButton
                        icon="TrashIcon"
                        label={role.memberCount ? 'Move admins out before deleting' : 'Delete role'}
                        tone="danger"
                        disabled={role.memberCount > 0}
                        onClick={() => setDeleting(role)}
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-4 mb-4">
                  {role.isSystem ? (
                    <span className="text-xs font-semibold text-foreground">Full access to everything</span>
                  ) : (
                    perms.map((p) => (
                      <span
                        key={p}
                        className="px-2 py-1 rounded-lg bg-muted text-[11px] font-medium text-foreground"
                      >
                        {PERMISSION_LABEL[p] || p}
                      </span>
                    ))
                  )}
                </div>
                <div className="mt-auto pt-4 flex items-center justify-between text-xs text-muted-foreground border-t border-border/60">
                  <span className="flex items-center gap-1.5">
                    <Icon name="UsersIcon" size={14} />
                    {role.memberCount} admin{role.memberCount === 1 ? '' : 's'}
                  </span>
                  <span>
                    {perms.length}/{ALL_ADMIN_PERMISSIONS.length} permissions
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <RoleEditor
        open={editorOpen}
        role={editing}
        onClose={() => setEditorOpen(false)}
        onSaved={(message) => {
          setEditorOpen(false);
          onMessage(message);
          onChanged();
        }}
      />

      <ConfirmModal
        open={Boolean(deleting)}
        title="Delete role?"
        description={`“${deleting?.name}” will be removed. This can’t be undone.`}
        confirmLabel="Delete role"
        tone="danger"
        loading={busy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
