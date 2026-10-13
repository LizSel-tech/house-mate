export type MomoProvider = 'mtn' | 'vod' | 'atl';

export const MOMO_NETWORKS: { value: MomoProvider; label: string }[] = [
  { value: 'mtn', label: 'MTN Mobile Money' },
  { value: 'vod', label: 'Telecel Cash' },
  { value: 'atl', label: 'AirtelTigo Money' },
];

export function isMomoProvider(value: string): value is MomoProvider {
  return value === 'mtn' || value === 'vod' || value === 'atl';
}

/** Ghana numbers as 10 local digits (0XXXXXXXXX); accepts 233XXXXXXXXX too. */
export function normalizeGhanaMomo(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (/^0\d{9}$/.test(digits)) return digits;
  if (/^233\d{9}$/.test(digits)) return `0${digits.slice(3)}`;
  if (/^\d{9}$/.test(digits)) return `0${digits}`;
  return null;
}

const PREFIXES: Record<MomoProvider, string[]> = {
  mtn: ['024', '025', '053', '054', '055', '059'],
  vod: ['020', '050'],
  atl: ['026', '027', '056', '057'],
};

export function guessMomoProvider(value: string): MomoProvider | null {
  const local = normalizeGhanaMomo(value);
  if (!local) return null;
  const prefix = local.slice(0, 3);
  return (Object.keys(PREFIXES) as MomoProvider[]).find((p) => PREFIXES[p].includes(prefix)) ?? null;
}

export function maskMomo(value: string): string {
  const local = normalizeGhanaMomo(value) || value;
  return local.length >= 7 ? `${local.slice(0, 3)} *** ${local.slice(-4)}` : local;
}
