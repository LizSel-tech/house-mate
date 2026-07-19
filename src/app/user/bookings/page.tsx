export default function UserBookingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">My bookings</h1>
        <p className="mt-2 text-muted-foreground">
          Track requests, escrow status, and jobs ready for confirmation.
        </p>
      </div>
      <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No bookings yet. When you request a job, it will appear here.
        </p>
      </div>
    </div>
  );
}
