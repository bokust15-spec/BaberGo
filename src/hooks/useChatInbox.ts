import { useEffect, useState } from 'react';
import { Appointment, ChatMessage } from './useFirebase';

export interface ChatConversation {
  appointment: Appointment;
  lastMessage: ChatMessage | null;
  unread: boolean;
}

function toMillis(value: any): number {
  if (!value) return 0;
  const date = value instanceof Date ? value : value.toDate();
  return date.getTime();
}

// Orchestrates the "Chat" inbox tab: one live last-message + read-receipt subscription
// per eligible appointment, so both the conversation list and the bottom-nav unread
// badge stay in sync without a page reload. Deliberately takes the Firestore functions
// as parameters rather than calling useFirebase() itself — there's already exactly one
// useFirebase() call in App.tsx, and every other piece of the app receives its
// functions as props from there instead of creating a second, redundant subscription
// set (auth listener, barbers list, etc.).
export function useChatInbox(
  appointments: Appointment[],
  currentUid: string | undefined,
  subscribeToLastChatMessage: (appointmentId: string, callback: (message: ChatMessage | null) => void) => () => void,
  subscribeToChatReadReceipt: (appointmentId: string, callback: (lastReadAt: any | null) => void) => () => void,
): { conversations: ChatConversation[]; totalUnread: number } {
  const [lastMessages, setLastMessages] = useState<Record<string, ChatMessage | null>>({});
  const [readReceipts, setReadReceipts] = useState<Record<string, any | null>>({});

  // Only appointments that reached 'confirmed' at some point ever get a chat — a
  // 'pending' request never does.
  const chatAppointments = appointments.filter(a => a.status !== 'pending');
  const chatAppointmentIds = chatAppointments.map(a => a.id).sort().join(',');

  useEffect(() => {
    if (!currentUid) return;
    const unsubscribes: (() => void)[] = [];
    chatAppointments.forEach(app => {
      unsubscribes.push(subscribeToLastChatMessage(app.id, (message) => {
        setLastMessages(prev => ({ ...prev, [app.id]: message }));
      }));
      unsubscribes.push(subscribeToChatReadReceipt(app.id, (lastReadAt) => {
        setReadReceipts(prev => ({ ...prev, [app.id]: lastReadAt }));
      }));
    });
    return () => unsubscribes.forEach(unsub => unsub());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatAppointmentIds, currentUid]);

  const conversations: ChatConversation[] = chatAppointments
    .map(appointment => {
      const lastMessage = lastMessages[appointment.id] ?? null;
      const lastReadAt = readReceipts[appointment.id] ?? null;
      const unread = !!lastMessage
        && lastMessage.senderId !== currentUid
        && (!lastReadAt || toMillis(lastMessage.createdAt) > toMillis(lastReadAt));
      return { appointment, lastMessage, unread };
    })
    .sort((a, b) => toMillis(b.lastMessage?.createdAt) - toMillis(a.lastMessage?.createdAt));

  const totalUnread = conversations.filter(c => c.unread).length;

  return { conversations, totalUnread };
}
