import Link from 'next/link';
import { getSession } from '@/lib/auth/session';

export default async function ProviderDashboardPage() {
  const user = await getSession();

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
          Service Provider
        </p>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
          Hello{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
        <p className="mt-2 text-muted-foreground max-w-xl">
          Manage your profile, get verified, accept jobs, and receive payouts when customers confirm completion.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/provider/verification"
          className="rounded-3xl border border-border bg-card p-6 hover:border-primary/40 transition-colors"
        >
          <h2 className="text-lg font-bold text-foreground">Get verified</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload Ghana Card, police report, residence proof, and guarantor details.
          </p>
        </Link>
        <Link
          href="/provider/services"
          className="rounded-3xl border border-border bg-card p-6 hover:border-primary/40 transition-colors"
        >
          <h2 className="text-lg font-bold text-foreground">List services</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Add the jobs you offer and your rates so users can book you.
          </p>
        </Link>
        <Link
          href="/provider/jobs"
          className="rounded-3xl border border-border bg-card p-6 hover:border-primary/40 transition-colors"
        >
          <h2 className="text-lg font-bold text-foreground">Job requests</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Accept bookings and complete work once escrow payment is held.
          </p>
        </Link>
      </div>
    </div>
  );
}
