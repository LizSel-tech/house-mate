import { getSession } from '@/lib/auth/session';

function initials(name?: string | null) {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}

export default async function ProviderProfilePage() {
  const user = await getSession();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Account</p>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Profile</h1>
        <p className="mt-2 text-muted-foreground">Your artisan account details on Fixora.</p>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 max-w-lg">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-lg font-bold">
            {initials(user?.name)}
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{user?.name}</p>
            <p className="text-sm text-muted-foreground">Service provider</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Phone</p>
            <p className="mt-1 font-semibold text-foreground">{user?.phone}</p>
          </div>
          {user?.email && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Email</p>
              <p className="mt-1 font-semibold text-foreground">{user.email}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
