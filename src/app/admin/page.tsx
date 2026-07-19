import Link from 'next/link';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
          Admin
        </p>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Platform overview</h1>
        <p className="mt-2 text-muted-foreground max-w-xl">
          Approve artisan verifications, monitor bookings and escrow, and manage commission settings.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Pending verifications', value: '0' },
          { label: 'Active bookings', value: '0' },
          { label: 'Held in escrow', value: 'GHS 0' },
          { label: 'Artisans live', value: '0' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-3xl border border-border bg-card p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-2 text-2xl font-extrabold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          href="/admin/verifications"
          className="rounded-3xl border border-border bg-card p-6 hover:border-primary/40 transition-colors"
        >
          <h2 className="text-lg font-bold text-foreground">Review verifications</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Manually approve or reject artisan documents before they go live.
          </p>
        </Link>
        <Link
          href="/admin/settings"
          className="rounded-3xl border border-border bg-card p-6 hover:border-primary/40 transition-colors"
        >
          <h2 className="text-lg font-bold text-foreground">Commission & subscriptions</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Configure platform fees as adjustable settings, not hard-coded values.
          </p>
        </Link>
      </div>
    </div>
  );
}
