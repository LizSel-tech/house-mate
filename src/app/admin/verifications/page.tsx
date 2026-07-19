export default function AdminVerificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Verifications</h1>
        <p className="mt-2 text-muted-foreground">
          Review Ghana Card, police report, residence proof, guarantor, and skills evidence.
        </p>
      </div>
      <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">No pending verification submissions.</p>
      </div>
    </div>
  );
}
