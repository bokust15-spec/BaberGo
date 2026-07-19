// Shared password strength check for every account-creation form (pro signup in
// RegisterModal.tsx, guest client signup in BookingModal.tsx) — length alone (the old
// "6 characters minimum" rule) let through purely numeric or repeated-character
// passwords like "123456". Requiring a mix of letters and digits is a lightweight,
// non-frustrating bar that rules those out without demanding special characters.
export function isPasswordStrongEnough(password: string): boolean {
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
}

export const PASSWORD_REQUIREMENTS_HINT = 'Au moins 8 caractères, avec au moins une lettre et un chiffre.';
