'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';

type KycRecord = {
  id: string;
  status: 'draft' | 'pending' | 'verified' | 'rejected' | 'error';
  firstName: string | null;
  lastName: string | null;
  ghanaCardNumber: string | null;
  documentFrontUrl: string | null;
  documentBackUrl: string | null;
  selfieUrl: string | null;
  livenessImageUrls: string[];
  failureReason: string | null;
  submittedAt: string | null;
  completedAt: string | null;
};

type ProfileState = {
  trade: string;
  bio: string | null;
  serviceArea: string | null;
  verificationStatus: string;
};

type Step = 'profile' | 'document' | 'liveness' | 'review' | 'status';

const LIVENESS_PROMPTS = [
  'Look straight at the camera',
  'Blink slowly once',
  'Turn your head slightly left',
  'Turn your head slightly right',
  'Tilt your chin up a little',
  'Smile naturally',
  'Look straight again',
  'Hold still for the final frame',
];

function statusLabel(status: string) {
  return status.replace(/_/g, ' ').toUpperCase();
}

export default function ProviderVerificationPage() {
  const [step, setStep] = useState<Step>('profile');
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [kyc, setKyc] = useState<KycRecord | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [ghanaCardNumber, setGhanaCardNumber] = useState('');
  const [trade, setTrade] = useState('plumber');
  const [serviceArea, setServiceArea] = useState('');
  const [bio, setBio] = useState('');

  const [docFrontFile, setDocFrontFile] = useState<File | null>(null);
  const [docBackFile, setDocBackFile] = useState<File | null>(null);
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const [livenessBlobs, setLivenessBlobs] = useState<Blob[]>([]);
  const [promptIndex, setPromptIndex] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/kyc/session');
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) {
        setError(data.error || 'Failed to load verification status.');
        return;
      }
      setProfile(data.profile);
      setKyc(data.kyc);
      if (data.profile) {
        setTrade(data.profile.trade || 'plumber');
        setServiceArea(data.profile.serviceArea || '');
        setBio(data.profile.bio || '');
      }
      if (data.kyc) {
        setFirstName(data.kyc.firstName || '');
        setLastName(data.kyc.lastName || '');
        setGhanaCardNumber(data.kyc.ghanaCardNumber || '');
        if (['pending', 'verified', 'rejected'].includes(data.kyc.status)) {
          setStep('status');
        } else if (data.kyc.documentFrontUrl && (data.kyc.livenessImageUrls?.length || 0) >= 6) {
          setStep('review');
        } else if (data.kyc.documentFrontUrl) {
          setStep('liveness');
        }
      }
    } catch {
      setError('Failed to load verification status.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (kyc?.status !== 'pending') return;
    const id = window.setInterval(() => {
      void load();
    }, 5000);
    return () => window.clearInterval(id);
  }, [kyc?.status, load]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError('');
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch {
      setCameraError('Camera access is required for selfie and liveness checks.');
    }
  }, [stopCamera]);

  useEffect(() => {
    if (step === 'liveness') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [step, startCamera, stopCamera]);

  const captureFrame = async (): Promise<Blob | null> => {
    const video = videoRef.current;
    if (!video || !cameraReady) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
    });
  };

  const onProfileContinue = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!consent) {
      setError('Please accept the privacy notice to continue.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/kyc/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          ghanaCardNumber,
          trade,
          serviceArea,
          bio,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not start KYC session.');
        return;
      }
      setKyc(data.kyc);
      setStep('document');
    } finally {
      setLoading(false);
    }
  };

  const onDocumentContinue = async () => {
    setError('');
    if (!kyc?.id) {
      setError('Start a KYC session first.');
      return;
    }
    if (!docFrontFile && !kyc.documentFrontUrl) {
      setError('Upload the front of your Ghana Card.');
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append('kycId', kyc.id);
      if (docFrontFile) form.append('documentFront', docFrontFile);
      if (docBackFile) form.append('documentBack', docBackFile);
      const res = await fetch('/api/kyc/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Document upload failed.');
        return;
      }
      setKyc(data.kyc);
      setStep('liveness');
    } finally {
      setLoading(false);
    }
  };

  const captureLivenessFrame = async () => {
    setError('');
    const blob = await captureFrame();
    if (!blob) {
      setError('Could not capture frame. Check camera permissions.');
      return;
    }

    if (!selfieBlob && promptIndex === 0) {
      setSelfieBlob(blob);
    }

    const next = [...livenessBlobs, blob];
    setLivenessBlobs(next);

    if (promptIndex < LIVENESS_PROMPTS.length - 1 && next.length < 8) {
      setPromptIndex((i) => i + 1);
    }
  };

  const uploadLivenessAndContinue = async () => {
    setError('');
    if (!kyc?.id) return;
    if (livenessBlobs.length < 6 && (kyc.livenessImageUrls?.length || 0) < 6) {
      setError('Capture at least 6 guided frames.');
      return;
    }
    if (!selfieBlob && !kyc.selfieUrl) {
      setError('Capture a selfie (first frame).');
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append('kycId', kyc.id);
      if (selfieBlob) {
        form.append('selfie', new File([selfieBlob], 'selfie.jpg', { type: 'image/jpeg' }));
      }
      for (const [i, blob] of livenessBlobs.entries()) {
        form.append('liveness', new File([blob], `liveness_${i}.jpg`, { type: 'image/jpeg' }));
      }
      const res = await fetch('/api/kyc/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Liveness upload failed.');
        return;
      }
      setKyc(data.kyc);
      stopCamera();
      setStep('review');
    } finally {
      setLoading(false);
    }
  };

  const onSubmitVerification = async () => {
    setError('');
    setSuccess('');
    if (!kyc?.id) return;
    setLoading(true);
    try {
      const res = await fetch('/api/kyc/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kycId: kyc.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Submit failed.');
        return;
      }
      setKyc(data.kyc);
      setSuccess(data.message || 'Verification submitted.');
      setStep('status');
      await load();
    } finally {
      setLoading(false);
    }
  };

  const restart = async () => {
    setError('');
    setDocFrontFile(null);
    setDocBackFile(null);
    setSelfieBlob(null);
    setLivenessBlobs([]);
    setPromptIndex(0);
    setConsent(false);
    setStep('profile');
    // Create a fresh draft by posting session again after clearing local state;
    // previous verified/rejected records remain for audit; new draft if none open.
    const res = await fetch('/api/kyc/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName,
        lastName,
        ghanaCardNumber,
        trade,
        serviceArea,
        bio,
        forceNew: true,
      }),
    });
    const data = await res.json();
    if (res.ok) setKyc(data.kyc);
  };

  const steps: { id: Step; label: string }[] = [
    { id: 'profile', label: 'Details' },
    { id: 'document', label: 'Ghana Card' },
    { id: 'liveness', label: 'Face check' },
    { id: 'review', label: 'Submit' },
    { id: 'status', label: 'Status' },
  ];

  const liveCount = Math.max(livenessBlobs.length, kyc?.livenessImageUrls?.length || 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Identity verification</h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          Verify with your Ghana Card and a guided face check. Approved artisans can receive bookings.
        </p>
      </div>

      <div className="rounded-3xl border border-border bg-card p-4 sm:p-6">
        <p className="text-sm font-semibold text-foreground">
          Artisan status:{' '}
          <span className="uppercase tracking-widest text-primary">
            {profile?.verificationStatus ? statusLabel(profile.verificationStatus) : '…'}
          </span>
        </p>
        {kyc && (
          <p className="text-sm text-muted-foreground mt-2">
            KYC: {statusLabel(kyc.status)}
            {kyc.failureReason ? ` · ${kyc.failureReason}` : ''}
          </p>
        )}
        <ol className="mt-4 flex flex-wrap gap-2">
          {steps.map((s, i) => (
            <li
              key={s.id}
              className={`text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border ${
                step === s.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground'
              }`}
            >
              {i + 1}. {s.label}
            </li>
          ))}
        </ol>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-700">{success}</p>}

      {step === 'profile' && (
        <form onSubmit={onProfileContinue} className="rounded-3xl border border-border bg-card p-6 space-y-4 max-w-2xl">
          <div className="grid sm:grid-cols-2 gap-4">
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name (as on Ghana Card)"
              className="px-4 py-3 rounded-2xl border border-border bg-background text-sm"
              required
            />
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              className="px-4 py-3 rounded-2xl border border-border bg-background text-sm"
              required
            />
          </div>
          <input
            value={ghanaCardNumber}
            onChange={(e) => setGhanaCardNumber(e.target.value)}
            placeholder="Ghana Card number"
            className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-sm"
            required
          />
          <div className="grid sm:grid-cols-2 gap-4">
            <input
              value={trade}
              onChange={(e) => setTrade(e.target.value)}
              placeholder="Trade"
              className="px-4 py-3 rounded-2xl border border-border bg-background text-sm"
              required
            />
            <input
              value={serviceArea}
              onChange={(e) => setServiceArea(e.target.value)}
              placeholder="Service area (e.g. Accra)"
              className="px-4 py-3 rounded-2xl border border-border bg-background text-sm"
            />
          </div>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Short bio"
            rows={3}
            className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-sm"
          />
          <label className="flex items-start gap-3 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1"
            />
            <span>
              I consent to identity verification of my Ghana Card and face images. See our{' '}
              <a href="/privacy" target="_blank" rel="noreferrer" className="text-primary font-semibold">
                privacy notice
              </a>
              .
            </span>
          </label>
          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest disabled:opacity-60"
          >
            {loading ? 'Saving…' : 'Continue'}
          </button>
        </form>
      )}

      {step === 'document' && (
        <div className="rounded-3xl border border-border bg-card p-6 space-y-4 max-w-2xl">
          <p className="text-sm text-muted-foreground">
            Upload a clear photo of your Ghana Card. Front is required; back is optional.
          </p>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Ghana Card front *
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="mt-2 block w-full text-sm"
              onChange={(e) => setDocFrontFile(e.target.files?.[0] || null)}
            />
            {kyc?.documentFrontUrl && !docFrontFile && (
              <p className="text-xs text-muted-foreground mt-1">Already uploaded.</p>
            )}
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Ghana Card back (optional)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="mt-2 block w-full text-sm"
              onChange={(e) => setDocBackFile(e.target.files?.[0] || null)}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setStep('profile')}
              className="border border-border px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest"
            >
              Back
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={onDocumentContinue}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest disabled:opacity-60"
            >
              {loading ? 'Uploading…' : 'Continue to face check'}
            </button>
          </div>
        </div>
      )}

      {step === 'liveness' && (
        <div className="rounded-3xl border border-border bg-card p-6 space-y-4 max-w-2xl">
          <p className="text-lg font-bold text-foreground">
            {LIVENESS_PROMPTS[Math.min(promptIndex, LIVENESS_PROMPTS.length - 1)]}
          </p>
          <p className="text-sm text-muted-foreground">
            Follow each prompt, then tap Capture. Need {Math.max(0, 6 - liveCount)} more frame
            {6 - liveCount === 1 ? '' : 's'} (up to 8).
          </p>
          {cameraError && <p className="text-sm text-red-600">{cameraError}</p>}
          <div className="relative aspect-square max-w-md overflow-hidden rounded-3xl bg-black">
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover scale-x-[-1]" />
          </div>
          <p className="text-xs text-muted-foreground">
            Captured: {liveCount}/8 · Selfie: {selfieBlob || kyc?.selfieUrl ? 'ready' : 'pending'}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                setStep('document');
              }}
              className="border border-border px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest"
            >
              Back
            </button>
            <button
              type="button"
              onClick={captureLivenessFrame}
              disabled={!cameraReady || liveCount >= 8}
              className="border border-primary text-primary px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest disabled:opacity-60"
            >
              Capture frame
            </button>
            <button
              type="button"
              onClick={uploadLivenessAndContinue}
              disabled={loading || liveCount < 6}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest disabled:opacity-60"
            >
              {loading ? 'Uploading…' : 'Continue'}
            </button>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="rounded-3xl border border-border bg-card p-6 space-y-4 max-w-2xl">
          <p className="text-sm text-muted-foreground">
            Review your submission. An admin will check your Ghana Card, selfie, and liveness frames.
          </p>
          <ul className="text-sm space-y-2 text-foreground">
            <li>
              Name: {kyc?.firstName} {kyc?.lastName}
            </li>
            <li>Ghana Card: {kyc?.ghanaCardNumber || ghanaCardNumber}</li>
            <li>Document front: {kyc?.documentFrontUrl ? 'uploaded' : 'missing'}</li>
            <li>Document back: {kyc?.documentBackUrl ? 'uploaded' : 'optional / not provided'}</li>
            <li>Selfie: {kyc?.selfieUrl ? 'uploaded' : 'missing'}</li>
            <li>Liveness frames: {kyc?.livenessImageUrls?.length || 0}</li>
          </ul>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setStep('liveness')}
              className="border border-border px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest"
            >
              Back
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={onSubmitVerification}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest disabled:opacity-60"
            >
              {loading ? 'Submitting…' : 'Submit verification'}
            </button>
          </div>
        </div>
      )}

      {step === 'status' && (
        <div className="rounded-3xl border border-border bg-card p-6 space-y-4 max-w-2xl">
          <p className="text-lg font-bold text-foreground">
            {kyc?.status === 'verified'
              ? 'Verified'
              : kyc?.status === 'rejected'
                ? 'Rejected'
                : kyc?.status === 'pending'
                  ? 'Pending review'
                  : kyc?.status === 'error'
                    ? 'Verification error'
                    : 'In progress'}
          </p>
          <p className="text-sm text-muted-foreground">
            {kyc?.status === 'pending' &&
              'Your documents are with our team for review. Check back soon or tap refresh.'}
            {kyc?.status === 'verified' &&
              'Your identity is verified. You can receive bookings from users.'}
            {kyc?.status === 'rejected' &&
              (kyc.failureReason || 'Verification did not pass. You can try again with clearer photos.')}
            {kyc?.status === 'error' &&
              (kyc.failureReason || 'Something went wrong. Please try again.')}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={load}
              className="border border-border px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest"
            >
              Refresh status
            </button>
            {(kyc?.status === 'rejected' || kyc?.status === 'error') && (
              <button
                type="button"
                onClick={restart}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest"
              >
                Try again
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
