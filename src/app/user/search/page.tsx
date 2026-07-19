export default function UserSearchPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Find artisans</h1>
        <p className="mt-2 text-muted-foreground">
          Browse verified tradespeople by location and problem type. Listings will connect to Supabase next.
        </p>
      </div>
      <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Search UI placeholder — Phase 1 will load verified artisans for your city.
        </p>
      </div>
    </div>
  );
}
