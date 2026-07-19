export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Users & artisans</h1>
        <p className="mt-2 text-muted-foreground">
          Directory of service users and providers on the platform.
        </p>
      </div>
      <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          User list will load from Supabase profiles once auth is connected.
        </p>
      </div>
    </div>
  );
}
