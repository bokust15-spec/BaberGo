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
  updateDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  increment
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, db, storage, handleFirestoreError, OperationType } from '../lib/firebase';

export interface PortfolioItem {
  url: string;
  name: string;
  price: number;
  category?: string; // one of SERVICE_CATEGORIES ids (src/data/categories.ts)
  createdAt?: number; // client timestamp (ms) — arrayUnion doesn't support serverTimestamp()
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
  kycCinUrl?: string;
  kycSelfieUrl?: string;
  bio?: string;
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
  serviceName?: string;
  proposedPrice?: number;
  counterPriceByBarber?: number;
  counterDateTime?: any;
  negotiationStatus?: 'client_proposed' | 'barber_countered' | 'accepted' | 'declined';
  clientLocationShared?: boolean;
  clientNotes?: string;
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
  const [loginError, setLoginError] = useState<string | null>(null);
  const [dayVisitors, setDayVisitors] = useState(0);
  const [monthVisitors, setMonthVisitors] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const docRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile({ ...docSnap.data(), uid: firebaseUser.uid } as UserProfile);
          } else {
            setProfile(null);
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
        try {
          const adminSnap = await getDoc(doc(db, 'admins', firebaseUser.uid));
          setIsAdmin(adminSnap.exists());
        } catch (error) {
          setIsAdmin(false);
        }
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
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
    }, (error) => {
      console.error("Error fetching barbers:", error);
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
      return uid;
    } catch (error) {
      console.error("Registration failed:", error);
      setLoginError(describeAuthError(error));
      throw error;
    }
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
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `appointments/${id}`);
    }
  };

  const updateAppointmentStatus = async (id: string, status: Appointment['status']) => {
    await updateAppointment(id, { status });
  };

  const addReview = async (review: Omit<Review, 'id' | 'createdAt'>) => {
    try {
      const data = {
        ...review,
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'reviews'), data);
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

  // Uploads a CIN or selfie photo to Storage only — does NOT touch Firestore, since
  // the dossier (both file URLs) is written together via submitKycDossier once both
  // uploads finish, keeping the users/{uid} doc free of identity-document links.
  const uploadKycFile = async (file: File, type: 'cin' | 'selfie') => {
    if (!user) return;
    const path = `kyc/${user.uid}/${type}-${Date.now()}-${file.name}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  // Stores the KYC dossier in the private kycSubmissions/{uid} doc, then flips the
  // public kycStatus to 'pending' — only an admin can move it to 'verified' afterward.
  const submitKycDossier = async (cinUrl: string, selfieUrl: string) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'kycSubmissions', user.uid), {
        cinUrl,
        selfieUrl,
        submittedAt: serverTimestamp()
      });
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, { kycStatus: 'pending' });
      setProfile(prev => prev ? { ...prev, kycStatus: 'pending' } : prev);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  // Admin-only actions — enforced server-side by firestore.rules (isAdmin()), these
  // simply fail with a permission error if the caller isn't in the admins/{uid} collection.
  const getKycSubmission = async (barberUid: string) => {
    const snap = await getDoc(doc(db, 'kycSubmissions', barberUid));
    return snap.exists() ? (snap.data() as { cinUrl: string; selfieUrl: string; submittedAt: any }) : null;
  };

  const approveBarberKyc = async (barberUid: string) => {
    await updateDoc(doc(db, 'users', barberUid), { kycStatus: 'verified' });
  };

  const rejectBarberKyc = async (barberUid: string) => {
    await updateDoc(doc(db, 'users', barberUid), { kycStatus: 'unverified' });
  };

  const addPortfolioItem = async (file: File, name: string, price: number, category?: string) => {
    if (!user) return;
    const path = `portfolios/${user.uid}/${Date.now()}-${file.name}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    const item: PortfolioItem = category ? { url, name, price, category, createdAt: Date.now() } : { url, name, price, createdAt: Date.now() };
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
    services,
    barbers,
    dayVisitors,
    monthVisitors,
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
    addReview,
    updateBio,
    updatePhone,
    updateCity,
    uploadAvatar,
    uploadCover,
    uploadKycFile,
    submitKycDossier,
    getKycSubmission,
    approveBarberKyc,
    rejectBarberKyc,
    addPortfolioItem,
    removePortfolioItem,
    updateAvailability,
    updateCategories,
    updateServices,
    getBarberReviews
  };
}
