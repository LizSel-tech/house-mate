export default function ProviderJobsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Job requests</h1>
        <p className="mt-2 text-muted-foreground">
          Incoming bookings will show here for you to accept or decline.
        </p>
      </div>
      <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">No job requests yet.</p>
      </div>
    </div>
  );
}
