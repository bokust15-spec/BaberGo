import { useEffect, useState } from 'react';
import { Appointment } from './useFirebase';

// Filters a raw appointments array down to the ones this user hasn't deleted from their
// own "Mes réservations" list ("Supprimer" — for me only, same hide-for-me pattern as
// useChatInbox's hidden-state filtering, see firestore.rules' appointments/{id}/hidden/{uid}).
// getAppointments/getAllAppointments in useFirebase.ts are one-time getDocs fetches, not
// onSnapshot — this hook owns the one live piece needed here: a per-appointment
// hidden/{uid} subscription, so the list updates immediately after a delete without
// waiting for a full refetch.
export function useHiddenAppointments(
  appointments: Appointment[],
  currentUid: string | undefined,
  subscribeToAppointmentHidden: (appointmentId: string, callback: (hidden: boolean) => void) => () => void,
): Appointment[] {
  const [hiddenState, setHiddenState] = useState<Record<string, boolean>>({});
  const appointmentIds = appointments.map(a => a.id).sort().join(',');

  useEffect(() => {
    if (!currentUid) return;
    const unsubscribes = appointments.map(app =>
      subscribeToAppointmentHidden(app.id, (hidden) => {
        setHiddenState(prev => ({ ...prev, [app.id]: hidden }));
      })
    );
    return () => unsubscribes.forEach(unsub => unsub());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentIds, currentUid]);

  return appointments.filter(app => !hiddenState[app.id]);
}
