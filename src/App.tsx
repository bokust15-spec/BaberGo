import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import LandingPage from './components/LandingPage';
import AppMVP from './components/AppMVP';
import RegisterModal from './components/RegisterModal';
import ProfilePage from './components/ProfilePage';
import BarberDashboard from './components/BarberDashboard';
import { useFirebase, Appointment } from './hooks/useFirebase';

export default function App() {
  const [view, setView] = useState<'landing' | 'app' | 'profile'>('landing');
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [registerRole, setRegisterRole] = useState<'client' | 'barber'>('client');
  const [hasDismissedRegister, setHasDismissedRegister] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  
  const { 
    user, 
    profile, 
    loading, 
    services, 
    barbers,
    loginWithGoogle, 
    logout, 
    registerProfile,
    getAppointments,
    createAppointment,
    updateAppointment,
    updateAppointmentStatus
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

  const handleFindNearby = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => setView('app'),
        () => setView('app') // On continue même si la permission est refusée ou indisponible
      );
    } else {
      setView('app');
    }
  };

  const handleRegisterClick = async (role: 'client' | 'barber' = 'client') => {
    setRegisterRole(role);
    setHasDismissedRegister(false); // Re-allow opening manually
    if (!user) {
      await loginWithGoogle();
    } else {
      setIsRegisterOpen(true);
    }
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
          onLogin={loginWithGoogle}
          theme={theme}
          onRegisterOpen={handleRegisterClick}
          onFindNearby={handleFindNearby}
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
          appointments={appointments}
          services={services}
          onUpdateStatus={handleUpdateAppointmentStatus}
          onUpdateAppointment={handleUpdateAppointment}
          onLogout={handleLogoutAll}
          theme={theme}
        />
      );
    }

    return (
      <AppMVP
        onLogout={() => setView('landing')}
        theme={theme}
        profile={profile}
        onLogoutFirebase={handleLogoutAll}
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
          view === 'landing' ? 'top-4 right-4 md:right-8' : 'bottom-6 right-6'
        } ${theme === 'dark' ? 'bg-white/10 text-gold hover:bg-white/20' : 'bg-black/10 text-gold hover:bg-black/20'}`}
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

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
    </div>
  );
}
