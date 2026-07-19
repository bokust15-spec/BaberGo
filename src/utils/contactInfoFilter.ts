// Detects an attempt to share off-platform contact info (phone number, WhatsApp link,
// email) in a public field like the bio or a publication caption — the classic way a
// pro circumvents booking (and commission) through BaberGo. Never perfect (someone can
// always spell a number out in words), but it stops the vast majority of naive attempts.
// Mirrored (in a simpler RE2-compatible form) as a server-side backstop in firestore.rules
// for fields it can validate directly (bio) — Firestore rules can't loop over array
// elements, so portfolio item captions rely on this client-side check alone.

// Zero-tolerance on digits: 2 or more digit characters ANYWHERE in the text is blocked,
// consecutive or not. A pattern requiring a long unbroken digit run (the previous
// approach) is trivially beaten by breaking the number up with letters or spaces
// ("07 80 9OH9OH9OH9O") — counting digits regardless of what's between them closes
// that gap, at the cost of also blocking legitimate short numbers in the bio (ages,
// years of experience). That trade-off is intentional given the commission model.
const WHATSAPP_PATTERN = /whats\s*app|wa\.me|api\.whatsapp/i;
const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

export function containsContactInfo(text: string): boolean {
  if (!text) return false;
  const digitCount = (text.match(/[0-9]/g) || []).length;
  if (digitCount >= 2) return true;
  return WHATSAPP_PATTERN.test(text) || EMAIL_PATTERN.test(text);
}

export const CONTACT_INFO_ERROR = "Merci de ne pas partager de numéro, WhatsApp ou email ici — toutes les réservations doivent passer par BaberGo.";
