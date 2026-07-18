import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarCheck, ChevronDown, Clock, AlertTriangle, Check, MessageCircle, Star, Trash2 } from 'lucide-react';
import { UserProfile, Appointment } from '../hooks/useFirebase';
import { STYLE_POSTS, avatarFor } from '../data/mockBarberFeed';

function toDate(value: any): Date {
  return value instanceof Date ? value : value.toDate();
}

// How far a row slides left to reveal the "Supprimer" button, in px — same values as
// ChatListTab's "delete conversation" gesture, reused here for "delete reservation".
const REVEAL_WIDTH = 84;
const LONG_PRESS_MS = 550;

// ============================================================
// CLIENT-SIDE booking history: response to barber counter-proposals
// (time/price), cancellation, reviews. Shared between AppMVP's "Mes
// réservations" tab (client accounts) and BarberDashboard's Réservation
// tab (a pro who booked another pro shows up here the exact same way).
// ============================================================
interface MyBookingsSectionProps {
  appointments: Appointment[];
  barbers: UserProfile[];
  services: { id: string; name: string; duration?: number }[];
  theme: 'dark' | 'light';
  clientId?: string;
  clientPhone?: string;
  title?: string;
  subtitle?: string;
  onUpdateStatus: (id: string, status: Appointment['status']) => Promise<void>;
  onUpdateAppointment: (id: string, updates: Partial<Appointment>) => Promise<void>;
  onAddReview: (review: { clientId: string; barberId: string; appointmentId: string; rating: number; comment: string }) => Promise<void>;
  onOpenChat: (appointmentId: string) => void;
  onDeleteAppointment: (id: string) => Promise<void>;
}

