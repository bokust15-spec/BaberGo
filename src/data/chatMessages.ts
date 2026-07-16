export interface CannedMessage {
  key: string;
  label: string;
}

// Only these fixed phrases can ever be sent in the appointment chat — no free text —
// so client and pro can coordinate a session without a channel they could use to swap
// real contact details and cancel in-app to meet off-platform instead.
export const CLIENT_CANNED_MESSAGES: CannedMessage[] = [
  { key: 'bonjour', label: 'Bonjour' },
  { key: 'indisponible', label: 'Je ne serai pas disponible' },
  { key: 'ok', label: 'OK' },
];

export const PRO_CANNED_MESSAGES: CannedMessage[] = [
  { key: 'bonjour', label: 'Bonjour' },
  { key: 'en_route', label: 'Je suis en route' },
  { key: 'indisponible', label: 'Je ne serai pas disponible' },
  { key: 'ok', label: 'OK' },
  { key: 'envoyez_localisation', label: 'Envoyez votre localisation' },
];

const ALL_CANNED_MESSAGES = [...CLIENT_CANNED_MESSAGES, ...PRO_CANNED_MESSAGES];

export function cannedMessageLabel(key: string): string {
  return ALL_CANNED_MESSAGES.find(m => m.key === key)?.label || key;
}

export const CANCEL_REASONS: { key: 'late' | 'asked_to_cancel' | 'busy' | 'other'; label: string }[] = [
  { key: 'late', label: 'Il est en retard' },
  { key: 'asked_to_cancel', label: "Il m'a demandé d'annuler" },
  { key: 'busy', label: 'Je suis occupé' },
  { key: 'other', label: 'Autre raison' },
];

export function cancelReasonLabel(key?: string): string {
  return CANCEL_REASONS.find(r => r.key === key)?.label || key || '';
}
