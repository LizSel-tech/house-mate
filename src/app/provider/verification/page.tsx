export default function ProviderVerificationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Verification</h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          Upload your Ghana Card, police report, proof of residence, guarantor details, and skills
          evidence. An admin reviews these before you go live.
        </p>
      </div>
      <div className="rounded-3xl border border-border bg-card p-6 space-y-3">
        <p className="text-sm font-semibold text-foreground">Status: Pending setup</p>
        <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
          <li>Ghana Card photo and number</li>
          <li>Police report / criminal record check</li>
          <li>Proof of residence</li>
          <li>Named guarantor with contact details</li>
          <li>Photos of past work or certificates</li>
        </ul>
      </div>
    </div>
  );
}
