import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Sun, Moon, AlertTriangle, X, ShieldCheck } from 'lucide-react';
import LandingPage from './components/LandingPage';
import AppMVP from './components/AppMVP';
import RegisterModal from './components/RegisterModal';
import LoginModal from './components/LoginModal';
import ProfilePage from './components/ProfilePage';
import BarberDashboard from './components/BarberDashboard';
import AdminPanel from './components/AdminPanel';
import { useFirebase, Appointment } from './hooks/useFirebase';

type View = 'landing' | 'app' | 'profile' | 'admin';

export default function App() {
  // Previously plain useState, meaning every screen change was invisible to the
  // browser: refreshing always reset to 'landing', and the back button did nothing
  // (no history entries existed to go back to). Now backed by the real History API —
  // the initial value is read from history.state so a refresh restores whatever
  // screen was actually open instead of bouncing to the home page.
  const [view, setView] = useState<View>(() => (window.history.state?.view as View) || 'landing');
  const isFirstViewRender = useRef(true);

  useEffect(() => {
    // Give the very first entry (a fresh page load with no history.state yet) a state
    // object matching the initial view, so navigating back to it later works correctly.
    if (!window.history.state) {
      window.history.replaceState({ view }, '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isFirstViewRender.current) {
      isFirstViewRender.current = false;
      return;
    }
    // Only push a fresh entry when this change didn't already come from the user
    // clicking back/forward (popstate below updates `view` to match history.state,
    // which would otherwise cause this effect to push a duplicate entry).
    if (window.history.state?.view !== view) {
      window.history.pushState({ view }, '');
    }
  }, [view]);

  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      setView((e.state?.view as View) || 'landing');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [hasDismissedRegister, setHasDismissedRegister] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [clientLocation, setClientLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [initialCategory, setInitialCategory] = useState<string | null>(null);
  const [sharedPostId, setSharedPostId] = useState<string | null>(null);
  const [sharedBarberId, setSharedBarberId] = useState<string | null>(null);

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
    deleteAccount,
    updateCity,
    updateAgeRange,
    updateLocation,
    uploadAvatar,
    uploadCover,
    uploadKycFile,
    saveKycFile,
    getAllAppointments,
    adminDeleteAppointment,
    getAppointmentChatForAdmin,
    subscribeToLastChatMessage,
    subscribeToChatReadReceipt,
    markChatAsRead,
    subscribeToChatHidden,
    hideChatForMe,
    subscribeToAppointmentHidden,
    hideAppointmentForMe,
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

  // Every reservation on the platform, refreshed each time the admin opens the panel —
  // so a newly created/updated booking always shows up rather than a stale snapshot.
  useEffect(() => {
    if (view !== 'admin' || !isAdmin) return;
    getAllAppointments().then(setAllAppointments);
  }, [view, isAdmin, getAllAppointments]);

  useEffect(() => {
    // Reset dismissal when user changes or logs out
    if (!user) setHasDismissedRegister(false);
  }, [user]);

  // A "Partager" link (?post=<postId> or ?barber=<uid>) should drop the visitor
  // straight onto that specific post or pro's profile instead of the generic landing
  // page — skip straight to the search view and let AppMVP resolve the id once barbers
  // load.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const postId = params.get('post');
    const barberId = params.get('barber');
    if (postId || barberId) {
      if (postId) setSharedPostId(postId);
      if (barberId) setSharedBarberId(barberId);
      setView('app');
      window.history.replaceState(null, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // A fresh position captured right when a booking is confirmed — deliberately not
  // relying on the possibly-stale/absent `clientLocation` state (only set if the client
  // came in through "Trouver un professionnel autour de moi") so the distance shown to
  // the pro for THIS booking reflects where the client actually was at the time. Never
  // invents a number: absent on refusal/timeout/unsupported, same "no fake data"
  // principle as the rest of the app (see BookingsTab's distance badge).
  const getFreshClientLocation = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
        () => resolve(null),
        { timeout: 5000 }
      );
    });
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
    const freshLocation = await getFreshClientLocation();
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
      clientNotes,
      clientLat: freshLocation?.lat,
      clientLng: freshLocation?.lng
    });
    const apps = await getAppointments(profile?.role || 'client');
    setAppointments(apps);
  };

  // A guest can fill out the whole booking flow before creating an account — first name,
  // email and a real chosen password are asked right before confirming, and double as
  // their registration. Previously the password was auto-generated and never shown,
  // which left the resulting account impossible to log back into — a real bug hit while
  // creating a test account for this exact flow.
  const handleGuestRegisterAndBook = async (
    registerData: { firstName: string; email: string; password: string },
    barberId: string,
    serviceId: string,
    serviceName: string,
    dateTime: Date,
    totalPrice: number,
    clientNotes?: string
  ) => {
    const uid = await registerProfile({
      firstName: registerData.firstName,
      lastName: '',
      gender: 'autre',
      phone: '',
      email: registerData.email,
      role: 'client',
      password: registerData.password
    });
    if (!uid) return;
    const freshLocation = await getFreshClientLocation();
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
      clientNotes,
      clientLat: freshLocation?.lat,
      clientLng: freshLocation?.lng
    });
  };

  const handleBookBarber = async (barberId: string, item: { name: string; price: number }, dateTime: Date, note?: string) => {
    if (!user || barberId === user.uid) return;
    const freshLocation = await getFreshClientLocation();
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
      clientNotes: note,
      clientLat: freshLocation?.lat,
      clientLng: freshLocation?.lng
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

  // getAllAppointments is a one-time fetch, not a live subscription — refetching the
  // whole platform after every single delete would be wasteful, so this just filters the
  // deleted id out of local state instead.
  const handleAdminDeleteAppointment = async (id: string) => {
    await adminDeleteAppointment(id);
    setAllAppointments(prev => prev.filter(a => a.id !== id));
  };

  // Live count of items actually waiting on an admin (new KYC dossier, commission owed)
  // — `barbers` is kept fresh via onSnapshot, so this updates the moment a pro submits
  // their CIN/selfie, without the admin needing to open the panel to find out.
  const pendingAdminActionsCount = useMemo(
    () => barbers.filter(b => b.kycStatus === 'pending').length + barbers.filter(b => (b.unpaidCommissionsCount || 0) > 0).length,
    [barbers]
  );

  const renderCurrentView = () => {
    if (view === 'admin' && isAdmin) {
      return (
        <AdminPanel
          barbers={barbers}
          allAppointments={allAppointments}
          onRefreshAppointments={() => getAllAppointments().then(setAllAppointments)}
          theme={theme}
          onClose={() => setView('landing')}
          getKycSubmission={getKycSubmission}
          approveBarberKyc={approveBarberKyc}
          rejectBarberKyc={rejectBarberKyc}
          settleCommission={settleCommission}
          getAppointmentChatForAdmin={getAppointmentChatForAdmin}
          onDeleteAppointment={handleAdminDeleteAppointment}
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
          onAddReview={addReview}
          onLogout={() => setView('landing')}
          onLogoutFirebase={handleLogoutAll}
          theme={theme}
          onUpdateBio={updateBio}
          onUpdatePhone={updatePhone}
          onDeleteAccount={deleteAccount}
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
          onSaveKycFile={saveKycFile}
          onGetKycSubmission={getKycSubmission}
          onGetBarberReviews={getBarberReviews}
          onIncrementProfileView={incrementProfileView}
          onFetchLikeState={getPostLikeState}
          onToggleLike={toggleLike}
          barbersLoading={barbersLoading}
          subscribeToLastChatMessage={subscribeToLastChatMessage}
          subscribeToChatReadReceipt={subscribeToChatReadReceipt}
          markChatAsRead={markChatAsRead}
          subscribeToChatHidden={subscribeToChatHidden}
          hideChatForMe={hideChatForMe}
          subscribeToAppointmentHidden={subscribeToAppointmentHidden}
          hideAppointmentForMe={hideAppointmentForMe}
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
        sharedPostId={sharedPostId}
        sharedBarberId={sharedBarberId}
        subscribeToLastChatMessage={subscribeToLastChatMessage}
        subscribeToChatReadReceipt={subscribeToChatReadReceipt}
        markChatAsRead={markChatAsRead}
        subscribeToChatHidden={subscribeToChatHidden}
        hideChatForMe={hideChatForMe}
        subscribeToAppointmentHidden={subscribeToAppointmentHidden}
        hideAppointmentForMe={hideAppointmentForMe}
        onUpdatePhone={updatePhone}
        onDeleteAccount={deleteAccount}
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
            <span className="text-gold">Baber</span>Go
          </div>
          <div className="w-7 h-7 border-2 border-gold/25 border-t-gold rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'}`}>
      {renderCurrentView()}

      {/* Accès admin — visible uniquement pour les comptes listés dans admins/{uid}.
          Le badge rouge signale en temps réel un nouveau dossier KYC ou une commission
          due, sans avoir à ouvrir le panneau pour le découvrir. */}
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
          {pendingAdminActionsCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
              {pendingAdminActionsCount > 99 ? '99+' : pendingAdminActionsCount}
            </span>
          )}
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
        onSwitchToLogin={() => {
          setIsRegisterOpen(false);
          setHasDismissedRegister(true);
          setIsLoginOpen(true);
        }}
        theme={theme}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLogin={handleLoginSubmit}
        onResetPassword={resetPassword}
        onSwitchToRegister={() => {
          setIsLoginOpen(false);
          handleRegisterClick();
        }}
        theme={theme}
      />
    </div>
  );
}
