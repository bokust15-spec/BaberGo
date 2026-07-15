// Detects an attempt to share off-platform contact info (phone number, WhatsApp link,
// email) in a public field like the bio or a publication caption — the classic way a
// pro circumvents booking (and commission) through BarberGo. Never perfect (someone can
// always spell a number out in words), but it stops the vast majority of naive attempts.
// Mirrored (in a simpler RE2-compatible form) as a server-side backstop in firestore.rules
// for fields it can validate directly (bio) — Firestore rules can't loop over array
// elements, so portfolio item captions rely on this client-side check alone.

// 9+ consecutive digit-like characters (digits + spaces/dots/dashes between them) —
// wide enough to catch "06 12 34 56 78" or "+212612345678" formats, narrow enough to
// let short mentions like "300 DH" or "5 ans d'expérience" through.
const PHONE_PATTERN = /\d[\d\s.-]{7,}\d/;
const WHATSAPP_PATTERN = /whats\s*app|wa\.me|api\.whatsapp/i;
const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

export function containsContactInfo(text: string): boolean {
  if (!text) return false;
  return PHONE_PATTERN.test(text) || WHATSAPP_PATTERN.test(text) || EMAIL_PATTERN.test(text);
}

export const CONTACT_INFO_ERROR = "Merci de ne pas partager de numéro, WhatsApp ou email ici — toutes les réservations doivent passer par BarberGo.";
