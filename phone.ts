/**
 * Validates and normalizes Bangladeshi phone numbers.
 * Supported inputs: 01712345678, +8801712345678, 8801712345678, 1712345678
 */
export function normalizePhone(input: string): string | null {
  if (!input) return null;
  let cleaned = input.trim().replace(/[\s\-\(\)]/g, '');

  if (cleaned.startsWith('+880')) {
    cleaned = cleaned.slice(4);
  } else if (cleaned.startsWith('880')) {
    cleaned = cleaned.slice(3);
  }

  if (cleaned.length === 10 && cleaned.startsWith('1')) {
    cleaned = '0' + cleaned;
  }

  const bdMobileRegex = /^01[3-9]\d{8}$/;
  if (bdMobileRegex.test(cleaned)) {
    return cleaned;
  }

  return null;
}

export function isValidPhone(input: string): boolean {
  return normalizePhone(input) !== null;
}
