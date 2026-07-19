import { getSession } from '@/lib/auth/session';

export default async function ProviderProfilePage() {
  const user = await getSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Profile</h1>
        <p className="mt-2 text-muted-foreground">Your artisan account details.</p>
      </div>
      <div className="rounded-3xl border border-border bg-card p-6 space-y-4 max-w-lg">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Name</p>
          <p className="mt-1 font-semibold text-foreground">{user?.name}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Phone</p>
          <p className="mt-1 font-semibold text-foreground">{user?.phone}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Role</p>
          <p className="mt-1 font-semibold text-foreground">Service Provider (Artisan)</p>
        </div>
      </div>
    </div>
  );
}
