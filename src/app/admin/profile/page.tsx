import ProfileAvatarEditor from '@/components/profile/ProfileAvatarEditor';
import { getSession } from '@/lib/auth/session';
import { queryOne } from '@/lib/db';
import type { User } from '@/types/db';

export default async function AdminProfilePage() {
  const session = await getSession();
  const user = session
    ? await queryOne<User>(`SELECT * FROM users WHERE id = $1`, [session.id])
    : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Account</p>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Profile</h1>
        <p className="mt-2 text-muted-foreground">Your admin account details for Fixora.</p>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 max-w-lg">
        <div className="mb-6 pb-6 border-b border-border space-y-4">
          <ProfileAvatarEditor
            name={user?.name || session?.name}
            avatarUrl={user?.avatarUrl || session?.avatarUrl}
            accent="secondary"
          />
          <div>
            <p className="text-xl font-bold text-foreground">{user?.name || session?.name}</p>
            <p className="text-sm text-muted-foreground">Platform admin</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Phone</p>
            <p className="mt-1 font-semibold text-foreground">{user?.phone || session?.phone}</p>
          </div>
          {(user?.email || session?.email) && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Email</p>
              <p className="mt-1 font-semibold text-foreground">{user?.email || session?.email}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
