import Link from 'next/link';
import { getSession } from '@/lib/auth/session';

export default async function UserDashboardPage() {
  const user = await getSession();

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
          Service User
        </p>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
          Hello{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
        <p className="mt-2 text-muted-foreground max-w-xl">
          Find verified artisans near you, book a job, pay into escrow, and confirm when the work is done.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          href="/user/search"
          className="rounded-3xl border border-border bg-card p-6 hover:border-primary/40 transition-colors"
        >
          <h2 className="text-lg font-bold text-foreground">Find an artisan</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Search by trade and location — starting with plumbers in Accra for the MVP.
          </p>
        </Link>
        <Link
          href="/user/bookings"
          className="rounded-3xl border border-border bg-card p-6 hover:border-primary/40 transition-colors"
        >
          <h2 className="text-lg font-bold text-foreground">Track bookings</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            View requests, escrow payments, and jobs waiting for your confirmation.
          </p>
        </Link>
      </div>

      <div className="rounded-3xl bg-secondary text-white p-6 sm:p-8">
        <h2 className="text-lg font-bold">How it works</h2>
        <ol className="mt-4 space-y-3 text-sm text-white/70 list-decimal list-inside">
          <li>Describe your problem or pick a service category.</li>
          <li>Request a booking with a verified artisan nearby.</li>
          <li>Pay into escrow — funds are held until you confirm completion.</li>
          <li>Leave a review to help others trust the platform.</li>
        </ol>
      </div>
    </div>
  );
}
