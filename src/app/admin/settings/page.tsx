export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Settings</h1>
        <p className="mt-2 text-muted-foreground">
          Adjustable platform settings for commission and artisan subscriptions.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4 max-w-3xl">
        <div className="rounded-3xl border border-border bg-card p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Commission rate
          </p>
          <p className="mt-2 text-3xl font-extrabold text-foreground">12%</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Deducted automatically before artisan payout (placeholder).
          </p>
        </div>
        <div className="rounded-3xl border border-border bg-card p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Subscription
          </p>
          <p className="mt-2 text-3xl font-extrabold text-foreground">GHS 50</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Monthly listing fee for artisans (placeholder).
          </p>
        </div>
      </div>
    </div>
  );
}
