import { useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
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
  arrayRemove
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, db, storage, handleFirestoreError, OperationType } from '../lib/firebase';

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
  unpaidCommissionsCount?: number;
  totalCommissionsOwed?: number;
  bio?: string;
  portfolioPhotos?: string[];
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
  serviceName?: string;
  proposedPrice?: number;
  counterPriceByBarber?: number;
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

export function useFirebase() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<UserProfile[]>([]);

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
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Seed services if none exist (for demo)
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'services'));
        const servicesList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
        
        if (servicesList.length === 0) {
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
        } else {
          setServices(servicesList);
        }
      } catch (error) {
        console.error("Error with services:", error);
      }
    };

    const fetchBarbers = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'barber'));
        const querySnapshot = await getDocs(q);
        const barbersList = querySnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile));
        
        if (barbersList.length === 0) {
          const defaultBarbers = [
            { firstName: 'Karim', lastName: 'El Fassi', gender: 'homme', phone: '0612345678', email: 'karim@barbergo.ma', role: 'barber', createdAt: serverTimestamp() },
            { firstName: 'Nadia', lastName: 'Bennani', gender: 'femme', phone: '0612345679', email: 'nadia@barbergo.ma', role: 'barber', createdAt: serverTimestamp() },
            { firstName: 'Yassine', lastName: 'Ouali', gender: 'homme', phone: '0612345680', email: 'yassine@barbergo.ma', role: 'barber', createdAt: serverTimestamp() },
            { firstName: 'Fatima', lastName: 'Zouak', gender: 'femme', phone: '0612345681', email: 'fatima@barbergo.ma', role: 'barber', createdAt: serverTimestamp() },
          ];
          for (const b of defaultBarbers) {
            await setDoc(doc(db, 'users', b.email.split('@')[0]), b);
          }
          const reSnapshot = await getDocs(q);
          setBarbers(reSnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile)));
        } else {
          setBarbers(barbersList);
        }
      } catch (error) {
        console.error("Error fetching barbers:", error);
      }
    };

    if (user) {
      fetchServices();
      fetchBarbers();
    }
  }, [user]);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const registerProfile = async (data: Omit<UserProfile, 'uid' | 'createdAt'>) => {
    if (!user) return;
    
    const profileData = {
      ...data,
      createdAt: serverTimestamp(),
    };

    try {
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, profileData);
      setProfile({ ...profileData, uid: user.uid, createdAt: new Date() } as UserProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
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

  const uploadPortfolioPhoto = async (file: File) => {
    if (!user) return;
    const path = `portfolios/${user.uid}/${Date.now()}-${file.name}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    const docRef = doc(db, 'users', user.uid);
    await updateDoc(docRef, { portfolioPhotos: arrayUnion(url) });
    setProfile(prev => prev ? { ...prev, portfolioPhotos: [...(prev.portfolioPhotos || []), url] } : prev);
    return url;
  };

  const deletePortfolioPhoto = async (url: string) => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid);
    await updateDoc(docRef, { portfolioPhotos: arrayRemove(url) });
    setProfile(prev => prev ? { ...prev, portfolioPhotos: (prev.portfolioPhotos || []).filter(p => p !== url) } : prev);
    try {
      await deleteObject(ref(storage, url));
    } catch {
      // Photo may already be gone from storage; the Firestore reference removal above is what matters.
    }
  };

  return {
    user,
    profile,
    loading,
    services,
    barbers,
    loginWithGoogle,
    logout,
    registerProfile,
    createAppointment,
    getAppointments,
    updateAppointment,
    updateAppointmentStatus,
    addReview,
    updateBio,
    uploadPortfolioPhoto,
    deletePortfolioPhoto,
    getBarberReviews
  };
}
