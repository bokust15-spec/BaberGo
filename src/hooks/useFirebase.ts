import { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
  User as FirebaseUser
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  updateDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  increment
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, db, storage, handleFirestoreError, OperationType } from '../lib/firebase';

export interface PortfolioItem {
  url: string; // cover photo — always set, kept for backward compatibility with single-photo posts
  urls?: string[]; // full set (1-15) for a multi-photo post, cover included as urls[0]; absent = single-photo post, use `url`
  name: string;
  price: number;
  category?: string; // one of SERVICE_CATEGORIES ids (src/data/categories.ts)
  createdAt?: number; // client timestamp (ms) — arrayUnion doesn't support serverTimestamp()
}

export const MAX_PHOTOS_PER_POST = 15;

// The real photo list for a post, whichever shape it was saved in — a pre-carousel
// post only ever had `url`, a carousel post has `urls` (cover included as urls[0]).
export function getItemPhotos(item: PortfolioItem): string[] {
  return item.urls && item.urls.length > 0 ? item.urls : [item.url];
}

export interface BarberService {
  id: string;
  name: string;
  price: number;
  duration: number;
}

export interface UserProfile {
  uid: string;
  firstName: string;
  lastName: string;
  gender: 'homme' | 'femme' | 'autre';
  phone: string;
  email: string;
  role: 'client' | 'barber';
  createdAt: any;
  kycStatus?: 'unverified' | 'pending' | 'verified';
  bio?: string;
  ageRange?: '18-25' | '26-35' | '36-45' | '46-55' | '56+'; // pro only, shown on their public profile
  completedCount?: number; // pro only, real count of appointments they've marked completed
  profileViews?: number; // pro only, real count of times their profile was opened by someone else
  unpaidCommissionsCount?: number; // pro only, real count of completed sessions not yet settled (15% commission model)
  totalCommissionsOwed?: number; // pro only, real sum in DH owed to BarberGo from unpaid completed sessions
  reviewCount?: number; // pro only, real number of reviews received — avgRating = ratingSum / reviewCount
  ratingSum?: number; // pro only, real sum of every review's rating (1-5), never a made-up average
  locationLat?: number; // pro only, real GPS reference point (rounded to ~100m for privacy) used to compute distance to clients
  locationLng?: number;
  locationMode?: 'manual' | 'auto'; // manual = set once by the pro; auto = kept updated by watchPosition while the app is open
  locationUpdatedAt?: number; // client timestamp (ms) of the last location save
  locationCountry?: string; // real country name resolved from locationLat/Lng — foundation for country-based matching later
  city?: string;
  avatarUrl?: string;
  coverUrl?: string;
  portfolioItems?: PortfolioItem[];
  categories?: string[]; // service categories this pro offers (src/data/categories.ts)
  services?: BarberService[]; // this pro's own menu of prestations with prices, shown when a client books
  workingDays?: number[]; // 0 = dimanche ... 6 = samedi
  workStartHour?: number;
  workEndHour?: number;
  basePrice?: number;
  nightEnabled?: boolean;
  nightStartHour?: number;
  nightPrice?: number;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  category: string;
}

export interface Appointment {
  id: string;
  clientId: string;
  barberId: string;
  serviceId: string;
  dateTime: any;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  totalPrice: number;
  clientName?: string;
  clientGender?: 'homme' | 'femme' | 'autre';
  clientEmail?: string;
  serviceName?: string;
  proposedPrice?: number;
  counterPriceByBarber?: number;
  counterDateTime?: any;
  negotiationStatus?: 'client_proposed' | 'barber_countered' | 'accepted' | 'declined';
  clientLocationShared?: boolean;
  clientNotes?: string;
  cancelledBy?: 'client' | 'barber';
  cancelReason?: 'late' | 'asked_to_cancel' | 'busy' | 'other';
  cancelReasonDetail?: string;
}

// Chat guidé attaché à une réservation confirmée — messages pré-écrits uniquement
// (jamais de texte libre) pour empêcher client et pro de s'échanger leurs coordonnées
// et de filer hors plateforme. Un seul doc meta par réservation (id = id de la
// réservation), plus une sous-collection immuable de messages (journal consultable par
// l'admin).
export interface AppointmentChatMeta {
  clientId: string;
  barberId: string;
  frozen: boolean;
  frozenReason?: 'cancelled' | 'session_ended';
  frozenAt?: any;
  phoneSharedAt?: any;
  clientSharedPhone?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderRole: 'client' | 'barber';
  type: 'canned' | 'location' | 'reschedule_proposal' | 'reschedule_response';
  cannedKey?: string;
  location?: { lat: number; lng: number; label?: string };
  proposedDateTime?: any;
  respondsToMessageId?: string;
  accepted?: boolean;
  createdAt: any;
}

export interface Review {
  id: string;
  clientId: string;
  barberId: string;
  appointmentId: string;
  rating: number;
  comment: string;
  createdAt: any;
}

