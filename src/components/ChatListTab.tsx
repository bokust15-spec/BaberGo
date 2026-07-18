import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { MessageCircle, ArrowLeft, Trash2 } from 'lucide-react';
import { Appointment, UserProfile } from '../hooks/useFirebase';
import { ChatConversation } from '../hooks/useChatInbox';
import { chatPreviewLabel } from '../data/chatMessages';
import { formatRelativeTime } from '../utils/relativeTime';
import AppointmentChat from './AppointmentChat';
import Avatar from './Avatar';

interface ChatListTabProps {
  currentUid: string;
  theme: 'dark' | 'light';
  conversations: ChatConversation[];
  barbers?: UserProfile[]; // to resolve the other party's name/avatar when this account is the client on a conversation (a pro's own name is already denormalized on the appointment when this account is the barber)
  services?: { id: string; duration?: number }[]; // the caller's own services list (client's global catalog, or the pro's own menu) — to resolve serviceDuration by appointment.serviceId, same lookup MyBookingsSection/BookingsTab already did inline
  clientPhone?: string; // this account's own phone — only used when it turns out to be the client on the selected conversation
  onUpdateAppointment: (id: string, updates: Partial<Appointment>) => Promise<void>;
  onUpdateStatus: (id: string, status: Appointment['status']) => Promise<void>;
  onMarkAsRead: (appointmentId: string) => Promise<void>;
  onDeleteConversation: (appointmentId: string) => Promise<void>;
  initialSelectedAppointmentId?: string | null;
  onInitialSelectedConsumed?: () => void;
}

// How far a row slides left to reveal the "Supprimer" button, in px.
const REVEAL_WIDTH = 84;
const LONG_PRESS_MS = 550;