export default function MyBookingsSection({
  appointments,
  barbers,
  services,
  theme,
  clientId,
  clientPhone,
  title = 'Mes réservations',
  subtitle = 'Suivez vos demandes, répondez aux propositions de vos professionnels et laissez un avis après votre séance.',
  onUpdateStatus,
  onUpdateAppointment,
  onAddReview,
  onOpenChat,
  onDeleteAppointment
}: MyBookingsSectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [ratingDraft, setRatingDraft] = useState<Record<string, number>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [submittingReview, setSubmittingReview] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sorted = useMemo(
    () => [...appointments].sort((a, b) => toDate(b.dateTime).getTime() - toDate(a.dateTime).getTime()),
    [appointments]
  );

  const getServiceLabel = (app: Appointment) => app.serviceName || services.find(s => s.id === app.serviceId)?.name || 'Prestation';

  const getBarberInfo = (app: Appointment): { name: string; avatarUrl: string | null } => {
    if (app.barberId === 'dummy_barber') return { name: 'Recherche d\'un professionnel en cours...', avatarUrl: null };
    const real = barbers.find(b => b.uid === app.barberId);
    if (real) return { name: `${real.firstName} ${real.lastName}`, avatarUrl: real.avatarUrl || null };
    const mockPost = STYLE_POSTS.find(p => p.id === app.barberId);
    if (mockPost) return { name: mockPost.barberName, avatarUrl: avatarFor(mockPost.id) };
    return { name: 'Professionnel BarberGo', avatarUrl: null };
  };

  const statusLabel: Record<Appointment['status'], string> = {
    pending: 'En attente',
    confirmed: 'Confirmée',
    completed: 'Terminée',
    cancelled: 'Annulée'
  };
  const statusClass: Record<Appointment['status'], string> = {
    pending: 'bg-amber-500/10 text-amber-400',
    confirmed: 'bg-emerald-500/10 text-emerald-400',
    completed: 'bg-blue-500/10 text-blue-400',
    cancelled: 'bg-red-500/10 text-red-400'
  };

  const hasCounter = (app: Appointment) => app.status === 'pending' && app.negotiationStatus === 'barber_countered';

  const handleAcceptCounter = async (app: Appointment) => {
    setBusyId(app.id);
    const updates: Partial<Appointment> = { status: 'confirmed', negotiationStatus: 'accepted' };
    if (app.counterDateTime) updates.dateTime = app.counterDateTime;
    if (app.counterPriceByBarber) updates.totalPrice = app.counterPriceByBarber;
    try {
      await onUpdateAppointment(app.id, updates);
    } catch (e) {
      console.error(e);
    }
    setBusyId(null);
  };

  const handleDeclineCounter = async (app: Appointment) => {
    setBusyId(app.id);
    try {
      await onUpdateAppointment(app.id, { status: 'cancelled', negotiationStatus: 'declined' });
    } catch (e) {
      console.error(e);
    }
    setBusyId(null);
  };

  const handleCancel = async (app: Appointment) => {
    setBusyId(app.id);
    try {
      await onUpdateStatus(app.id, 'cancelled');
    } catch (e) {
      console.error(e);
    }
    setBusyId(null);
  };

  const handleSubmitReview = async (app: Appointment) => {
    if (!clientId) return;
    setSubmittingReview(app.id);
    try {
      await onAddReview({
        clientId,
        barberId: app.barberId,
        appointmentId: app.id,
        rating: ratingDraft[app.id] || 5,
        comment: commentDraft[app.id] || ''
      });
      setReviewedIds(prev => new Set(prev).add(app.id));
    } catch (e) {
      console.error(e);
    }
    setSubmittingReview(null);
  };

  const startLongPress = (id: string) => {
    longPressTimer.current = setTimeout(() => setRevealedId(id), LONG_PRESS_MS);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    setDeletingId(id);
    try {
      await onDeleteAppointment(id);
    } catch (e) {
      console.error('Error deleting appointment:', e);
    }
    setDeletingId(null);
    setRevealedId(null);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12 text-left">
      <div className="mb-6">
        <h1 className={`font-bebas text-3xl md:text-4xl tracking-wide uppercase mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{title}</h1>
        <p className="text-warm-gray text-sm">{subtitle}</p>
      </div>

      {sorted.length === 0 ? (
        <div className={`p-10 text-center border border-dashed rounded-xl opacity-60 ${theme === 'dark' ? 'border-gold/20' : 'border-gray-300'}`}>
          <CalendarCheck size={28} className="mx-auto mb-3 text-gold/40" />
          <p className="text-xs uppercase tracking-widest font-bold">Aucune réservation pour le moment</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(app => {
            const date = toDate(app.dateTime);
            const expanded = expandedId === app.id;
            const barberInfo = getBarberInfo(app);
            const busy = busyId === app.id;
            const isRevealed = revealedId === app.id;
            return (
              <div key={app.id} className="relative overflow-hidden rounded-xl">
                <div className="absolute inset-y-0 right-0 flex items-stretch" style={{ width: REVEAL_WIDTH }}>
                  <button
                    onClick={() => handleDeleteAppointment(app.id)}
                    disabled={deletingId === app.id}
                    className="flex-1 flex flex-col items-center justify-center gap-1 bg-red-500 text-white disabled:opacity-60"
                  >
                    <Trash2 size={16} />
                    <span className="text-[8px] font-bold uppercase tracking-widest">{deletingId === app.id ? '...' : 'Supprimer'}</span>
                  </button>
                </div>
                <motion.div
                  drag="x"
                  dragConstraints={{ left: -REVEAL_WIDTH, right: 0 }}
                  dragElastic={0.1}
                  animate={{ x: isRevealed ? -REVEAL_WIDTH : 0 }}
                  transition={{ type: 'tween', duration: 0.18 }}
                  onDragEnd={(_e, info) => setRevealedId(info.offset.x < -REVEAL_WIDTH / 2 ? app.id : null)}
                  onPointerDown={() => startLongPress(app.id)}
                  onPointerUp={cancelLongPress}
                  onPointerLeave={cancelLongPress}
                  className={`relative rounded-xl border overflow-hidden touch-pan-y ${theme === 'dark' ? 'bg-mid-brown/40 border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}
                >
                <button
                  onClick={() => { if (isRevealed) { setRevealedId(null); return; } setExpandedId(expanded ? null : app.id); }}
                  className="w-full p-4 flex items-center gap-4 text-left"
                >
                  {barberInfo.avatarUrl ? (
                    <img src={barberInfo.avatarUrl} alt="" className="w-12 h-12 shrink-0 rounded-full object-cover border border-gold/30" />
                  ) : (
                    <div className={`w-12 h-12 shrink-0 flex flex-col items-center justify-center rounded-lg text-center leading-none ${theme === 'dark' ? 'bg-gold/10 text-gold' : 'bg-gray-100 text-gray-500'}`}>
                      <span className="text-[9px] uppercase font-bold">{date.toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
                      <span className="text-xl font-bebas leading-none mt-0.5">{date.getDate()}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bebas tracking-widest uppercase truncate">{getServiceLabel(app)}</h4>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase shrink-0 ${statusClass[app.status]}`}>{statusLabel[app.status]}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] text-warm-gray uppercase font-semibold">
                      <span className="truncate">{barberInfo.name}</span>
                      <span className="flex items-center gap-1"><Clock size={10} className="text-gold" /> {date.toLocaleDateString('fr-FR')} · {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-bebas text-gold tracking-widest">{app.totalPrice} DH</div>
                    <ChevronDown size={16} className={`ml-auto text-warm-gray transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 pt-0 space-y-3 border-t border-white/5">
                        {app.clientNotes && (
                          <p className="text-xs text-warm-gray italic bg-black/10 p-2 rounded-lg border border-white/5 mt-3">"{app.clientNotes}"</p>
                        )}

                        {hasCounter(app) && (
                          <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-2">
                            <p className="text-[10px] text-amber-400 uppercase font-bold flex items-center gap-1.5">
                              <AlertTriangle size={12} /> Votre professionnel propose un changement
                            </p>
                            {app.counterDateTime && (
                              <p className="text-xs text-warm-gray">Nouveau créneau : <strong className="text-white">{toDate(app.counterDateTime).toLocaleString('fr-FR')}</strong></p>
                            )}
                            {app.counterPriceByBarber && (
                              <p className="text-xs text-warm-gray">Nouveau tarif : <strong className="text-gold">{app.counterPriceByBarber} DH</strong></p>
                            )}
                            <div className="flex gap-2 pt-1">
                              <button
                                disabled={busy}
                                onClick={() => handleAcceptCounter(app)}
                                className="flex-1 py-2 bg-emerald-500 text-black text-[9.5px] font-bold uppercase tracking-widest rounded-lg disabled:opacity-40 flex items-center justify-center gap-1"
                              >
                                <Check size={12} /> Accepter
                              </button>
                              <button
                                disabled={busy}
                                onClick={() => handleDeclineCounter(app)}
                                className="flex-1 py-2 border border-red-500/20 text-red-400 text-[9.5px] font-bold uppercase tracking-widest rounded-lg disabled:opacity-40"
                              >
                                Refuser
                              </button>
                            </div>
                          </div>
                        )}

                        {app.status === 'pending' && !hasCounter(app) && (
                          <div className="space-y-2">
                            <p className="text-[10px] text-warm-gray uppercase font-bold">En attente de la réponse de l'professionnel</p>
                            <button
                              disabled={busy}
                              onClick={() => handleCancel(app)}
                              className="w-full py-2.5 border border-red-500/20 text-red-400 text-[9.5px] font-bold uppercase tracking-widest rounded-lg disabled:opacity-40"
                            >
                              Annuler la demande
                            </button>
                          </div>
                        )}

                        {app.status === 'confirmed' && (
                          <button
                            onClick={() => onOpenChat(app.id)}
                            className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-gold/10 border border-gold/30 text-gold text-[9.5px] font-bold uppercase tracking-widest rounded-lg hover:bg-gold/20 transition-colors"
                          >
                            <MessageCircle size={12} /> Voir la conversation
                          </button>
                        )}

                        {app.status === 'completed' && (
                          reviewedIds.has(app.id) ? (
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center text-emerald-400 text-xs font-bold uppercase tracking-widest">
                              Merci pour votre avis !
                            </div>
                          ) : (
                            <div className="p-3 rounded-lg border border-gold/20 bg-black/10 space-y-2">
                              <p className="text-[10px] text-warm-gray uppercase font-bold">Laisser un avis</p>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map(n => (
                                  <button
                                    key={n}
                                    onClick={() => setRatingDraft(prev => ({ ...prev, [app.id]: n }))}
                                    className="p-0.5"
                                  >
                                    <Star size={18} className={n <= (ratingDraft[app.id] || 5) ? 'fill-gold text-gold' : 'text-warm-gray/30'} />
                                  </button>
                                ))}
                              </div>
                              <textarea
                                value={commentDraft[app.id] || ''}
                                onChange={(e) => setCommentDraft(prev => ({ ...prev, [app.id]: e.target.value }))}
                                rows={2}
                                placeholder="Votre expérience avec cet professionnel..."
                                className={`w-full px-3 py-2 rounded-lg text-xs outline-none border resize-none ${theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                              />
                              <button
                                disabled={submittingReview === app.id}
                                onClick={() => handleSubmitReview(app)}
                                className="w-full py-2 bg-gold text-black text-[9px] font-bold uppercase tracking-widest rounded-lg disabled:opacity-40"
                              >
                                {submittingReview === app.id ? 'Envoi...' : 'Envoyer mon avis'}
                              </button>
                            </div>
                          )
                        )}

                        {app.status === 'cancelled' && (
                          <p className="text-[10px] text-red-400 uppercase font-bold">Cette réservation a été annulée.</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                </motion.div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