// Deterministic, safe-for-a-Firestore-doc-ID identifier for a post (a barber's photo),
// derived from the barber's uid + the photo's own URL (already unique per upload/mock
// post) — so liking the same post always resolves to the same postLikes/{postId} doc.
export function hashPostId(barberUid: string, url: string): string {
  const str = `${barberUid}::${url}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return 'p' + Math.abs(hash).toString(36);
}

// The end of a booked session — start time + the matched service's duration (falls back
// to 30 min for legacy/ad-hoc entries with no matching service) — used to know when a
// location shared in the appointment chat should stop being shown.
export function getAppointmentEndTime(appointment: Appointment, service?: { duration: number }): Date {
  const start = appointment.dateTime instanceof Date ? appointment.dateTime : appointment.dateTime.toDate();
  const durationMin = service?.duration ?? 30;
  return new Date(start.getTime() + durationMin * 60000);
}

// Free, no-API-key forward geocoding (OpenStreetMap/Nominatim) — turns an address or
// place name the client types into a short list of candidate coordinates, so they can
// share a specific location in the appointment chat without needing a paid maps SDK.
// Best-effort: returns an empty list on any failure.
export async function geocodeAddress(queryText: string): Promise<{ lat: number; lng: number; label: string }[]> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(queryText)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data as any[]).map(item => ({ lat: parseFloat(item.lat), lng: parseFloat(item.lon), label: item.display_name as string }));
  } catch {
    return [];
  }
}

// Free, no-API-key reverse geocoding (client-side use is explicitly supported by
// BigDataCloud) — turns GPS coordinates into a country name so BarberGo can work
// anywhere in the world, not just Morocco. Best-effort: returns null on any failure,
// never throws, since a missing country name shouldn't block saving the location itself.
export async function reverseGeocodeCountry(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=fr`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.countryName) return null;
    // The underlying GeoNames data sometimes appends the French article for
    // alphabetical sorting (e.g. "Maroc (le)") — strip it for a clean display name.
    return data.countryName.replace(/\s*\((?:le|la|les|l')\)\s*$/i, '').trim();
  } catch {
    return null;
  }
}

function describeAuthError(error: any): string {
  const code = error?.code || '';
  if (code === 'auth/email-already-in-use') {
    return 'Un compte existe déjà avec cet email. Essayez de vous connecter à la place.';
  }
  if (code === 'auth/invalid-email') {
    return "Cette adresse email n'est pas valide.";
  }
  if (code === 'auth/weak-password') {
    return 'Le mot de passe doit contenir au moins 6 caractères.';
  }
  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return 'Email ou mot de passe incorrect.';
  }
  if (code === 'auth/user-not-found') {
    return "Aucun compte n'existe avec cet email. Inscrivez-vous d'abord.";
  }
  if (code === 'auth/too-many-requests') {
    return 'Trop de tentatives. Merci de réessayer dans quelques minutes.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Connexion impossible : vérifiez votre connexion internet.';
  }
  if (code === 'auth/operation-not-allowed') {
    return "La connexion par email n'est pas encore activée pour ce projet. (À activer dans Firebase Console → Authentication → Sign-in method → Email/Password.)";
  }
  return "La connexion a échoué. Merci de réessayer.";
}

