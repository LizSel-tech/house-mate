export default function AdminBookingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Bookings & escrow</h1>
        <p className="mt-2 text-muted-foreground">
          Monitor job status and held funds. Disputes stay held until you resolve them.
        </p>
      </div>
      <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">No bookings to show yet.</p>
      </div>
    </div>
  );
}
