import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin,
  Phone,
  Check,
  X,
  AlertTriangle,
  Clock,
  CalendarClock,
  Send,
  Navigation,
  Map as MapIcon,
  Lock,
} from 'lucide-react';
import {
  useFirebase,
  Appointment,
  AppointmentChatMeta,
  ChatMessage,
  getAppointmentEndTime,
} from '../hooks/useFirebase';
import { CLIENT_CANNED_MESSAGES, PRO_CANNED_MESSAGES, cannedMessageLabel, CANCEL_REASONS } from '../data/chatMessages';
import LocationPickerModal from './LocationPickerModal';

interface AppointmentChatProps {
  appointment: Appointment;
  role: 'client' | 'barber';
  theme: 'dark' | 'light';
  clientPhone?: string;
  serviceDuration?: number;
  // Appointment-level changes (status, dateTime) go through the same callbacks every
  // other mutation in the app already uses — the parent refetches its appointments list
  // after these resolve, which a direct useFirebase() call from in here would bypass.
  onUpdateAppointment: (id: string, updates: Partial<Appointment>) => Promise<void>;
  onUpdateStatus: (id: string, status: Appointment['status']) => Promise<void>;
}

function toDate(value: any): Date {
  return value instanceof Date ? value : value.toDate();
}

const PHONE_SHARE_WINDOW_MS = 90 * 60 * 1000;