export function useFirebase() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<UserProfile[]>([]);
  const [barbersLoading, setBarbersLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [dayVisitors, setDayVisitors] = useState(0);
  const [monthVisitors, setMonthVisitors] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  // True only when the profile fetch itself failed (network/App Check hiccup) — kept
  // separate from "profile is null" so a transient read error can never be mistaken
  // for "this account has no profile yet" and pop the registration form on a real user.
  const [profileFetchError, setProfileFetchError] = useState(false);

  useEffect(() => {
    // Live-subscribed rather than a one-time getDoc — an admin approving/rejecting KYC
    // or settling a commission happens from a *different* browser session, so without a
    // listener here the pro would only ever see the change after logging out and back in.
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }
      if (firebaseUser) {
        const docRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeProfile = onSnapshot(
          docRef,
          (docSnap) => {
            if (docSnap.exists()) {
              setProfile({ ...docSnap.data(), uid: firebaseUser.uid } as UserProfile);
            } else {
              setProfile(null);
            }
            setProfileFetchError(false);
            setLoading(false);
          },
          (error) => {
            console.error("Error fetching profile:", error);
            setProfileFetchError(true);
            setLoading(false);
          }
        );
        try {
          const adminSnap = await getDoc(doc(db, 'admins', firebaseUser.uid));
          setIsAdmin(adminSnap.exists());
        } catch (error) {
          // Was silently swallowed before — logged now so a real failure (permission
          // denied, wrong doc ID, network) is visible in the console instead of just
          // looking identical to "not an admin" with zero diagnostic trail.
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        }
      } else {
        setProfile(null);
        setProfileFetchError(false);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  // Clients browse prestations/profiles without an account — only booking requires
  // signing in — so this fetch runs for guests too, not just signed-in users.
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'services'));
        setServices(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));
      } catch (error) {
        console.error("Error fetching services:", error);
      }
    };

    fetchServices();

    // Live listener (not a one-time fetch) so a barber's new portfolio item, category,
    // or profile change shows up for clients already browsing, without needing a reload.
    const barbersQuery = query(collection(db, 'users'), where('role', '==', 'barber'));
    const unsubscribeBarbers = onSnapshot(barbersQuery, (snapshot) => {
      setBarbers(snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile)));
      setBarbersLoading(false);
    }, (error) => {
      console.error("Error fetching barbers:", error);
      setBarbersLoading(false);
    });

    return () => unsubscribeBarbers();
  }, []);

  // Real visitor counts — one Firestore doc per day (stats/visits_YYYY-MM-DD) and one
  // per month (stats/visits_YYYY-MM), each counted once per browser via its own
  // localStorage flag, live via onSnapshot so both numbers update for everyone as new
  // people arrive.
  useEffect(() => {
    const now = new Date();
    const dayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const trackPeriod = (key: string, setCount: (n: number) => void) => {
      const statsDocRef = doc(db, 'stats', `visits_${key}`);
      const unsubscribe = onSnapshot(statsDocRef, (snap) => {
        setCount(snap.exists() ? (snap.data().count || 0) : 0);
      }, (error) => {
        console.error("Error fetching visitor count:", error);
      });

      const alreadyCountedKey = `bg_visited_${key}`;
      if (!localStorage.getItem(alreadyCountedKey)) {
        setDoc(statsDocRef, { count: increment(1) }, { merge: true })
          .then(() => localStorage.setItem(alreadyCountedKey, '1'))
          .catch((error) => console.error("Error registering visit:", error));
      }

      return unsubscribe;
    };

    const unsubscribeDay = trackPeriod(dayKey, setDayVisitors);
    const unsubscribeMonth = trackPeriod(monthKey, setMonthVisitors);

    return () => {
      unsubscribeDay();
      unsubscribeMonth();
    };
  }, []);

  // Real total user count (clients + pros combined) — a single doc incremented once
  // per new account (see registerProfile), read live so the landing page number is
  // never a made-up figure.
  useEffect(() => {
    const statsDocRef = doc(db, 'stats', 'totalUsers');
    const unsubscribe = onSnapshot(statsDocRef, (snap) => {
      setTotalUsers(snap.exists() ? (snap.data().count || 0) : 0);
    }, (error) => {
      console.error("Error fetching total user count:", error);
    });
    return () => unsubscribe();
  }, []);

  // Seed default services/barbers on first run (demo data) — writing requires being
  // signed in, so this only runs once an account exists, separate from the public read above.
  useEffect(() => {
    if (!user) return;

    const seedServicesIfEmpty = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'services'));
        if (querySnapshot.empty) {
          const defaultServices: Omit<Service, 'id'>[] = [
            { name: 'Coupe Classique', price: 25, duration: 30, category: 'Cheveux' },
            { name: 'Taille de Barbe Royale', price: 20, duration: 25, category: 'Barbe' },
            { name: 'Dégradé Américain', price: 30, duration: 45, category: 'Cheveux' },
            { name: 'Soin Visage & Massage', price: 15, duration: 15, category: 'Soin' },
          ];
          for (const s of defaultServices) {
            await addDoc(collection(db, 'services'), s);
          }
          const reSnapshot = await getDocs(collection(db, 'services'));
          setServices(reSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));
        }
      } catch (error) {
        console.error("Error seeding services:", error);
      }
    };

    const seedBarbersIfEmpty = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'barber'));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
          const defaultBarbers = [
            { firstName: 'Karim', lastName: 'El Fassi', gender: 'homme', phone: '0612345678', email: 'karim@barbergo.ma', role: 'barber', createdAt: serverTimestamp() },
            { firstName: 'Nadia', lastName: 'Bennani', gender: 'femme', phone: '0612345679', email: 'nadia@barbergo.ma', role: 'barber', createdAt: serverTimestamp() },
            { firstName: 'Yassine', lastName: 'Ouali', gender: 'homme', phone: '0612345680', email: 'yassine@barbergo.ma', role: 'barber', createdAt: serverTimestamp() },
            { firstName: 'Fatima', lastName: 'Zouak', gender: 'femme', phone: '0612345681', email: 'fatima@barbergo.ma', role: 'barber', createdAt: serverTimestamp() },
          ];
          for (const b of defaultBarbers) {
            await setDoc(doc(db, 'users', b.email.split('@')[0]), b);
          }
        }
      } catch (error) {
        console.error("Error seeding barbers:", error);
      }
    };

    seedServicesIfEmpty();
    seedBarbersIfEmpty();
  }, [user]);

  const loginWithEmail = async (email: string, password: string) => {
    setLoginError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      setLoginError(describeAuthError(error));
      return false;
    }
  };

  const resetPassword = async (email: string) => {
    setLoginError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (error) {
      console.error("Password reset failed:", error);
      setLoginError(describeAuthError(error));
      return false;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Creates the Firebase Auth account (email/password) and the matching Firestore
  // profile in one step — registration no longer depends on being signed in already.
  const registerProfile = async (data: Omit<UserProfile, 'uid' | 'createdAt'> & { password: string }) => {
    setLoginError(null);
    const { password, ...profileFields } = data;

    try {
      const credential = await createUserWithEmailAndPassword(auth, profileFields.email, password);
      const uid = credential.user.uid;

      const profileData = {
        ...profileFields,
        createdAt: serverTimestamp(),
      };

      const docRef = doc(db, 'users', uid);
      await setDoc(docRef, profileData);
      setProfile({ ...profileData, uid, createdAt: new Date() } as UserProfile);

      setDoc(doc(db, 'stats', 'totalUsers'), { count: increment(1) }, { merge: true })
        .catch((error) => console.error("Error incrementing total user count:", error));

      const roleMessage = profileFields.role === 'barber'
        ? "Votre compte professionnel est prêt. Complétez votre profil (téléphone, dossier d'identité, prestations) depuis votre tableau de bord pour commencer à recevoir des réservations."
        : "Vous pouvez dès maintenant parcourir les professionnels beauté & bien-être près de chez vous et réserver votre prochain rendez-vous.";
      queueEmail(
        profileFields.email,
        'Bienvenue chez BarberGo !',
        `<p>Bonjour ${profileFields.firstName},</p><p>Bienvenue chez <strong>BarberGo</strong> ! Votre compte a bien été créé.</p><p>${roleMessage}</p>`
      );

      return uid;
    } catch (error) {
      console.error("Registration failed:", error);
      setLoginError(describeAuthError(error));
      throw error;
    }
  };

  // Writes a doc to mail/ — the "Trigger Email from Firestore" Firebase Extension
  // picks it up and actually sends it. Never throws: a failed notification shouldn't
  // block the booking action that triggered it.
  const queueEmail = async (to: string | undefined, subject: string, html: string) => {
    if (!to) return;
    try {
      await addDoc(collection(db, 'mail'), { to: [to], message: { subject, html } });
    } catch (error) {
      console.error('Error queueing email:', error);
    }
  };

  const formatEmailDate = (value: any): string => {
    const date = value?.toDate ? value.toDate() : new Date(value);
    if (isNaN(date.getTime())) return '';
    return `${date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const createAppointment = async (appointment: Omit<Appointment, 'id' | 'status'>) => {
    try {
      const rawData = {
        ...appointment,
        status: 'pending',
      };
      // Safely filter out undefined fields to prevent serialization issues
      const data: Record<string, any> = {};
      Object.entries(rawData).forEach(([key, value]) => {
        if (value !== undefined) {
          data[key] = value;
        }
      });
      await addDoc(collection(db, 'appointments'), data);

      if (appointment.barberId !== 'dummy_barber') {
        const barber = barbers.find(b => b.uid === appointment.barberId);
        if (barber?.email) {
          const dateStr = formatEmailDate(appointment.dateTime);
          await queueEmail(
            barber.email,
            'Nouvelle demande de réservation — BarberGo',
            `<p>Bonjour ${barber.firstName},</p><p><strong>${appointment.clientName || 'Un client'}</strong> souhaite réserver <strong>${appointment.serviceName || 'une prestation'}</strong> le <strong>${dateStr}</strong> pour <strong>${appointment.totalPrice} DH</strong>.</p><p>Connectez-vous à votre tableau de bord BarberGo pour répondre.</p>`
          );
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'appointments');
    }
  };

  const getAppointments = async (role: 'client' | 'barber') => {
    if (!user) return [];
    try {
      if (role === 'client') {
        const q = query(collection(db, 'appointments'), where('clientId', '==', user.uid));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
      } else {
        // Fetch appointments specific to this barber
        const qSpecific = query(collection(db, 'appointments'), where('barberId', '==', user.uid));
        const snapSpecific = await getDocs(qSpecific);
        const listSpecific = snapSpecific.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));

        // Fetch open/public announcements
        const qOpen = query(collection(db, 'appointments'), where('barberId', '==', 'dummy_barber'));
        const snapOpen = await getDocs(qOpen);
        const listOpen = snapOpen.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));

        // Merge without duplicates
        const mergedMap = new Map<string, Appointment>();
        listSpecific.forEach(app => mergedMap.set(app.id, app));
        listOpen.forEach(app => {
          // If the app is already pending or countering, make it visible on the general dashboard
          mergedMap.set(app.id, app);
        });

        return Array.from(mergedMap.values());
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'appointments');
      return [];
    }
  };

  const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
    try {
      const docRef = doc(db, 'appointments', id);
      await updateDoc(docRef, updates);

      const needsNotification = updates.status === 'confirmed' || updates.status === 'cancelled' || updates.status === 'completed' || updates.negotiationStatus === 'barber_countered';
      if (needsNotification) {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const appt = snap.data() as Appointment;
          const barber = barbers.find(b => b.uid === appt.barberId);
          const dateStr = formatEmailDate(appt.dateTime);

          // Real "clients servis" count shown on the barber's public profile — a plain
          // +1 each time they mark a booking completed, not a made-up flat number.
          if (updates.status === 'completed' && appt.barberId !== 'dummy_barber') {
            updateDoc(doc(db, 'users', appt.barberId), { completedCount: increment(1) })
              .catch((error) => console.error("Error incrementing completed count:", error));

            // 15% commission owed to BarberGo on the real session price — isolated write
            // (never bundled with completedCount) so firestore.rules can bound the delta.
            const commission = Math.round(appt.totalPrice * 0.15);
            updateDoc(doc(db, 'users', appt.barberId), {
              unpaidCommissionsCount: increment(1),
              totalCommissionsOwed: increment(commission),
            }).catch((error) => console.error("Error incrementing commission owed:", error));
          }

          if (updates.status === 'confirmed') {
            await queueEmail(
              appt.clientEmail,
              'Réservation confirmée — BarberGo',
              `<p>Bonne nouvelle !</p><p><strong>${barber?.firstName || 'Le professionnel'}</strong> a confirmé votre réservation pour <strong>${appt.serviceName || 'votre prestation'}</strong> le <strong>${dateStr}</strong>.</p>`
            );
          }
          if (updates.status === 'cancelled') {
            await queueEmail(
              appt.clientEmail,
              'Réservation annulée — BarberGo',
              `<p>Votre réservation pour <strong>${appt.serviceName || 'la prestation'}</strong> le <strong>${dateStr}</strong> a été annulée.</p>`
            );
            await queueEmail(
              barber?.email,
              'Réservation annulée — BarberGo',
              `<p>La réservation de <strong>${appt.clientName || 'votre client'}</strong> pour <strong>${appt.serviceName || 'la prestation'}</strong> le <strong>${dateStr}</strong> a été annulée.</p>`
            );
          }
          if (updates.negotiationStatus === 'barber_countered') {
            await queueEmail(
              appt.clientEmail,
              'Nouvelle proposition du prestataire — BarberGo',
              `<p><strong>${barber?.firstName || 'Le professionnel'}</strong> vous propose un nouveau créneau ou tarif pour <strong>${appt.serviceName || 'votre prestation'}</strong>. Connectez-vous à BarberGo pour l'accepter ou le refuser.</p>`
            );
          }
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `appointments/${id}`);
    }
  };

  const updateAppointmentStatus = async (id: string, status: Appointment['status']) => {
    await updateAppointment(id, { status });
  };

  // --- Appointment chat (guided, canned-messages-only) ---------------------------------
  // See AppointmentChatMeta/ChatMessage in the interfaces above and firestore.rules'
  // appointmentChats match block for the server-side enforcement this all leans on.

  const freezeAppointmentChat = async (appointmentId: string, reason: 'cancelled' | 'session_ended') => {
    try {
      await updateDoc(doc(db, 'appointmentChats', appointmentId), {
        frozen: true,
        frozenReason: reason,
        frozenAt: serverTimestamp(),
      });
    } catch (error) {
      // Non-fatal — if the chat was never opened, there's no meta doc to freeze, and
      // that's fine: an unopened chat can't have leaked anything to freeze against.
      console.error('Error freezing appointment chat:', error);
    }
  };

  // Called once the chat panel is opened on a confirmed booking — creates the meta doc
  // the first time either party looks at it, no-op afterwards.
  const getOrCreateAppointmentChat = async (appointmentId: string, clientId: string, barberId: string): Promise<AppointmentChatMeta> => {
    const ref = doc(db, 'appointmentChats', appointmentId);
    try {
      const snap = await getDoc(ref);
      if (snap.exists()) return snap.data() as AppointmentChatMeta;
      const meta: AppointmentChatMeta = { clientId, barberId, frozen: false };
      await setDoc(ref, meta);
      return meta;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `appointmentChats/${appointmentId}`);
      return { clientId, barberId, frozen: false };
    }
  };

  const subscribeToAppointmentChatMeta = (appointmentId: string, callback: (meta: AppointmentChatMeta | null) => void) => {
    return onSnapshot(doc(db, 'appointmentChats', appointmentId), (snap) => {
      callback(snap.exists() ? (snap.data() as AppointmentChatMeta) : null);
    }, (error) => console.error('Error subscribing to appointment chat:', error));
  };

  const subscribeToAppointmentMessages = (appointmentId: string, callback: (messages: ChatMessage[]) => void) => {
    const q = query(collection(db, 'appointmentChats', appointmentId, 'messages'), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
    }, (error) => console.error('Error subscribing to appointment chat messages:', error));
  };

  const sendCannedMessage = async (appointmentId: string, senderRole: 'client' | 'barber', cannedKey: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'appointmentChats', appointmentId, 'messages'), {
        senderId: user.uid,
        senderRole,
        type: 'canned',
        cannedKey,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `appointmentChats/${appointmentId}/messages`);
    }
  };

  const sendLocationMessage = async (appointmentId: string, senderRole: 'client' | 'barber', location: { lat: number; lng: number; label?: string }) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'appointmentChats', appointmentId, 'messages'), {
        senderId: user.uid,
        senderRole,
        type: 'location',
        location,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `appointmentChats/${appointmentId}/messages`);
    }
  };

  const proposeReschedule = async (appointmentId: string, senderRole: 'client' | 'barber', dateTime: Date) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'appointmentChats', appointmentId, 'messages'), {
        senderId: user.uid,
        senderRole,
        type: 'reschedule_proposal',
        proposedDateTime: dateTime,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `appointmentChats/${appointmentId}/messages`);
    }
  };

  // Only records the response message — moving the appointment's real dateTime on
  // acceptance is the caller's job (via the same onUpdateAppointment path every other
  // appointment mutation already goes through), so the UI that's showing this booking
  // list stays in sync instead of a parallel write it never refetches after.
  const respondToReschedule = async (appointmentId: string, senderRole: 'client' | 'barber', messageId: string, accepted: boolean) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'appointmentChats', appointmentId, 'messages'), {
        senderId: user.uid,
        senderRole,
        type: 'reschedule_response',
        respondsToMessageId: messageId,
        accepted,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `appointmentChats/${appointmentId}/messages`);
    }
  };

  // Only the client can call this, and only once — enforced by firestore.rules, which
  // also rejects it more than 90 minutes before the session starts.
  const shareClientPhone = async (appointmentId: string, phone: string) => {
    try {
      await updateDoc(doc(db, 'appointmentChats', appointmentId), {
        phoneSharedAt: serverTimestamp(),
        clientSharedPhone: phone,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `appointmentChats/${appointmentId}`);
    }
  };

  // Admin-only (enforced by firestore.rules) — the full transcript for a reservation, so
  // a suspicious cancellation can be reviewed by hand.
  const getAppointmentChatForAdmin = async (appointmentId: string): Promise<{ meta: AppointmentChatMeta | null; messages: ChatMessage[] }> => {
    try {
      const metaSnap = await getDoc(doc(db, 'appointmentChats', appointmentId));
      const q = query(collection(db, 'appointmentChats', appointmentId, 'messages'), orderBy('createdAt', 'asc'));
      const msgSnap = await getDocs(q);
      return {
        meta: metaSnap.exists() ? (metaSnap.data() as AppointmentChatMeta) : null,
        messages: msgSnap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)),
      };
    } catch (error) {
      console.error('Error fetching appointment chat for admin:', error);
      return { meta: null, messages: [] };
    }
  };

  const addReview = async (review: Omit<Review, 'id' | 'createdAt'>) => {
    try {
      const data = {
        ...review,
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'reviews'), data);

      // Real average rating shown on the barber's profile/list rows — an isolated +1
      // reviewCount / +rating ratingSum write, same tamper-proof pattern as profileViews.
      updateDoc(doc(db, 'users', review.barberId), {
        reviewCount: increment(1),
        ratingSum: increment(review.rating),
      }).catch((error) => console.error("Error updating review aggregate:", error));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reviews');
    }
  };

  const getBarberReviews = async (barberId: string) => {
    try {
      const q = query(collection(db, 'reviews'), where('barberId', '==', barberId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'reviews');
      return [];
    }
  };

  const updateBio = async (bio: string) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, { bio });
      setProfile(prev => prev ? { ...prev, bio } : prev);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const updatePhone = async (phone: string) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, { phone });
      setProfile(prev => prev ? { ...prev, phone } : prev);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  // Real per-pro "profile views" counter — a plain +1 on the barber's own doc each time
  // someone else opens their profile, never a made-up number. Silent no-op for guests
  // (not signed in) since the write requires auth; never throws so a failed view-count
  // bump can't block anything the viewer is actually trying to do.
  const incrementProfileView = async (barberId: string) => {
    if (!user || user.uid === barberId) return;
    try {
      await updateDoc(doc(db, 'users', barberId), { profileViews: increment(1) });
    } catch (error) {
      console.error("Error incrementing profile views:", error);
    }
  };

  // Real per-post like count, kept in its own postLikes/{postId} doc (not on the
  // barber's profile) so liking a post never needs write access to someone else's
  // account. Read-only for guests; liking requires being signed in.
  const getPostLikeState = async (postId: string): Promise<{ count: number; liked: boolean }> => {
    try {
      const snap = await getDoc(doc(db, 'postLikes', postId));
      if (!snap.exists()) return { count: 0, liked: false };
      const data = snap.data() as { count?: number; likedBy?: string[] };
      return { count: data.count || 0, liked: !!user && (data.likedBy || []).includes(user.uid) };
    } catch (error) {
      console.error("Error fetching post like state:", error);
      return { count: 0, liked: false };
    }
  };

  const toggleLike = async (postId: string): Promise<{ count: number; liked: boolean } | undefined> => {
    if (!user) return;
    const postRef = doc(db, 'postLikes', postId);
    try {
      const snap = await getDoc(postRef);
      if (!snap.exists()) {
        await setDoc(postRef, { count: 1, likedBy: [user.uid] });
        return { count: 1, liked: true };
      }
      const data = snap.data() as { count?: number; likedBy?: string[] };
      const alreadyLiked = (data.likedBy || []).includes(user.uid);
      if (alreadyLiked) {
        await updateDoc(postRef, { count: increment(-1), likedBy: arrayRemove(user.uid) });
        return { count: Math.max(0, (data.count || 0) - 1), liked: false };
      }
      await updateDoc(postRef, { count: increment(1), likedBy: arrayUnion(user.uid) });
      return { count: (data.count || 0) + 1, liked: true };
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const updateCity = async (city: string) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, { city });
      setProfile(prev => prev ? { ...prev, city } : prev);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const updateAgeRange = async (ageRange: UserProfile['ageRange']) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, { ageRange });
      setProfile(prev => prev ? { ...prev, ageRange } : prev);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  // Real GPS reference point a pro sets for themselves (manual = one-shot, auto = kept
  // fresh by watchPosition while the app is open) — used to compute a real distance to
  // clients/other pros instead of a city-level approximation. Rounded to 3 decimals
  // (~100m) before saving: precise enough for "nearby" search, without exposing an
  // exact street address in this publicly-readable profile document.
  const updateLocation = async (lat: number, lng: number, mode: 'manual' | 'auto') => {
    if (!user) return;
    const locationLat = Math.round(lat * 1000) / 1000;
    const locationLng = Math.round(lng * 1000) / 1000;
    const locationUpdatedAt = Date.now();
    try {
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, { locationLat, locationLng, locationMode: mode, locationUpdatedAt });
      setProfile(prev => prev ? { ...prev, locationLat, locationLng, locationMode: mode, locationUpdatedAt } : prev);

      // Resolve the country name in the background — never blocks the location save
      // itself, since this is a nice-to-have (worldwide readiness), not a requirement.
      reverseGeocodeCountry(lat, lng).then((locationCountry) => {
        if (!locationCountry) return;
        updateDoc(docRef, { locationCountry }).catch(() => {});
        setProfile(prev => prev ? { ...prev, locationCountry } : prev);
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    const path = `avatars/${user.uid}/${Date.now()}-${file.name}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    const docRef = doc(db, 'users', user.uid);
    await updateDoc(docRef, { avatarUrl: url });
    setProfile(prev => prev ? { ...prev, avatarUrl: url } : prev);
    return url;
  };

  const uploadCover = async (file: File) => {
    if (!user) return;
    const path = `covers/${user.uid}/${Date.now()}-${file.name}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    const docRef = doc(db, 'users', user.uid);
    await updateDoc(docRef, { coverUrl: url });
    setProfile(prev => prev ? { ...prev, coverUrl: url } : prev);
    return url;
  };

  // Uploads a CIN or selfie photo to Storage only — does NOT touch Firestore itself;
  // the caller passes the resulting URL to saveKycFile, which persists it to the
  // private kycSubmissions/{uid} doc (never the public users/{uid} doc).
  const uploadKycFile = async (file: File, type: 'cin' | 'selfie') => {
    if (!user) return;
    const path = `kyc/${user.uid}/${type}-${Date.now()}-${file.name}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  // Saves one KYC file's URL to the private kycSubmissions/{uid} doc — merged, not
  // overwritten, so uploading the CIN and the selfie in two separate sessions doesn't
  // erase whichever one was saved first (that was a real bug: the "already uploaded"
  // checkmark only ever lived in local component state, so refreshing the page before
  // both files were done in the same sitting made it look like nothing had been sent).
  // Once both files are present, flips the public kycStatus to 'pending' — only an
  // admin can move it to 'verified' afterward.
  const saveKycFile = async (type: 'cin' | 'selfie', url: string) => {
    if (!user) return;
    // Full overwrite (no merge) built from only the fields the current schema knows
    // about — a document created by an older version of this feature could carry a
    // field no longer in the schema, which would fail firestore.rules' strict
    // hasOnly() check on every future merge write forever (a real bug hit in
    // production: the write kept getting "Missing or insufficient permissions" with
    // no way to self-heal). Reconstructing the document from scratch each time clears
    // any such leftover instead of merging on top of it. The OTHER field is carried
    // forward only if it's still shaped the way the current schema expects (a
    // non-empty string) — an older version of this feature may have stored it
    // differently (e.g. an object instead of a plain URL string), and blindly copying
    // that value forward would keep failing the same schema check this fix clears.
    const isValidUrl = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
    const cleanData: { cinUrl?: string; selfieUrl?: string; submittedAt: any } = { submittedAt: serverTimestamp() };
    try {
      const submissionRef = doc(db, 'kycSubmissions', user.uid);
      const existingSnap = await getDoc(submissionRef);
      const existing = existingSnap.data();
      if (type === 'cin') {
        cleanData.cinUrl = url;
        if (isValidUrl(existing?.selfieUrl)) cleanData.selfieUrl = existing.selfieUrl;
      } else {
        cleanData.selfieUrl = url;
        if (isValidUrl(existing?.cinUrl)) cleanData.cinUrl = existing.cinUrl;
      }
      await setDoc(submissionRef, cleanData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `kycSubmissions/${user.uid}`);
    }
    // Separate try/catch from the write above — both used to share one catch block that
    // hardcoded "kycSubmissions/..." as the failing path no matter which of the two
    // writes actually threw, which made a real failure here (e.g. some other field on
    // this pro's own profile no longer matching the current schema, since this update
    // revalidates the *entire* users/{uid} document, not just kycStatus) look identical
    // to a kycSubmissions failure and impossible to tell apart from the error message.
    if (cleanData.cinUrl && cleanData.selfieUrl) {
      // This update revalidates the pro's *entire* profile document against the current
      // schema (firestore.rules can't validate just the one changed field in isolation),
      // and Firestore never says which check failed — just a flat permission error. A
      // long-lived account can easily carry a field that predates a rule (an old bio
      // written before the anti-contact-info filter existed, a portfolio grown past a
      // size cap since raised elsewhere, etc.), which then blocks *every* future write,
      // not just this one. Replaying the same checks client-side here means a real
      // mismatch surfaces as an actionable message instead of a dead end.
      const issues: string[] = [];
      const p = profile;
      if (p) {
        const hasContactInfoJS = (text: string) =>
          /[0-9][\s\S]*[0-9]/.test(text) || /(whatsapp|wa\.me)/i.test(text) || /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text);
        if (!(p.firstName && p.firstName.length >= 1 && p.firstName.length <= 100)) issues.push('prénom');
        if (p.lastName && p.lastName.length > 100) issues.push('nom (trop long)');
        if (!['homme', 'femme', 'autre'].includes(p.gender)) issues.push(`genre invalide ("${p.gender}")`);
        if (!(p.phone.length <= 20 && (p.phone.length === 0 || p.phone.length >= 8))) issues.push(`téléphone invalide ("${p.phone}")`);
        if (p.email && p.email.length > 200) issues.push('email trop long');
        if (p.bio && (p.bio.length > 500 || hasContactInfoJS(p.bio))) issues.push('bio (trop longue ou contient des chiffres/coordonnées détectés comme contact)');
        if (p.city && p.city.length > 50) issues.push('ville (trop longue)');
        if (p.portfolioItems && p.portfolioItems.length > 60) issues.push(`portfolio (${p.portfolioItems.length} publications, max 60)`);
        if (p.categories && p.categories.length > 20) issues.push(`catégories (${p.categories.length}, max 20)`);
        if (p.services && p.services.length > 30) issues.push(`services (${p.services.length}, max 30)`);
        const fieldCount = Object.keys(p).filter(k => k !== 'uid' && (p as any)[k] !== undefined).length;
        if (fieldCount > 45) issues.push(`profil trop volumineux (${fieldCount} champs, max 45)`);
      }
      if (issues.length > 0) {
        const message = `Le profil du pro contient un champ qui bloque toute mise à jour : ${issues.join(', ')}. Corrige-le dans "Mon Profil" avant de réessayer.`;
        console.error('Profile validation issue blocking KYC status update:', issues);
        throw new Error(message);
      }
      try {
        await updateDoc(doc(db, 'users', user.uid), { kycStatus: 'pending' });
        setProfile(prev => prev ? { ...prev, kycStatus: 'pending' } : prev);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
  };

  // Admin-only actions — enforced server-side by firestore.rules (isAdmin()), these
  // simply fail with a permission error if the caller isn't in the admins/{uid} collection.

  // Every reservation on the platform, not just the caller's own — so an admin can
  // monitor all bookings in one place (see AdminPanel's "Réservations" section).
  const getAllAppointments = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'appointments'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'appointments');
      return [];
    }
  };

  // Either field may be missing — a pro can have saved just one of the two files so far.
  const getKycSubmission = async (barberUid: string) => {
    const snap = await getDoc(doc(db, 'kycSubmissions', barberUid));
    return snap.exists() ? (snap.data() as { cinUrl?: string; selfieUrl?: string; submittedAt: any }) : null;
  };

  const approveBarberKyc = async (barberUid: string) => {
    await updateDoc(doc(db, 'users', barberUid), { kycStatus: 'verified' });
  };

  const rejectBarberKyc = async (barberUid: string) => {
    await updateDoc(doc(db, 'users', barberUid), { kycStatus: 'unverified' });
  };

  const settleCommission = async (barberUid: string) => {
    await updateDoc(doc(db, 'users', barberUid), { unpaidCommissionsCount: 0, totalCommissionsOwed: 0 });
  };

  // Accepts 1 to MAX_PHOTOS_PER_POST files as a single post (an Instagram-style
  // carousel) — the first photo becomes the cover (`url`, for existing code that only
  // ever reads a single photo), `urls` holds the full set.
  const addPortfolioItem = async (files: File[], name: string, price: number, category?: string) => {
    if (!user || files.length === 0) return;
    const capped = files.slice(0, MAX_PHOTOS_PER_POST);
    const urls = await Promise.all(capped.map(async (file, i) => {
      const path = `portfolios/${user.uid}/${Date.now()}-${i}-${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      return getDownloadURL(storageRef);
    }));
    const base = { url: urls[0], urls, name, price, createdAt: Date.now() };
    const item: PortfolioItem = category ? { ...base, category } : base;
    const docRef = doc(db, 'users', user.uid);
    await updateDoc(docRef, { portfolioItems: arrayUnion(item) });
    setProfile(prev => prev ? { ...prev, portfolioItems: [...(prev.portfolioItems || []), item] } : prev);
    return item;
  };

  const removePortfolioItem = async (item: PortfolioItem) => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid);
    await updateDoc(docRef, { portfolioItems: arrayRemove(item) });
    setProfile(prev => prev ? { ...prev, portfolioItems: (prev.portfolioItems || []).filter(p => p.url !== item.url) } : prev);
    try {
      await deleteObject(ref(storage, item.url));
    } catch {
      // Photo may already be gone from storage; the Firestore reference removal above is what matters.
    }
  };

  const updateAvailability = async (updates: Partial<Pick<UserProfile, 'workingDays' | 'workStartHour' | 'workEndHour' | 'basePrice' | 'nightEnabled' | 'nightStartHour' | 'nightPrice'>>) => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(docRef, updates);
      setProfile(prev => prev ? { ...prev, ...updates } : prev);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const updateCategories = async (categories: string[]) => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(docRef, { categories });
      setProfile(prev => prev ? { ...prev, categories } : prev);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const updateServices = async (services: BarberService[]) => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(docRef, { services });
      setProfile(prev => prev ? { ...prev, services } : prev);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return {
    user,
    profile,
    loading,
    profileFetchError,
    services,
    barbers,
    barbersLoading,
    dayVisitors,
    monthVisitors,
    totalUsers,
    isAdmin,
    loginWithEmail,
    resetPassword,
    loginError,
    clearLoginError: () => setLoginError(null),
    logout,
    registerProfile,
    createAppointment,
    getAppointments,
    updateAppointment,
    updateAppointmentStatus,
    getOrCreateAppointmentChat,
    subscribeToAppointmentChatMeta,
    subscribeToAppointmentMessages,
    sendCannedMessage,
    sendLocationMessage,
    proposeReschedule,
    respondToReschedule,
    shareClientPhone,
    freezeAppointmentChat,
    getAppointmentChatForAdmin,
    addReview,
    updateBio,
    updatePhone,
    updateCity,
    updateAgeRange,
    incrementProfileView,
    getPostLikeState,
    toggleLike,
    updateLocation,
    uploadAvatar,
    uploadCover,
    uploadKycFile,
    saveKycFile,
    getAllAppointments,
    getKycSubmission,
    approveBarberKyc,
    rejectBarberKyc,
    settleCommission,
    addPortfolioItem,
    removePortfolioItem,
    updateAvailability,
    updateCategories,
    updateServices,
    getBarberReviews
  };
}
