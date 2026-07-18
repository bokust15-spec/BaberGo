import React, { useEffect, useState } from 'react';
import { MessageCircle, ArrowLeft } from 'lucide-react';
import { Appointment, UserProfile } from '../hooks/useFirebase';
import { ChatConversation } from '../hooks/useChatInbox';
import { chatPreviewLabel } from '../data/chatMessages';
import { formatRelativeTime } from '../utils/relativeTime';
import AppointmentChat from './AppointmentChat';

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
  initialSelectedAppointmentId?: string | null;
  onInitialSelectedConsumed?: () => void;
}

// Messenger-style conversation list for the dedicated "Chat" tab — a thin shell around
// the existing AppointmentChat component (unchanged internally, it already manages its
// own meta/messages subscriptions once mounted with an appointment). This shell only
// adds the list, the Tout/Non lu filter, and marking a conversation as read.
//
// Role is resolved PER CONVERSATION (clientId === currentUid), not fixed by account type —
// a pro account can itself be the client on an appointment (booked another pro), and
// firestore.rules requires the message's senderRole to match the uid's actual relationship
// to that specific appointment, not the account's usual role.
export default function ChatListTab({ currentUid, theme, conversations, barbers, services, clientPhone, onUpdateAppointment, onUpdateStatus, onMarkAsRead, initialSelectedAppointmentId, onInitialSelectedConsumed }: ChatListTabProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
  // conversation stays the open one (selected.lastMessage?.id changes as useChatInbox's
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

  const filtered = conversations.filter(c => filter === 'all' || c.unread);
  const textClass = theme === 'dark' ? 'text-white' : 'text-gray-900';

  if (selected) {
    const other = otherPartyInfo(selected.appointment);
    return (
      <div className="p-4 space-y-3 max-w-3xl mx-auto w-full">
        <button
          onClick={() => setSelectedId(null)}
          className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-warm-gray hover:text-gold' : 'text-gray-500 hover:text-gold'}`}
        >
          <ArrowLeft size={14} /> Retour aux conversations
        </button>
        <div className="flex items-center gap-2 mb-1">
          {other.avatarUrl ? (
            <img src={other.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-gold/30" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold text-xs font-bold shrink-0">
              {other.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className={`text-sm font-bold ${textClass}`}>{other.name}</span>
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
            return (
              <button
                key={appointment.id}
                onClick={() => setSelectedId(appointment.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${theme === 'dark' ? 'border-gold/15 bg-mid-brown/20 hover:bg-mid-brown/30' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
              >
                {other.avatarUrl ? (
                  <img src={other.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover border border-gold/30 shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold text-base font-bold shrink-0">
                    {other.name.charAt(0).toUpperCase()}
                  </div>
                )}
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
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
