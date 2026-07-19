export default function ProviderEarningsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Earnings</h1>
        <p className="mt-2 text-muted-foreground">
          Track held escrow, released payouts, and platform commission once Paystack is connected.
        </p>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: 'Available', value: 'GHS 0.00' },
          { label: 'In escrow', value: 'GHS 0.00' },
          { label: 'Lifetime', value: 'GHS 0.00' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-3xl border border-border bg-card p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-2 text-2xl font-extrabold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
