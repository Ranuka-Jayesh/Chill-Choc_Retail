/**
 * Formats a phone number string into the 10-digit format: xxx xxx xxxx
 * (e.g. "077 123 4567")
 */
export const formatPhoneNumber = (value: string): string => {
  if (!value) return '';
  // Extract only digits and limit to 10
  const digits = value.replace(/\D/g, '').slice(0, 10);

  if (digits.length <= 3) {
    return digits;
  }
  if (digits.length <= 6) {
    return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  }
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
};

/**
 * Validates whether the given phone number contains exactly 10 digits
 */
export const isValidPhoneNumber = (value: string): boolean => {
  if (!value) return false;
  return value.replace(/\D/g, '').length === 10;
};
