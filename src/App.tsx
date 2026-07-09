import React, { useState, useEffect } from 'react';
import { Sun, Moon, AlertTriangle, X } from 'lucide-react';
import LandingPage from './components/LandingPage';
import AppMVP from './components/AppMVP';
import RegisterModal from './components/RegisterModal';
import LoginModal from './components/LoginModal';
import ProfilePage from './components/ProfilePage';
import BarberDashboard from './components/BarberDashboard';
import { useFirebase, Appointment } from './hooks/useFirebase';

export default function App() {
  const [view, setView] = useState<'landing' | 'app' | 'profile'>('landing');
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [registerRole, setRegisterRole] = useState<'client' | 'barber'>('client');
  const [hasDismissedRegister, setHasDismissedRegister] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clientLocation, setClientLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [initialCategory, setInitialCategory] = useState<string | null>(null);

  const {
    user,
    profile,
    loading,
    services,
    barbers,
    loginWithEmail,
    loginError,
    clearLoginError,
    logout,
    registerProfile,
    getAppointments,
    createAppointment,
    updateAppointment,
    updateAppointmentStatus,
    updateBio,
    updatePhone,
    updateCity,
    uploadAvatar,
    uploadCover,
    addPortfolioItem,
    removePortfolioItem,
    updateAvailability,
    updateCategories,
    addReview
  } = useFirebase();

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  // Fetch appointments relative to the role
  useEffect(() => {
    const fetchApps = async () => {
      if (profile) {
        const apps = await getAppointments(profile.role);
        setAppointments(apps);
      }
    };
    fetchApps();
  }, [profile, getAppointments]);

  useEffect(() => {
    // Reset dismissal when user changes or logs out
    if (!user) setHasDismissedRegister(false);
  }, [user]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Only used to estimate the distance between the client and each barber in the
  // search results — never displayed on a map or shared with anyone else.
  const handleFindNearby = () => {
    setInitialCategory(null);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setClientLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
          setView('app');
        },
        () => setView('app') // On continue même si la permission est refusée ou indisponible
      );
    } else {
      setView('app');
    }
  };

  // Jumping into the search from one of the landing page's category chips — same
  // geolocation-for-distance-only flow as "Trouver un coiffeur", pre-filtered.
  const handleSelectCategory = (categoryId: string) => {
    setInitialCategory(categoryId);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setClientLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
          setView('app');
        },
        () => setView('app')
      );
    } else {
      setView('app');
    }
  };

  const handleRegisterClick = (role: 'client' | 'barber' = 'client') => {
    setRegisterRole(role);
    setHasDismissedRegister(false); // Re-allow opening manually
    setIsRegisterOpen(true);
  };

  const handleLoginClick = () => {
    setIsLoginOpen(true);
  };

  const handleLoginSubmit = async (email: string, password: string) => {
    const success = await loginWithEmail(email, password);
    if (success) {
      setView('app');
    }
    return success;
  };

  const handleRegisterSuccess = async (data: any) => {
    await registerProfile(data);
    setIsRegisterOpen(false);
    setHasDismissedRegister(false);
    setView('profile'); // Redirige vers la page de profil après l'inscription
  };

  const handleLogoutAll = async () => {
    await logout();
    setView('landing');
  };

  const handleCreateAnnonce = async (
    serviceId: string, 
    dateTime: Date, 
    totalPrice: number, 
    proposedPrice?: number, 
    clientNotes?: string,
    targetBarberId?: string
  ) => {
    if (!user) return;
    await createAppointment({
      clientId: user.uid,
      clientName: profile ? `${profile.firstName} ${profile.lastName}` : 'Client Anonyme',
      barberId: targetBarberId || 'dummy_barber',
      serviceId,
      dateTime,
      totalPrice,
      proposedPrice,
      negotiationStatus: 'client_proposed',
      clientNotes
    });
    const apps = await getAppointments(profile?.role || 'client');
    setAppointments(apps);
  };

  const handleClientBook = async (
    barberId: string,
    serviceId: string,
    dateTime: Date,
    totalPrice: number,
    proposedPrice?: number,
    clientNotes?: string
  ) => {
    if (!user) return;
    await createAppointment({
      clientId: user.uid,
      clientName: profile ? `${profile.firstName} ${profile.lastName}` : 'Client Anonyme',
      clientGender: profile?.gender,
      barberId,
      serviceId,
      dateTime,
      totalPrice,
      proposedPrice,
      negotiationStatus: 'client_proposed',
      clientNotes
    });
    const apps = await getAppointments(profile?.role || 'client');
    setAppointments(apps);
  };

  // A guest can fill out the whole booking flow before creating an account — the
  // account (email + password) is only required at the very last step, right before
  // confirming, so it doubles as their registration.
  const handleGuestRegisterAndBook = async (
    registerData: { firstName: string; lastName: string; gender: 'homme' | 'femme' | 'autre'; phone: string; email: string; password: string },
    barberId: string,
    serviceId: string,
    dateTime: Date,
    totalPrice: number,
    clientNotes?: string
  ) => {
    const uid = await registerProfile({ ...registerData, role: 'client' });
    if (!uid) return;
    await createAppointment({
      clientId: uid,
      clientName: `${registerData.firstName} ${registerData.lastName}`,
      clientGender: registerData.gender,
      barberId,
      serviceId,
      dateTime,
      totalPrice,
      negotiationStatus: 'client_proposed',
      clientNotes
    });
  };

  const handleBookBarber = async (barberId: string, item: { name: string; price: number }, dateTime: Date, note?: string) => {
    if (!user) return;
    await createAppointment({
      clientId: user.uid,
      clientName: profile ? `${profile.firstName} ${profile.lastName}` : 'Client Anonyme',
      clientGender: profile?.gender,
      barberId,
      serviceId: `custom-${Date.now()}`,
      serviceName: item.name,
      dateTime,
      totalPrice: item.price,
      clientNotes: note
    });
    const apps = await getAppointments(profile?.role || 'client');
    setAppointments(apps);
  };

  const handleUpdateAppointment = async (id: string, updates: Partial<Appointment>) => {
    const updatedPayload = { ...updates };
    if (profile?.role === 'barber') {
      const appToUpdate = appointments.find(a => a.id === id);
      if (appToUpdate && appToUpdate.barberId === 'dummy_barber') {
        updatedPayload.barberId = profile.uid;
      }
    }
    await updateAppointment(id, updatedPayload);
    if (profile) {
      const apps = await getAppointments(profile.role);
      setAppointments(apps);
    }
  };

  const handleUpdateAppointmentStatus = async (id: string, status: Appointment['status']) => {
    const updates: Partial<Appointment> = { status };
    if (profile?.role === 'barber') {
      const appToUpdate = appointments.find(a => a.id === id);
      if (appToUpdate && appToUpdate.barberId === 'dummy_barber') {
        updates.barberId = profile.uid;
      }
    }
    await updateAppointment(id, updates);
    // Refresh local state
    if (profile) {
      const apps = await getAppointments(profile.role);
      setAppointments(apps);
    }
  };

  const renderCurrentView = () => {
    if (view === 'landing') {
      return (
        <LandingPage
          onLogin={handleLoginClick}
          theme={theme}
          profile={profile}
          onEnterApp={() => setView('app')}
          onRegisterOpen={handleRegisterClick}
          onFindNearby={handleFindNearby}
          onSelectCategory={handleSelectCategory}
        />
      );
    }

    if (view === 'profile' && profile) {
      return (
        <ProfilePage 
          profile={profile}
          onContinue={() => setView('app')}
          onLogout={handleLogoutAll}
          theme={theme}
          services={services}
          barbers={barbers}
          onCreateAnnonce={handleCreateAnnonce}
        />
      );
    }

    // Role-based routing for the main application
    if (profile?.role === 'barber') {
      return (
        <BarberDashboard
          profile={profile}
          barbers={barbers}
          appointments={appointments}
          services={services}
          onUpdateStatus={handleUpdateAppointmentStatus}
          onUpdateAppointment={handleUpdateAppointment}
          onLogout={handleLogoutAll}
          theme={theme}
          onUpdateBio={updateBio}
          onUpdatePhone={updatePhone}
          onUpdateCity={updateCity}
          onUploadAvatar={uploadAvatar}
          onUploadCover={uploadCover}
          onAddPortfolioItem={addPortfolioItem}
          onRemovePortfolioItem={removePortfolioItem}
          onUpdateAvailability={updateAvailability}
          onUpdateCategories={updateCategories}
          onBookBarber={handleBookBarber}
        />
      );
    }

    return (
      <AppMVP
        onLogout={() => setView('landing')}
        theme={theme}
        profile={profile}
        onLogoutFirebase={handleLogoutAll}
        clientLocation={clientLocation}
        appointments={appointments}
        onUpdateStatus={handleUpdateAppointmentStatus}
        onUpdateAppointment={handleUpdateAppointment}
        onAddReview={addReview}
        onClientBook={handleClientBook}
        onGuestRegisterAndBook={handleGuestRegisterAndBook}
        initialCategory={initialCategory}
        onLogin={handleLoginClick}
      />
    );
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'}`}>
      {renderCurrentView()}

      {/* Toggle de thème toujours accessible, sur toutes les pages */}
      <button
        onClick={toggleTheme}
        aria-label="Changer de thème"
        title={theme === 'dark' ? 'Passer au mode clair' : 'Passer au mode sombre'}
        className={`fixed z-[100] p-2.5 rounded-full shadow-lg backdrop-blur-md transition-colors ${
          view === 'landing' || (view === 'app' && profile?.role !== 'barber') ? 'top-4 right-4 md:right-8' : 'top-3 left-3'
        } ${theme === 'dark' ? 'bg-white/10 text-gold hover:bg-white/20' : 'bg-black/10 text-gold hover:bg-black/20'}`}
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Visible feedback when Google sign-in fails, instead of failing silently */}
      {loginError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-2rem)] max-w-md bg-red-950 border border-red-500/40 text-white rounded-sm shadow-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed flex-1">{loginError}</p>
          <button onClick={clearLoginError} className="text-red-300 hover:text-white shrink-0" aria-label="Fermer">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Auto-open register if logged in but no profile, unless dismissed */}
      <RegisterModal
        isOpen={isRegisterOpen || (!!user && !profile && !loading && !hasDismissedRegister)}
        onClose={() => {
          setIsRegisterOpen(false);
          setHasDismissedRegister(true);
          setView('landing');
        }}
        onRegister={handleRegisterSuccess}
        theme={theme}
        defaultRole={registerRole}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLogin={handleLoginSubmit}
        theme={theme}
      />
    </div>
  );
}
