/**
 * Phone-number normalization to E.164 (T-02).
 *
 * The product texts customers, so opt-out (STOP) compliance, lead de-duplication
 * and Twilio inbound routing must treat "+1 (555) 123-4567", "555-123-4567" and
 * "+15551234567" as the SAME contact. Without a single canonical form these
 * silently fragment by format — a serious TCPA/opt-out risk.
 *
 * This is a small, dependency-free normalizer tuned for North American (NANP)
 * numbers with graceful handling of other already-E.164 inputs. It is NOT a full
 * libphonenumber; if a number cannot be confidently normalized it is returned as
 * a trimmed best-effort string (never dropped) so a lead is never lost.
 */

const DEFAULT_COUNTRY_CODE = "1"; // North America (NANP)

/**
 * Returns the E.164 form (e.g. "+15551234567") when the input can be confidently
 * normalized, otherwise null. Use {@link normalizePhoneOrRaw} when you need a
 * non-null value for storage.
 */
export function normalizePhone(
  input: string | null | undefined,
  defaultCountryCode: string = DEFAULT_COUNTRY_CODE,
): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const hadPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  // Already in international form.
  if (hadPlus) {
    // E.164 allows up to 15 digits; require a plausible minimum.
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }

  // NANP without country code: 10 digits → prefix the default country code.
  if (digits.length === 10) return `+${defaultCountryCode}${digits}`;

  // NANP with leading country code: 11 digits starting with "1".
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;

  // Other plausible international lengths: assume the digits already include a
  // country code.
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;

  // Too short / ambiguous to normalize confidently.
  return null;
}

/**
 * Normalize to E.164 when possible, otherwise return the trimmed original. Use
 * for storage so a value is always written (never null) while still preferring
 * the canonical form. Comparison/matching should use {@link normalizePhone}.
 */
export function normalizePhoneOrRaw(
  input: string | null | undefined,
): string | null {
  if (input == null) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  return normalizePhone(trimmed) ?? trimmed;
}

/**
 * Whether two phone numbers refer to the same contact, comparing on the
 * normalized form when both normalize, falling back to a digits-only compare so
 * format differences never split a contact.
 */
export function phonesMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a || !b) return false;
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (na && nb) return na === nb;
  return a.replace(/\D/g, "") === b.replace(/\D/g, "");
}
