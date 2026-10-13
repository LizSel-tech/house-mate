export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/** Keep digits and spaces only — blocks letters in phone inputs. */
export function sanitizePhoneInput(value: string): string {
  return value.replace(/[^\d\s]/g, '');
}