// Messenger-style conversation list for the dedicated "Chat" tab — a thin shell around
// the existing AppointmentChat component (unchanged internally, it already manages its
// own meta/messages subscriptions once mounted with an appointment). This shell only
// adds the list, the Tout/Non lu filter, marking a conversation as read, and deleting a
// conversation (swipe left or long-press to reveal Supprimer — "for me" only, see
// hideChatForMe/firestore.rules' hidden/{uid}: the other party keeps their copy intact).
//
// Role is resolved PER CONVERSATION (clientId === currentUid), not fixed by account type —
// a pro account can itself be the client on an appointment (booked another pro), and
// firestore.rules requires the message's senderRole to match the uid's actual relationship
// to that specific appointment, not the account's usual role.
export default function ChatListTab({ currentUid, theme, conversations, barbers, services, clientPhone, onUpdateAppointment, onUpdateStatus, onMarkAsRead, onDeleteConversation, initialSelectedAppointmentId, onInitialSelectedConsumed }: ChatListTabProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A "Voir la conversation" link from the Réservation tab pre-selects a conversation —
  // consumed once so navigating back to the list and returning doesn't re-force it.
  useEffect(() => {
    if (initialSelectedAppointmentId) {
      setSelectedId(initialSelectedAppointmentId);
      onInitialSelectedConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSelectedAppointmentId]);

  const selected = conversations.find(c => c.appointment.id === selectedId) || null;

  // Marks read on open, and again whenever a new message arrives while this
  // conversation stays the one open (selected.lastMessage?.id changes as useChatInbox's
  // subscription updates).
  useEffect(() => {
    if (selectedId) onMarkAsRead(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selected?.lastMessage?.id]);

  const roleFor = (appointment: Appointment): 'client' | 'barber' =>
    appointment.clientId === currentUid ? 'client' : 'barber';

  const otherPartyInfo = (appointment: Appointment): { name: string; avatarUrl?: string } => {
    if (roleFor(appointment) === 'client') {
      const barber = barbers?.find(b => b.uid === appointment.barberId);
      return { name: barber ? `${barber.firstName} ${barber.lastName}`.trim() : 'Professionnel', avatarUrl: barber?.avatarUrl };
    }
    return { name: appointment.clientName || 'Client' };
  };

  const startLongPress = (appointmentId: string) => {
    longPressTimer.current = setTimeout(() => setRevealedId(appointmentId), LONG_PRESS_MS);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleDeleteConversation = async (appointmentId: string) => {
    setDeletingId(appointmentId);
    try {
      await onDeleteConversation(appointmentId);
    } catch (e) {
      console.error('Error deleting conversation:', e);
    }
    setDeletingId(null);
    setRevealedId(null);
  };

  const filtered = conversations.filter(c => filter === 'all' || c.unread);
  const textClass = theme === 'dark' ? 'text-white' : 'text-gray-900';

  if (selected) {
    const other = otherPartyInfo(selected.appointment);
    return (
      <div className={`fixed inset-0 z-[150] flex flex-col ${theme === 'dark' ? 'bg-black' : 'bg-gray-50'}`}>
        <div className="flex flex-col h-full max-w-3xl mx-auto w-full">
          {/* FIXED HEADER — full-screen, WhatsApp-style conversation view */}
          <div className={`shrink-0 flex items-center gap-3 px-4 py-3 border-b ${theme === 'dark' ? 'border-gold/15 bg-mid-brown' : 'border-gray-200 bg-white'}`}>
            <button
              onClick={() => setSelectedId(null)}
              aria-label="Retour aux conversations"
              className={`shrink-0 ${theme === 'dark' ? 'text-warm-gray hover:text-gold' : 'text-gray-500 hover:text-gold'}`}
            >
              <ArrowLeft size={20} />
            </button>
            <Avatar src={other.avatarUrl} size="w-9 h-9" className="border border-gold/30" />
            <span className={`text-base font-bold truncate ${textClass}`}>{other.name}</span>
          </div>

          <AppointmentChat
            appointment={selected.appointment}
            role={roleFor(selected.appointment)}
            theme={theme}
            clientPhone={clientPhone}
            serviceDuration={services?.find(s => s.id === selected.appointment.serviceId)?.duration}
            onUpdateAppointment={onUpdateAppointment}
            onUpdateStatus={onUpdateStatus}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-3xl mx-auto w-full">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle size={18} className="text-gold" />
        <h2 className={`font-bebas text-xl tracking-widest uppercase ${textClass}`}>Chat</h2>
      </div>

      <div className="flex gap-2 mb-4">
        {([{ id: 'all' as const, label: 'Tout' }, { id: 'unread' as const, label: 'Non lu' }]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-colors ${
              filter === tab.id ? 'bg-gold text-black border-gold' : theme === 'dark' ? 'border-white/10 text-warm-gray hover:text-gold' : 'border-gray-200 text-gray-500 hover:text-gold'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs text-warm-gray">{filter === 'unread' ? 'Aucun message non lu.' : 'Aucune conversation pour le moment.'}</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(({ appointment, lastMessage, unread }) => {
            const other = otherPartyInfo(appointment);
            const isRevealed = revealedId === appointment.id;
            return (
              <div key={appointment.id} className="relative overflow-hidden rounded-xl">
                <div className="absolute inset-y-0 right-0 flex items-stretch" style={{ width: REVEAL_WIDTH }}>
                  <button
                    onClick={() => handleDeleteConversation(appointment.id)}
                    disabled={deletingId === appointment.id}
                    className="flex-1 flex flex-col items-center justify-center gap-1 bg-red-500 text-white disabled:opacity-60"
                  >
                    <Trash2 size={16} />
                    <span className="text-[8px] font-bold uppercase tracking-widest">{deletingId === appointment.id ? '...' : 'Supprimer'}</span>
                  </button>
                </div>
                <motion.div
                  drag="x"
                  dragConstraints={{ left: -REVEAL_WIDTH, right: 0 }}
                  dragElastic={0.1}
                  animate={{ x: isRevealed ? -REVEAL_WIDTH : 0 }}
                  transition={{ type: 'tween', duration: 0.18 }}
                  onDragEnd={(_e, info) => setRevealedId(info.offset.x < -REVEAL_WIDTH / 2 ? appointment.id : null)}
                  onPointerDown={() => startLongPress(appointment.id)}
                  onPointerUp={cancelLongPress}
                  onPointerLeave={cancelLongPress}
                  onClick={() => { isRevealed ? setRevealedId(null) : setSelectedId(appointment.id); }}
                  className={`relative w-full flex items-center gap-3 p-3 rounded-xl border text-left cursor-pointer touch-pan-y ${theme === 'dark' ? 'border-gold/15 bg-mid-brown hover:bg-mid-brown/80' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                >
                  <Avatar src={other.avatarUrl} size="w-12 h-12" className="border border-gold/30" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm truncate ${unread ? 'font-bold' : 'font-medium'} ${textClass}`}>{other.name}</span>
                      {lastMessage && <span className="text-[10px] text-warm-gray shrink-0">{formatRelativeTime(lastMessage.createdAt)}</span>}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className={`text-[11px] truncate ${unread ? `${textClass} font-semibold` : 'text-warm-gray'}`}>
                        {lastMessage ? chatPreviewLabel(lastMessage) : 'Aucun message pour le moment'}
                      </span>
                      {unread && <span className="w-2 h-2 rounded-full bg-gold shrink-0" />}
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
