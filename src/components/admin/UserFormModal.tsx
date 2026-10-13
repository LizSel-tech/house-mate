'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AdminModal } from '@/components/admin/AdminModal';
import { Button } from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { sanitizePhoneInput } from '@/lib/auth/session-token';

export type RoleOption = { id: string; name: string; isSystem: boolean };

export type EditableUser = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: string;
  location: string | null;
  adminRole?: { id?: string; name: string; isSystem?: boolean } | null;
};

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring';
const labelClass = 'text-[11px] font-bold uppercase tracking-widest text-muted-foreground';

export default function UserFormModal({
  open,
  mode,
  user,
  roles,
  canAssignRoles,
  isSuperAdmin,
  viewerId,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  user?: EditableUser | null;
  roles: RoleOption[];
  canAssignRoles: boolean;
  isSuperAdmin: boolean;
  viewerId: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [adminRoleId, setAdminRoleId] = useState('');
  const [sendInvite, setSendInvite] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setSaving(false);
    setSendInvite(true);
    if (mode === 'edit' && user) {
      setName(user.name);
      setPhone(user.phone);
      setEmail(user.email || '');
      setLocation(user.location || '');
      setAdminRoleId(user.adminRole?.id || roles.find((r) => r.isSystem)?.id || '');
    } else {
      setName('');
      setPhone('');
      setEmail('');
      setLocation('');
      setAdminRoleId('');
    }
  }, [open, mode, user, roles]);

  const isAdminAccount = mode === 'create' || user?.role === 'admin';
  const assignableRoles = roles.filter((r) => isSuperAdmin || !r.isSystem);
  const editingSelf = mode === 'edit' && user?.id === viewerId;
  const showRolePicker = isAdminAccount && canAssignRoles && !editingSelf;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (mode === 'create' && !adminRoleId) {
      setError('Choose a role for this admin.');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { name, phone, email, location };
      if (mode === 'create') {
        Object.assign(payload, { adminRoleId, sendInvite });
      } else if (showRolePicker) {
        payload.adminRoleId = adminRoleId;
      }
      const res = await fetch(mode === 'create' ? '/api/admin/users' : `/api/admin/users/${user!.id}`, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not save this user.');
        return;
      }
      if (mode === 'create') {
        const invite = data.invite as { sent: boolean; email?: string; warning?: string } | null;
        onSaved(
          invite?.sent
            ? `${name} was created. A sign-in link and code were emailed to ${invite.email}.`
            : invite?.warning
              ? `${name} was created, but the sign-in email failed: ${invite.warning}`
              : `${name} was created. Use “Resend sign-in email” when they’re ready.`,
        );
      } else {
        onSaved(`${name} was updated.`);
      }
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
      icon={mode === 'create' ? 'UserPlusIcon' : 'PencilSquareIcon'}
      title={mode === 'create' ? 'New admin user' : `Edit ${user?.name || 'user'}`}
      description={
        mode === 'create'
          ? 'Give a team member access to the admin portal. We’ll email them a sign-in link and code.'
          : isAdminAccount
            ? 'Update contact details or the admin role for this account.'
            : 'Update contact details for this account.'
      }
      onClose={saving ? () => undefined : onClose}
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2 sm:col-span-2">
            <label htmlFor="uf-name" className={labelClass}>Full name</label>
            <input
              id="uf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ama Mensah"
              className={inputClass}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="uf-phone" className={labelClass}>Phone (used to sign in)</label>
            <input
              id="uf-phone"
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
              placeholder="024 123 4567"
              className={inputClass}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="uf-email" className={labelClass}>Email (receives the code)</label>
            <input
              id="uf-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ama@example.com"
              className={inputClass}
              required={isAdminAccount}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label htmlFor="uf-location" className={labelClass}>
              Location <span className="normal-case tracking-normal font-medium">(optional)</span>
            </label>
            <input
              id="uf-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="East Legon, Accra"
              className={inputClass}
            />
          </div>

          {showRolePicker && (
            <div className="space-y-2 sm:col-span-2">
              <p className={labelClass}>Admin role</p>
              <Select
                value={adminRoleId}
                onChange={setAdminRoleId}
                placeholder="Choose a role"
                options={assignableRoles.map((r) => ({ value: r.id, label: r.name }))}
              />
              {assignableRoles.length <= 1 && (
                <p className="text-xs text-muted-foreground">
                  Tip: create limited roles (e.g. Support, Finance) in the Roles tab.
                </p>
              )}
            </div>
          )}
          {editingSelf && isAdminAccount && (
            <p className="text-xs text-muted-foreground sm:col-span-2">
              You can’t change your own role. Ask another Super admin.
            </p>
          )}
        </div>

        {mode === 'create' && (
          <label className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
            <input
              type="checkbox"
              checked={sendInvite}
              onChange={(e) => setSendInvite(e.target.checked)}
              className="mt-0.5 rounded border-border"
            />
            <span>
              <span className="font-semibold text-foreground">Email a sign-in link and code now</span>
              <span className="block text-muted-foreground text-xs mt-0.5">
                The code lasts 30 minutes. You can resend it any time from the user list.
              </span>
            </span>
          </label>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="flex-1 !rounded-xl">
            Cancel
          </Button>
          <Button type="submit" loading={saving} className="flex-1 !rounded-xl">
            {mode === 'create' ? 'Create admin user' : 'Save changes'}
          </Button>
        </div>
      </form>
    </AdminModal>
  );
}
