'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import AuthShell from '@/components/auth/AuthShell';
import Icon from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { sanitizePhoneInput } from '@/lib/auth/session-token';
import { MOMO_NETWORKS, guessMomoProvider, normalizeGhanaMomo, type MomoProvider } from '@/lib/momo';
import type { UserRole } from '@/types/auth';

type PaymentMethod = {
  id: string;
  name: string;
  type: string;
  accountName: string | null;
  accountNumber: string | null;
  bankName: string | null;
  instructions: string | null;
};

type PayWith = 'momo' | 'paystack' | 'manual';

type MomoPayment = {
  reference: string;
  maskedNumber: string;
  stage: 'prompt' | 'otp';
  displayText: string | null;
  startedAt: number;
  timedOut: boolean;
};

const PROMPT_SECONDS = 180;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const inputClass =
  'w-full px-4 py-3.5 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring';
const labelClass = 'text-xs font-bold uppercase tracking-widest text-muted-foreground';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Extract<UserRole, 'user' | 'artisan'>>('user');
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [fees, setFees] = useState({ user: 20, artisan: 50 });
  const [methodId, setMethodId] = useState('');
  const [reference, setReference] = useState('');
  const [proof, setProof] = useState<File | null>(null);
  const [paystackEnabled, setPaystackEnabled] = useState(false);
  const [payWith, setPayWith] = useState<PayWith>('manual');
  const [momoProvider, setMomoProvider] = useState<MomoProvider | ''>('');
  const [providerTouched, setProviderTouched] = useState(false);
  const [useOtherNumber, setUseOtherNumber] = useState(false);
  const [momoNumber, setMomoNumber] = useState('');
  const [momo, setMomo] = useState<MomoPayment | null>(null);
  const [otp, setOtp] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [success, setSuccess] = useState('');
  const [paidOnline, setPaidOnline] = useState(false);
  const [loginPhone, setLoginPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const pollRef = useRef(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prefillPhone = params.get('phone');
    const prefillEmail = params.get('email');
    const prefillRole = params.get('role');
    if (prefillPhone) setPhone(sanitizePhoneInput(prefillPhone));
    if (prefillEmail) setEmail(prefillEmail);
    if (prefillRole === 'user' || prefillRole === 'artisan') setRole(prefillRole);

    fetch('/api/public/payment-options')
      .then((r) => r.json())
      .then((data) => {
        setMethods(data.methods || []);
        if (data.fees) setFees(data.fees);
        if (data.methods?.[0]?.id) setMethodId(data.methods[0].id);
        if (data.paystackEnabled) {
          setPaystackEnabled(true);
          setPayWith('momo');
        }
      })
      .catch(() => undefined);

    return () => {
      pollRef.current += 1;
    };
  }, []);

  const chargeNumber = useOtherNumber ? momoNumber : phone;

  useEffect(() => {
    if (providerTouched) return;
    const guess = guessMomoProvider(chargeNumber);
    if (guess) setMomoProvider(guess);
  }, [chargeNumber, providerTouched]);

  useEffect(() => {
    if (!momo || momo.stage !== 'prompt' || momo.timedOut) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [momo]);

  const fee = role === 'artisan' ? fees.artisan : fees.user;
  const selected = useMemo(
    () => methods.find((m) => m.id === methodId) || null,
    [methods, methodId]
  );

  const finishOnlinePayment = (message: string) => {
    setMomo(null);
    setPaidOnline(true);
    setLoginPhone(phone.replace(/\D/g, ''));
    setSuccess(message);
  };

  const verifyOnlinePayment = async (paystackRef: string): Promise<boolean> => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const res = await fetch('/api/auth/signup/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: paystackRef }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'We could not confirm the payment.');
        return false;
      }
      if (!data.pending) {
        setSuccess(data.message || 'Payment received — check your email for your sign-in code.');
        return true;
      }
      setNotice(data.message);
      await sleep(5000);
    }
    setSuccess(
      'Your payment is still processing. As soon as Paystack confirms it, we’ll activate your account and email your sign-in code.'
    );
    return true;
  };

  /** Checks with the server until the customer approves the prompt, it fails, or the network window closes. */
  const pollMomo = async (paystackRef: string) => {
    const token = ++pollRef.current;
    const started = Date.now();
    while (Date.now() - started < (PROMPT_SECONDS + 20) * 1000) {
      await sleep(4000);
      if (pollRef.current !== token) return;
      const res = await fetch('/api/auth/signup/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: paystackRef }),
      }).catch(() => null);
      if (pollRef.current !== token) return;
      if (!res) continue;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMomo((current) => (current ? { ...current, timedOut: true } : current));
        setError(data.error || 'The payment was not completed.');
        return;
      }
      if (!data.pending) {
        finishOnlinePayment(data.message || 'Payment received — your account is active.');
        return;
      }
    }
    if (pollRef.current === token) {
      setMomo((current) => (current ? { ...current, timedOut: true } : current));
    }
  };

  const submitRegistration = async () => {
    pollRef.current += 1;
    setError('');
    setNotice('');
    setSuccess('');
    setOtp('');

    if (payWith === 'momo') {
      if (!momoProvider) {
        setError('Choose your mobile money network.');
        return;
      }
      if (!normalizeGhanaMomo(chargeNumber)) {
        setError('Enter a valid 10-digit mobile money number, e.g. 024 123 4567.');
        return;
      }
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append('name', name);
      form.append('phone', phone);
      form.append('email', email);
      form.append('role', role);
      form.append('payWith', payWith);
      if (payWith === 'momo') {
        form.append('momoProvider', momoProvider);
        form.append('momoPhone', chargeNumber);
      }
      if (payWith === 'manual') {
        form.append('methodId', methodId);
        form.append('reference', reference);
        if (proof) form.append('proof', proof);
      }

      const res = await fetch('/api/auth/signup', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setMomo(null);
        setError(data.error || 'Signup failed.');
        return;
      }

      if (data.mode === 'momo') {
        const stage = data.status === 'send_otp' ? 'otp' : 'prompt';
        setNow(Date.now());
        setMomo({
          reference: data.reference,
          maskedNumber: data.momoPhone,
          stage,
          displayText: data.displayText,
          startedAt: Date.now(),
          timedOut: false,
        });
        if (stage === 'prompt') void pollMomo(data.reference);
        return;
      }

      if (data.mode === 'paystack') {
        const { default: PaystackPop } = await import('@paystack/inline-js');
        const outcome = await new Promise<{ reference?: string; error?: string }>((resolve) => {
          new PaystackPop().resumeTransaction(data.accessCode, {
            onSuccess: (tx) => resolve({ reference: tx.reference || data.reference }),
            onCancel: () => resolve({}),
            onError: (err) => resolve({ error: err?.message || 'The payment window could not open.' }),
          });
        });
        if (!outcome.reference) {
          setError(
            outcome.error ||
              'Payment cancelled. Your details are saved — submit again to pay and activate your account.'
          );
          return;
        }
        setNotice('Confirming your payment…');
        const done = await verifyOnlinePayment(outcome.reference);
        setNotice('');
        if (done) {
          setPaidOnline(true);
          setLoginPhone(data.phone || phone);
        }
        return;
      }

      setPaidOnline(false);
      setSuccess(
        data.message ||
          'Submitted. An admin will confirm your payment, then you’ll receive an OTP to log in.'
      );
      setName('');
      setPhone('');
      setEmail('');
      setReference('');
      setProof(null);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submitRegistration();
  };

  const submitOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (!momo) return;
    setError('');
    setOtpBusy(true);
    try {
      const res = await fetch('/api/auth/signup/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: momo.reference, otp }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'The code was not accepted.');
        return;
      }
      setOtp('');
      setNow(Date.now());
      setMomo({ ...momo, stage: 'prompt', displayText: data.displayText, startedAt: Date.now(), timedOut: false });
      void pollMomo(momo.reference);
    } finally {
      setOtpBusy(false);
    }
  };

  const leaveMomo = () => {
    pollRef.current += 1;
    setMomo(null);
    setError('');
  };

  const secondsLeft = momo
    ? Math.max(0, PROMPT_SECONDS - Math.floor((now - momo.startedAt) / 1000))
    : 0;
  const networkLabel = MOMO_NETWORKS.find((n) => n.value === momoProvider)?.label ?? 'mobile money';

  const paymentOptions: { value: PayWith; label: string; hint: string }[] = [
    { value: 'momo', label: 'Mobile money', hint: 'Prompt on your phone' },
    { value: 'paystack', label: 'Card', hint: 'Visa · Mastercard' },
    { value: 'manual', label: 'Manual', hint: 'Upload proof' },
  ];

  return (
    <AuthShell
      title="Create your account"
      subtitle={
        paystackEnabled
          ? 'Pay the signup fee from your phone and get your sign-in code by email right away — or pay manually and upload proof for admin review.'
          : 'Pay the signup fee, upload proof, and wait for admin confirmation — then check your email for an OTP to log in.'
      }
    >
      {success ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            {success}
          </div>
          <p className="text-sm text-muted-foreground">
            {paidOnline
              ? 'Open the email we sent you, then enter the code on the login page.'
              : 'Keep your phone handy. After confirmation you’ll get an OTP to sign in.'}
          </p>
          <Link
            href={
              paidOnline && loginPhone
                ? `/login?${new URLSearchParams({ phone: loginPhone, step: 'code' }).toString()}`
                : '/login'
            }
            className="inline-flex w-full items-center justify-center bg-primary text-primary-foreground py-3.5 rounded-full font-bold text-sm uppercase tracking-widest min-h-[48px]"
          >
            Go to login
          </Link>
        </div>
      ) : momo ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-muted/30 p-5 text-center space-y-3">
            <span className="mx-auto w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
              <Icon name="DevicePhoneMobileIcon" size={24} />
            </span>
            {momo.stage === 'otp' ? (
              <>
                <p className="text-base font-bold text-foreground">Enter the code sent to {momo.maskedNumber}</p>
                <p className="text-sm text-muted-foreground">
                  {momo.displayText ||
                    `${networkLabel} sent you a code. Enter it below to receive the GHS ${Number(fee).toFixed(2)} payment prompt.`}
                </p>
              </>
            ) : momo.timedOut ? (
              <>
                <p className="text-base font-bold text-foreground">We haven’t received your approval</p>
                <p className="text-sm text-muted-foreground">
                  If you approved the prompt, your account will be activated and your sign-in code emailed shortly.
                  Otherwise, send a new prompt.
                </p>
              </>
            ) : (
              <>
                <p className="text-base font-bold text-foreground">
                  Approve GHS {Number(fee).toFixed(2)} on {momo.maskedNumber}
                </p>
                <p className="text-sm text-muted-foreground">
                  {momo.displayText ||
                    'Check your phone for the payment prompt and enter your mobile money PIN to approve.'}
                </p>
                <p className="text-xs font-semibold text-muted-foreground flex items-center justify-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
                  Waiting for approval · {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
                </p>
              </>
            )}
          </div>

          {momo.stage === 'otp' && (
            <form onSubmit={submitOtp} className="flex flex-col gap-3">
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\s/g, ''))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Code from your phone"
                className={`${inputClass} text-center tracking-[0.3em] font-semibold`}
                required
              />
              <Button type="submit" loading={otpBusy} className="w-full min-h-[48px] text-sm">
                Submit code
              </Button>
            </form>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              loading={loading}
              onClick={() => void submitRegistration()}
              className="w-full min-h-[44px] text-xs"
            >
              Resend prompt
            </Button>
            <Button type="button" variant="ghost" onClick={leaveMomo} className="w-full min-h-[44px] text-xs">
              Change payment method
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole('user')}
              className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                role === 'user'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/40'
              }`}
            >
              <span className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-3">
                <Icon name="HomeIcon" size={18} />
              </span>
              <p className="text-sm font-bold text-foreground">I need help</p>
              <p className="text-xs text-muted-foreground mt-1">Customer · GHS {fees.user}</p>
            </button>
            <button
              type="button"
              onClick={() => setRole('artisan')}
              className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                role === 'artisan'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/40'
              }`}
            >
              <span className="w-9 h-9 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center mb-3">
                <Icon name="WrenchScrewdriverIcon" size={18} />
              </span>
              <p className="text-sm font-bold text-foreground">I provide work</p>
              <p className="text-xs text-muted-foreground mt-1">Service provider · GHS {fees.artisan}</p>
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <label className={labelClass}>Full name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ama Mensah"
              className={inputClass}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Phone number</label>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              pattern="[0-9\s]*"
              value={phone}
              onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
              placeholder="024 123 4567"
              className={inputClass}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ama@email.com"
              className={inputClass}
              required
            />
          </div>

          <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={labelClass}>Signup fee</p>
                <p className="text-2xl font-extrabold text-foreground mt-1">GHS {Number(fee).toFixed(2)}</p>
              </div>
              <Icon name="BanknotesIcon" size={22} className="text-primary" />
            </div>

            {paystackEnabled && (
              <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-background border border-border p-1">
                {paymentOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPayWith(option.value)}
                    className={`rounded-xl px-2.5 py-2.5 text-left transition-all ${
                      payWith === option.value ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted/50'
                    }`}
                  >
                    <p className="text-sm font-bold text-foreground">{option.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{option.hint}</p>
                  </button>
                ))}
              </div>
            )}

            {payWith === 'momo' && (
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className={labelClass}>Network</label>
                  <div className="grid grid-cols-3 gap-2">
                    {MOMO_NETWORKS.map((network) => (
                      <button
                        key={network.value}
                        type="button"
                        onClick={() => {
                          setMomoProvider(network.value);
                          setProviderTouched(true);
                        }}
                        className={`rounded-xl border px-2 py-2.5 text-xs font-bold transition-all ${
                          momoProvider === network.value
                            ? 'border-primary bg-primary/10 text-foreground'
                            : 'border-border bg-background text-muted-foreground hover:border-primary/40'
                        }`}
                      >
                        {network.label.replace(/ (Mobile Money|Cash|Money)$/, '')}
                      </button>
                    ))}
                  </div>
                </div>

                {useOtherNumber ? (
                  <div className="flex flex-col gap-2">
                    <label className={labelClass}>Mobile money number</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={momoNumber}
                      onChange={(e) => setMomoNumber(sanitizePhoneInput(e.target.value))}
                      placeholder="024 123 4567"
                      className={inputClass}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setUseOtherNumber(false)}
                      className="self-start text-xs font-semibold text-primary hover:text-accent"
                    >
                      Use my phone number instead
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl bg-background border border-border p-3 text-sm">
                    <p className="text-muted-foreground">
                      We’ll send the payment prompt to{' '}
                      <span className="font-semibold text-foreground">{phone.trim() || 'your phone number above'}</span>.
                    </p>
                    <button
                      type="button"
                      onClick={() => setUseOtherNumber(true)}
                      className="mt-1.5 text-xs font-semibold text-primary hover:text-accent"
                    >
                      Use a different MoMo number
                    </button>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Approve the prompt with your MoMo PIN. Your account is activated and your sign-in code emailed as
                  soon as the payment goes through.
                </p>
              </div>
            )}

            {payWith === 'paystack' && (
              <p className="text-sm text-muted-foreground">
                You’ll pay securely by card with Paystack. Once the payment goes through, your account is activated
                and your sign-in code is emailed to you immediately.
              </p>
            )}

            {payWith === 'manual' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className={labelClass}>Payment method</label>
                  <Select
                    value={methodId}
                    onChange={setMethodId}
                    placeholder={methods.length === 0 ? 'Loading methods…' : 'Select a method'}
                    options={methods.map((m) => ({ value: m.id, label: m.name }))}
                    required
                  />
                </div>

                {selected && (
                  <div className="rounded-xl bg-background border border-border p-3 text-sm space-y-1">
                    {selected.accountName && (
                      <p>
                        <span className="text-muted-foreground">Name:</span>{' '}
                        <span className="font-semibold text-foreground">{selected.accountName}</span>
                      </p>
                    )}
                    {selected.accountNumber && (
                      <p>
                        <span className="text-muted-foreground">Number:</span>{' '}
                        <span className="font-semibold text-foreground">{selected.accountNumber}</span>
                      </p>
                    )}
                    {selected.bankName && (
                      <p>
                        <span className="text-muted-foreground">Bank:</span>{' '}
                        <span className="font-semibold text-foreground">{selected.bankName}</span>
                      </p>
                    )}
                    {selected.instructions && (
                      <p className="text-muted-foreground pt-1">{selected.instructions}</p>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <label className={labelClass}>Transaction reference *</label>
                  <input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="MoMo / bank transfer ID"
                    className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-sm"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className={labelClass}>Payment proof (image/PDF) *</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(e) => setProof(e.target.files?.[0] || null)}
                    className="block w-full text-sm"
                    required
                  />
                </div>
              </>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
          )}
          {notice && !error && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">{notice}</p>
          )}

          <Button
            type="submit"
            loading={loading}
            disabled={payWith === 'manual' && methods.length === 0}
            className="w-full min-h-[48px] text-sm"
          >
            {loading
              ? payWith === 'manual'
                ? 'Submitting…'
                : payWith === 'momo'
                  ? 'Sending prompt…'
                  : 'Processing payment…'
              : payWith === 'momo'
                ? `Send GHS ${Number(fee).toFixed(2)} prompt to my phone`
                : payWith === 'paystack'
                  ? `Pay GHS ${Number(fee).toFixed(2)} by card`
                  : 'Submit registration'}
          </Button>
        </form>
      )}

      <p className="mt-6 text-sm text-center text-muted-foreground">
        Already confirmed?{' '}
        <Link href="/login" className="font-semibold text-primary hover:text-accent">
          Log in with OTP
        </Link>
      </p>
    </AuthShell>
  );
}
