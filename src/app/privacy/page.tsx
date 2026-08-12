export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-16 max-w-3xl mx-auto">
      <h1 className="text-3xl font-extrabold tracking-tight">Privacy notice</h1>
      <p className="mt-4 text-muted-foreground leading-relaxed">
        Fixora uses identity verification (including Ghana Card images and face photos) to confirm
        artisan identity before enabling bookings. Images are processed by our verification provider
        (Smile Identity when configured) and stored securely for fraud prevention and compliance.
      </p>
      <p className="mt-4 text-muted-foreground leading-relaxed">
        By starting verification you consent to collection and processing of this data for KYC purposes.
        Contact support if you need data access or deletion requests.
      </p>
    </main>
  );
}