// Guided chat attached to a confirmed booking — only pre-written messages, a
// time-gated phone share, and a location card can go through it, so it can't become the
// channel client and pro use to swap real contact details and cancel in-app to meet off
// platform instead. See useFirebase.ts (appointmentChats collection) and
// firestore.rules for the server-side rules this leans on.
export default function AppointmentChat({ appointment, role, theme, clientPhone, serviceDuration, onUpdateAppointment, onUpdateStatus }: AppointmentChatProps) {
  const {
    getOrCreateAppointmentChat,
    subscribeToAppointmentChatMeta,
    subscribeToAppointmentMessages,
    sendCannedMessage,
    sendLocationMessage,
    proposeReschedule,
    respondToReschedule,
    shareClientPhone,
    freezeAppointmentChat,
  } = useFirebase();

  const [meta, setMeta] = useState<AppointmentChatMeta | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showCancelReasonForm, setShowCancelReasonForm] = useState(false);
  const [cancelReason, setCancelReason] = useState<'late' | 'asked_to_cancel' | 'busy' | 'other' | ''>('');
  const [cancelDetail, setCancelDetail] = useState('');

  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDateTime, setRescheduleDateTime] = useState('');

  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  const [showPhoneShare, setShowPhoneShare] = useState(false);
  const [phoneInput, setPhoneInput] = useState(clientPhone || '');

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubMeta: (() => void) | undefined;
    let unsubMessages: (() => void) | undefined;
    (async () => {
      await getOrCreateAppointmentChat(appointment.id, appointment.clientId, appointment.barberId);
      if (cancelled) return;
      unsubMeta = subscribeToAppointmentChatMeta(appointment.id, setMeta);
      unsubMessages = subscribeToAppointmentMessages(appointment.id, setMessages);
    })();
    return () => {
      cancelled = true;
      unsubMeta?.();
      unsubMessages?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointment.id]);

  const frozen = !!meta?.frozen;
  const cannedCatalog = role === 'client' ? CLIENT_CANNED_MESSAGES : PRO_CANNED_MESSAGES;
  const sessionEndTime = useMemo(() => getAppointmentEndTime(appointment, serviceDuration ? { duration: serviceDuration } : undefined), [appointment, serviceDuration]);
  const phoneShareOpensAt = useMemo(() => new Date(toDate(appointment.dateTime).getTime() - PHONE_SHARE_WINDOW_MS), [appointment.dateTime]);
  const canSharePhone = role === 'client' && !meta?.phoneSharedAt && now >= phoneShareOpensAt.getTime();
  const barberCanCancel = role === 'barber' && !meta?.phoneSharedAt;

  const inputClass = `w-full px-3 py-2 rounded-lg text-xs outline-none border ${theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`;

  const handleSendCanned = async (key: string) => {
    if (frozen || busy) return;
    setBusy(true);
    await sendCannedMessage(appointment.id, role, key);
    setBusy(false);
  };

  const handleSendLocation = async (loc: { lat: number; lng: number; label?: string }) => {
    setBusy(true);
    await sendLocationMessage(appointment.id, role, loc);
    setShowLocationPicker(false);
    setShowMapPicker(false);
    setBusy(false);
  };

  const handleUseMyPosition = () => {
    if (!navigator.geolocation) return;
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => handleSendLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'Position actuelle' }),
      () => setBusy(false)
    );
  };

  const handlePropose = async () => {
    if (!rescheduleDateTime) return;
    setBusy(true);
    await proposeReschedule(appointment.id, role, new Date(rescheduleDateTime));
    setShowReschedule(false);
    setRescheduleDateTime('');
    setBusy(false);
  };

  const handleRespond = async (msg: ChatMessage, accepted: boolean) => {
    setBusy(true);
    await respondToReschedule(appointment.id, role, msg.id, accepted);
    if (accepted) {
      await onUpdateAppointment(appointment.id, { dateTime: toDate(msg.proposedDateTime) });
    }
    setBusy(false);
  };

  const handleSharePhone = async () => {
    if (!phoneInput.trim()) return;
    setBusy(true);
    await shareClientPhone(appointment.id, phoneInput.trim());
    setShowPhoneShare(false);
    setBusy(false);
  };

  const handleCancelConfirmed = async () => {
    setBusy(true);
    const updates: Partial<Appointment> = { status: 'cancelled', cancelledBy: role === 'client' ? 'client' : 'barber' };
    if (role === 'client' && cancelReason) updates.cancelReason = cancelReason;
    if (role === 'client' && cancelReason === 'other' && cancelDetail.trim()) updates.cancelReasonDetail = cancelDetail.trim();
    await onUpdateAppointment(appointment.id, updates);
    await freezeAppointmentChat(appointment.id, 'cancelled');
    setShowCancelConfirm(false);
    setShowCancelReasonForm(false);
    setCancelReason('');
    setCancelDetail('');
    setBusy(false);
  };

  const handleEndSession = async () => {
    setBusy(true);
    await onUpdateStatus(appointment.id, 'completed');
    await freezeAppointmentChat(appointment.id, 'session_ended');
    setBusy(false);
  };

  const responsesToProposal = (proposalId: string) => messages.filter(m => m.type === 'reschedule_response' && m.respondsToMessageId === proposalId);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* MESSAGES — flex-1, fills the remaining height under ChatListTab's header */}
      <div className="flex-1 overflow-y-auto min-h-0 px-3 py-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-[10px] text-warm-gray text-center py-4">Aucun message pour le moment.</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderRole === role;
          if (msg.type === 'reschedule_response') return null; // rendered inline under its proposal
          const bubbleClass = isMe
            ? 'bg-gold text-black ml-auto'
            : theme === 'dark' ? 'bg-black/30 text-white' : 'bg-gray-100 text-gray-900';
          return (
            <div key={msg.id} className={`max-w-[80%] ${isMe ? 'ml-auto' : ''}`}>
              {msg.type === 'canned' && (
                <div className={`px-3.5 py-2.5 rounded-lg text-sm ${bubbleClass}`}>{cannedMessageLabel(msg.cannedKey || '')}</div>
              )}
              {msg.type === 'location' && (
                (() => {
                  const expired = frozen || now > sessionEndTime.getTime();
                  if (expired) {
                    return (
                      <div className={`px-3 py-2 rounded-lg text-[10px] italic ${theme === 'dark' ? 'bg-black/20 text-warm-gray' : 'bg-gray-50 text-gray-400'}`}>
                        Localisation expirée
                      </div>
                    );
                  }
                  return (
                    <a
                      href={`https://www.google.com/maps?q=${msg.location?.lat},${msg.location?.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm font-bold ${bubbleClass}`}
                    >
                      <MapPin size={14} className="shrink-0" />
                      <span className="truncate">{msg.location?.label || 'Localisation partagée'} — ouvrir dans Maps</span>
                    </a>
                  );
                })()
              )}
              {msg.type === 'reschedule_proposal' && (() => {
                const responses = responsesToProposal(msg.id);
                const responded = responses.length > 0;
                const canRespond = !isMe && !responded && !frozen;
                return (
                  <div className={`px-3.5 py-2.5 rounded-lg text-sm space-y-2 ${theme === 'dark' ? 'bg-black/30 text-white border border-gold/20' : 'bg-gray-100 text-gray-900 border border-gray-200'}`}>
                    <p className="flex items-center gap-1.5 font-bold"><CalendarClock size={13} className="text-gold" /> Nouveau créneau proposé</p>
                    <p>{toDate(msg.proposedDateTime).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                    {responded && (
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${responses[0].accepted ? 'text-emerald-400' : 'text-red-400'}`}>
                        {responses[0].accepted ? 'Accepté' : 'Refusé'}
                      </p>
                    )}
                    {canRespond && (
                      <div className="flex gap-2">
                        <button disabled={busy} onClick={() => handleRespond(msg, true)} className="flex-1 py-1.5 bg-emerald-500 text-black text-[9px] font-bold uppercase tracking-widest rounded-lg disabled:opacity-40">Accepter</button>
                        <button disabled={busy} onClick={() => handleRespond(msg, false)} className="flex-1 py-1.5 border border-red-500/30 text-red-400 text-[9px] font-bold uppercase tracking-widest rounded-lg disabled:opacity-40">Refuser</button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {/* BOTTOM-PINNED COMPOSER (or a frozen banner in its place) — does not scroll away
          with the message history, like a WhatsApp compose bar. */}
      {frozen ? (
        <div className={`shrink-0 border-t px-4 py-3 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-widest text-red-400 ${theme === 'dark' ? 'border-white/10 bg-mid-brown/50' : 'border-gray-200 bg-white'}`}>
          <Lock size={14} /> {meta?.frozenReason === 'session_ended' ? 'Séance terminée' : 'Séance annulée'}
        </div>
      ) : (
        <div className={`shrink-0 border-t px-3 py-2 space-y-2 ${theme === 'dark' ? 'border-white/10 bg-mid-brown/50' : 'border-gray-200 bg-white'}`}>
          {/* CANNED QUICK REPLIES */}
          <div className="flex flex-wrap gap-1.5">
            {cannedCatalog.map(m => (
              <button
                key={m.key}
                disabled={busy}
                onClick={() => handleSendCanned(m.key)}
                className={`px-2.5 py-1.5 rounded-full text-[9.5px] font-bold uppercase tracking-widest border transition-colors disabled:opacity-40 ${theme === 'dark' ? 'border-white/10 text-warm-gray hover:text-gold hover:border-gold/30' : 'border-gray-200 text-gray-500 hover:text-gold hover:border-gold/30'}`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* ACTIONS ROW */}
          <div className="flex flex-wrap gap-2 pt-1 border-t border-white/5">
            {role === 'client' && (
              <button
                onClick={() => setShowLocationPicker(v => !v)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9.5px] font-bold uppercase tracking-widest bg-gold/10 text-gold"
              >
                <MapPin size={12} /> Localisation
              </button>
            )}
            <button
              onClick={() => setShowReschedule(v => !v)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9.5px] font-bold uppercase tracking-widest bg-gold/10 text-gold"
            >
              <CalendarClock size={12} /> Proposer un autre créneau
            </button>
            {role === 'client' && (
              canSharePhone ? (
                <button
                  onClick={() => setShowPhoneShare(v => !v)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9.5px] font-bold uppercase tracking-widest bg-gold/10 text-gold"
                >
                  <Phone size={12} /> Partager mon numéro
                </button>
              ) : meta?.phoneSharedAt ? (
                <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9.5px] font-bold uppercase tracking-widest text-emerald-400">
                  <Check size={12} /> Numéro partagé
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9.5px] font-bold uppercase tracking-widest text-warm-gray">
                  <Clock size={12} /> Numéro partageable dès {phoneShareOpensAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )
            )}
            <button
              onClick={handleEndSession}
              disabled={busy}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9.5px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 disabled:opacity-40"
            >
              <Check size={12} /> Fin de séance
            </button>
            {(role === 'client' || barberCanCancel) ? (
              <button
                onClick={() => setShowCancelConfirm(true)}
                disabled={busy}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9.5px] font-bold uppercase tracking-widest bg-red-500/10 text-red-400 disabled:opacity-40"
              >
                <X size={12} /> Annuler la séance
              </button>
            ) : (
              <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9.5px] font-bold uppercase tracking-widest text-warm-gray/60" title="Le client a déjà partagé son numéro — l'annulation n'est plus possible depuis l'app.">
                <Lock size={12} /> Annulation indisponible
              </span>
            )}
          </div>

          {/* LOCATION PICKER — no typing: GPS or a tap/drag pin on a free map, never a
              text address search (that meant writing something out every time). */}
          {showLocationPicker && (
            <div className={`p-3 rounded-lg border space-y-2 ${theme === 'dark' ? 'border-white/10 bg-black/20' : 'border-gray-200 bg-gray-50'}`}>
              <button onClick={handleUseMyPosition} disabled={busy} className="w-full flex items-center justify-center gap-1.5 py-2 bg-gold text-black text-[9.5px] font-bold uppercase tracking-widest rounded-lg disabled:opacity-40">
                <Navigation size={12} /> Ma position actuelle
              </button>
              <button onClick={() => setShowMapPicker(true)} disabled={busy} className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[9.5px] font-bold uppercase tracking-widest disabled:opacity-40 ${theme === 'dark' ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>
                <MapIcon size={12} /> Choisir sur la carte
              </button>
            </div>
          )}

          {showMapPicker && (
            <LocationPickerModal
              theme={theme}
              onConfirm={(loc) => handleSendLocation(loc)}
              onClose={() => setShowMapPicker(false)}
            />
          )}

          {/* RESCHEDULE FORM */}
          {showReschedule && (
            <div className={`p-3 rounded-lg border space-y-2 ${theme === 'dark' ? 'border-white/10 bg-black/20' : 'border-gray-200 bg-gray-50'}`}>
              <input type="datetime-local" value={rescheduleDateTime} onChange={(e) => setRescheduleDateTime(e.target.value)} className={inputClass} />
              <button onClick={handlePropose} disabled={busy || !rescheduleDateTime} className="w-full py-2 bg-gold text-black text-[9.5px] font-bold uppercase tracking-widest rounded-lg disabled:opacity-40 flex items-center justify-center gap-1.5">
                <Send size={12} /> Envoyer la proposition
              </button>
            </div>
          )}

          {/* PHONE SHARE FORM */}
          {showPhoneShare && (
            <div className={`p-3 rounded-lg border space-y-2 ${theme === 'dark' ? 'border-white/10 bg-black/20' : 'border-gray-200 bg-gray-50'}`}>
              <input type="tel" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} placeholder="+212 6 XX XX XX XX" className={inputClass} />
              <button onClick={handleSharePhone} disabled={busy || !phoneInput.trim()} className="w-full py-2 bg-gold text-black text-[9.5px] font-bold uppercase tracking-widest rounded-lg disabled:opacity-40">
                Confirmer le partage
              </button>
            </div>
          )}
        </div>
      )}

      {/* CANCEL CONFIRM DIALOG */}
      <AnimatePresence>
        {showCancelConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[160] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm" onClick={() => { setShowCancelConfirm(false); setShowCancelReasonForm(false); }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className={`w-full max-w-sm rounded-xl border p-5 space-y-4 ${theme === 'dark' ? 'bg-mid-brown border-gold/30' : 'bg-white border-gray-200'}`}>
              {!showCancelReasonForm ? (
                <>
                  <p className="flex items-center gap-2 text-sm font-bold"><AlertTriangle size={16} className="text-amber-400" /> Voulez-vous vraiment annuler cette séance ?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => role === 'client' ? setShowCancelReasonForm(true) : handleCancelConfirmed()}
                      disabled={busy}
                      className="flex-1 py-2.5 bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg disabled:opacity-40"
                    >
                      OK
                    </button>
                    <button onClick={() => setShowCancelConfirm(false)} className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-lg border ${theme === 'dark' ? 'border-white/10 text-warm-gray' : 'border-gray-200 text-gray-500'}`}>
                      Non
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs font-bold uppercase tracking-widest text-gold">Pourquoi annulez-vous ?</p>
                  <div className="space-y-1.5">
                    {CANCEL_REASONS.map(r => (
                      <button
                        key={r.key}
                        onClick={() => setCancelReason(r.key)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs border transition-colors ${cancelReason === r.key ? 'border-gold bg-gold/10 text-gold' : theme === 'dark' ? 'border-white/10 text-warm-gray' : 'border-gray-200 text-gray-600'}`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                  {cancelReason === 'other' && (
                    <textarea
                      value={cancelDetail}
                      onChange={(e) => setCancelDetail(e.target.value)}
                      placeholder="Précisez la raison..."
                      rows={2}
                      className={inputClass}
                    />
                  )}
                  <button
                    onClick={handleCancelConfirmed}
                    disabled={busy || !cancelReason || (cancelReason === 'other' && !cancelDetail.trim())}
                    className="w-full py-2.5 bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg disabled:opacity-40"
                  >
                    Confirmer l'annulation
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

