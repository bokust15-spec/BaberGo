import React, { useState, useEffect } from 'react';
import { Sun, Moon, AlertTriangle, X, ShieldCheck } from 'lucide-react';
import LandingPage from './components/LandingPage';
import AppMVP from './components/AppMVP';
import RegisterModal from './components/RegisterModal';
import LoginModal from './components/LoginModal';
import ProfilePage from './components/ProfilePage';
import BarberDashboard from './components/BarberDashboard';
import AdminPanel from './components/AdminPanel';
import { useFirebase, Appointment } from './hooks/useFirebase';

export default function App() {
  const [view, setView] = useState<'landing' | 'app' | 'profile' | 'admin'>('landing');
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [hasDismissedRegister, setHasDismissedRegister] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clientLocation, setClientLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [initialCategory, setInitialCategory] = useState<string | null>(null);

  const {
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
    updateAgeRange,
    updateLocation,
    uploadAvatar,
    uploadCover,
    uploadKycFile,
    submitKycDossier,
    getKycSubmission,
    approveBarberKyc,
    rejectBarberKyc,
    settleCommission,
    addPortfolioItem,
    removePortfolioItem,
    updateAvailability,
    updateCategories,
    updateServices,
    addReview,
    getBarberReviews,
    incrementProfileView,
    getPostLikeState,
    toggleLike
  } = useFirebase();

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  // Auto-dismiss the login/register error toast after a few seconds, in addition to
  // the manual close button — it had no way to go away on its own before.
  useEffect(() => {
    if (!loginError) return;
    const timer = setTimeout(() => clearLoginError(), 6000);
    return () => clearTimeout(timer);
    // clearLoginError is a fresh function identity every render (defined inline in
    // useFirebase's return object) — depending on it would reset this timer on every
    // re-render before it ever fires, so intentionally track loginError's value only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loginError]);

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

  const handleRegisterClick = () => {
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
      clientEmail: profile?.email,
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
    serviceName: string,
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
      clientEmail: profile?.email,
      barberId,
      serviceId,
      serviceName,
      dateTime,
      totalPrice,
      proposedPrice,
      negotiationStatus: 'client_proposed',
      clientNotes
    });
    const apps = await getAppointments(profile?.role || 'client');
    setAppointments(apps);
  };

  // A guest can fill out the whole booking flow before creating an account — only a
  // first name and email are asked, right before confirming, and double as their
  // registration (a random password is generated behind the scenes).
  const handleGuestRegisterAndBook = async (
    registerData: { firstName: string; email: string },
    barberId: string,
    serviceId: string,
    serviceName: string,
    dateTime: Date,
    totalPrice: number,
    clientNotes?: string
  ) => {
    const password = Math.random().toString(36).slice(-10) + Date.now().toString(36);
    const uid = await registerProfile({
      firstName: registerData.firstName,
      lastName: '',
      gender: 'autre',
      phone: '',
      email: registerData.email,
      role: 'client',
      password
    });
    if (!uid) return;
    await createAppointment({
      clientId: uid,
      clientName: registerData.firstName,
      clientGender: 'autre',
      clientEmail: registerData.email,
      barberId,
      serviceId,
      serviceName,
      dateTime,
      totalPrice,
      negotiationStatus: 'client_proposed',
      clientNotes
    });
  };

  const handleBookBarber = async (barberId: string, item: { name: string; price: number }, dateTime: Date, note?: string) => {
    if (!user || barberId === user.uid) return;
    await createAppointment({
      clientId: user.uid,
      clientName: profile ? `${profile.firstName} ${profile.lastName}` : 'Client Anonyme',
      clientGender: profile?.gender,
      clientEmail: profile?.email,
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
    if (view === 'admin' && isAdmin) {
      return (
        <AdminPanel
          barbers={barbers}
          theme={theme}
          onClose={() => setView('landing')}
          getKycSubmission={getKycSubmission}
          approveBarberKyc={approveBarberKyc}
          rejectBarberKyc={rejectBarberKyc}
          settleCommission={settleCommission}
        />
      );
    }

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
          dayVisitors={dayVisitors}
          monthVisitors={monthVisitors}
          totalPros={barbers.length}
          totalUsers={totalUsers}
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
          onLogout={() => setView('landing')}
          onLogoutFirebase={handleLogoutAll}
          theme={theme}
          onUpdateBio={updateBio}
          onUpdatePhone={updatePhone}
          onUpdateCity={updateCity}
          onUpdateAgeRange={updateAgeRange}
          onUpdateLocation={updateLocation}
          onUploadAvatar={uploadAvatar}
          onUploadCover={uploadCover}
          onAddPortfolioItem={addPortfolioItem}
          onRemovePortfolioItem={removePortfolioItem}
          onUpdateAvailability={updateAvailability}
          onUpdateCategories={updateCategories}
          onUpdateServices={updateServices}
          onBookBarber={handleBookBarber}
          onUploadKycFile={uploadKycFile}
          onSubmitKycDossier={submitKycDossier}
          onGetBarberReviews={getBarberReviews}
          onIncrementProfileView={incrementProfileView}
          onFetchLikeState={getPostLikeState}
          onToggleLike={toggleLike}
          barbersLoading={barbersLoading}
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
        onGetBarberReviews={getBarberReviews}
        onIncrementProfileView={incrementProfileView}
        onFetchLikeState={getPostLikeState}
        onToggleLike={toggleLike}
        barbersLoading={barbersLoading}
      />
    );
  };

  // A short branded splash while Firebase resolves whether someone's signed in — avoids
  // flashing the generic landing page and then jumping to the personalized "Salut, X"
  // hero a beat later once the profile loads.
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${theme === 'dark' ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="flex flex-col items-center gap-5">
          <div className="font-bebas text-3xl tracking-[0.2em] uppercase">
            <span className="text-gold">Barber</span>Go
          </div>
          <div className="w-7 h-7 border-2 border-gold/25 border-t-gold rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'}`}>
      {renderCurrentView()}

      {/* Accès admin — visible uniquement pour les comptes listés dans admins/{uid} */}
      {isAdmin && view !== 'admin' && (
        <button
          onClick={() => setView('admin')}
          aria-label="Panneau admin"
          title="Panneau admin"
          className={`fixed z-[100] p-2.5 rounded-full shadow-lg backdrop-blur-md transition-colors ${
            view === 'landing' || (view === 'app' && profile?.role !== 'barber') ? 'top-4 right-16 md:right-24' : 'top-3 left-14'
          } ${theme === 'dark' ? 'bg-white/10 text-gold hover:bg-white/20' : 'bg-black/10 text-gold hover:bg-black/20'}`}
        >
          <ShieldCheck size={18} />
        </button>
      )}

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

      {/* Auto-open register if logged in but no profile, unless dismissed. Gated on
          !profileFetchError so a failed profile read (network/App Check hiccup) never
          gets mistaken for "this account has no profile" and shows the signup form to
          an existing user. */}
      <RegisterModal
        isOpen={isRegisterOpen || (!!user && !profile && !loading && !profileFetchError && !hasDismissedRegister)}
        onClose={() => {
          setIsRegisterOpen(false);
          setHasDismissedRegister(true);
          setView('landing');
        }}
        onRegister={handleRegisterSuccess}
        theme={theme}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLogin={handleLoginSubmit}
        onResetPassword={resetPassword}
        theme={theme}
      />
    </div>
  );
}
