import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart3,
  Calendar,
  Users,
  Settings,
  Bell,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Scissors,
  LogOut,
  MapPin,
  Shield,
  FileText,
  AlertTriangle,
  Check,
  DollarSign,
  Flag,
  Phone,
  HelpCircle,
  TrendingUp,
  X,
  Upload,
  Trash2,
  Compass
} from 'lucide-react';
import { Appointment, UserProfile, Service } from '../hooks/useFirebase';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface BarberDashboardProps {
  profile: UserProfile;
  barbers: UserProfile[];
  appointments: Appointment[];
  services: Service[];
  onUpdateStatus: (id: string, status: Appointment['status']) => Promise<void>;
  onUpdateAppointment?: (id: string, updates: Partial<Appointment>) => Promise<void>;
  onLogout: () => void;
  theme: 'dark' | 'light';
  onUpdateBio: (bio: string) => Promise<void>;
  onUpdatePhone: (phone: string) => Promise<void>;
  onUploadPhoto: (file: File) => Promise<string | undefined>;
  onDeletePhoto: (url: string) => Promise<void>;
}

export default function BarberDashboard({
  profile,
  barbers,
  appointments,
  services,
  onUpdateStatus,
  onUpdateAppointment,
  onLogout,
  theme,
  onUpdateBio,
  onUpdatePhone,
  onUploadPhoto,
  onDeletePhoto
}: BarberDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'map' | 'schedule' | 'clients' | 'discover'>('overview');
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [kycCinLoaded, setKycCinLoaded] = useState(false);
  const [kycSelfieLoaded, setKycSelfieLoaded] = useState(false);
  const [submittingKyc, setSubmittingKyc] = useState(false);
  const [reportingAppId, setReportingAppId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportedApps, setReportedApps] = useState<Record<string, boolean>>({});
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [viewingBarber, setViewingBarber] = useState<UserProfile | null>(null);
  const [phoneInput, setPhoneInput] = useState(profile.phone || '');
  const [savingPhone, setSavingPhone] = useState(false);

  // Stats
  const pendingCount = appointments.filter(a => a.status === 'pending').length;
  const todayCount = appointments.filter(a => {
    const date = a.dateTime instanceof Date ? a.dateTime : a.dateTime.toDate();
    return date.toDateString() === new Date().toDateString();
  }).length;
  
  const totalRevenue = appointments
    .filter(a => a.status === 'completed')
    .reduce((sum, a) => sum + a.totalPrice, 0);

  const getServiceName = (id: string) => services.find(s => s.id === id)?.name || 'Service Inconnu';

  // State variables for profile updates offline/simulation
  const kycStatus = profile.kycStatus || 'unverified';
  const unpaidCount = profile.unpaidCommissionsCount || 0;
  const commissionsOwed = profile.totalCommissionsOwed || 0;
  const isBlockedByCommissions = unpaidCount > 3;
  const hasPhone = !!profile.phone;
  // Phone + KYC (CIN/selfie) must be completed before accepting a booking
  const profileIncomplete = !hasPhone || kycStatus !== 'verified';

  const handleSavePhone = async () => {
    if (!phoneInput.trim()) return;
    setSavingPhone(true);
    try {
      await onUpdatePhone(phoneInput.trim());
    } catch (e) {
      console.error('Error updating phone:', e);
    }
    setSavingPhone(false);
  };

  // Local handler to update user profile in Firestore
  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    try {
      const ref = doc(db, 'users', profile.uid);
      await updateDoc(ref, updates);
      // Reload page to refresh context
      window.location.reload();
    } catch (e) {
      console.error("Error updating profile: ", e);
    }
  };

  // Simulate payment of commission due
  const handlePayBalance = async () => {
    setIsPaying(true);
    setTimeout(async () => {
      await handleUpdateProfile({
        unpaidCommissionsCount: 0,
        totalCommissionsOwed: 0
      });
      setIsPaying(false);
      setShowPayModal(false);
    }, 1500);
  };

  // Simulate submitting files for KYC approval
  const handleUploadKycFiles = async () => {
    setSubmittingKyc(true);
    setTimeout(async () => {
      await handleUpdateProfile({
        kycStatus: 'pending',
        kycCinUrl: 'https://barbergo.ma/simulated/cnie_maroc.jpg',
        kycSelfieUrl: 'https://barbergo.ma/simulated/selfie_maroc.jpg'
      });
      setSubmittingKyc(false);
    }, 1500);
  };

  // Simulate admin validation bypass
  const handleSimulateAdminApprove = async () => {
    await handleUpdateProfile({
      kycStatus: 'verified'
    });
  };

  // Report Client submit
  const handleReportClientSubmit = (appId: string) => {
    setReportedApps(prev => ({ ...prev, [appId]: true }));
    setReportingAppId(null);
    setReportReason('');
  };

  // Check if upcoming sessions contains completed trigger to increment commission
  const handleTriggerCompleteWithCommission = async (app: Appointment) => {
    if (!onUpdateAppointment) return;
    
    // Calculate 8% commission
    const commission = Math.round(app.totalPrice * 0.08);
    const newUnpaidCount = unpaidCount + 1;
    const newOwed = commissionsOwed + commission;

    await onUpdateAppointment(app.id, {
      status: 'completed'
    });

    await handleUpdateProfile({
      unpaidCommissionsCount: newUnpaidCount,
      totalCommissionsOwed: newOwed
    });
  };

  return (
    <div className={`min-h-screen pt-20 flex flex-col font-dm-sans transition-colors duration-300 ${theme === 'dark' ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'}`}>
      
      {/* Dashboard Nav */}
      <nav className={`fixed top-0 left-0 right-0 z-40 border-b px-6 py-4 flex items-center justify-between backdrop-blur-md ${theme === 'dark' ? 'bg-black/80 border-gold/20' : 'bg-white/80 border-gray-200 shadow-sm'}`}>
        <div className="flex items-center gap-6">
          <div className="logo text-2xl text-gold font-bebas tracking-widest leading-none">Partners<span className="text-white">Pro</span></div>
          <div className="hidden md:flex gap-4">
            {(['overview', 'map', 'schedule', 'clients', 'discover'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 transition-all relative ${activeTab === tab ? 'text-gold font-bold' : 'text-warm-gray hover:text-white'}`}
              >
                {tab === 'overview' ? 'Tableau de bord' : tab === 'map' ? 'Carte des Annonces' : tab === 'schedule' ? 'Agenda' : tab === 'clients' ? 'Base Clients' : 'Découvrir'}
                {tab === 'map' && appointments.filter(a => a.barberId === 'dummy_barber' && a.status === 'pending').length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75 animate-pulse"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Status Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest bg-black/40 border border-white/5">
            {kycStatus === 'verified' ? (
              <span className="text-emerald-400 inline-flex items-center gap-1"><Shield size={10} /> KYC Actif</span>
            ) : kycStatus === 'pending' ? (
              <span className="text-amber-400 inline-flex items-center gap-1"><Clock size={10} /> KYC En Attente</span>
            ) : (
              <span className="text-red-400 inline-flex items-center gap-1"><AlertTriangle size={10} /> KYC Manquant</span>
            )}
          </div>

          <div className="flex flex-col items-end hidden sm:block">
            <span className="text-xs font-bold uppercase tracking-widest">{profile.firstName} {profile.lastName}</span>
            <span className="text-[10px] text-gold uppercase tracking-tighter">Coiffeur Casablanca</span>
          </div>
          <button onClick={onLogout} className="p-2 rounded-full border border-white/10 text-warm-gray hover:text-red-400 transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        
        {/* BANNER KYC ATTENTION */}
        {profileIncomplete && (
          <div className={`mb-8 p-6 rounded-sm border ${theme === 'dark' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'} space-y-4`}>
            <div className="flex items-start gap-4">
              <AlertTriangle className="text-amber-500 mt-1 shrink-0 animate-pulse" size={24} />
              <div>
                <h3 className="font-bebas text-lg tracking-wider text-amber-500 uppercase">Attention - Profil incomplet (téléphone + KYC requis)</h3>
                <p className="text-xs text-warm-gray leading-relaxed max-w-3xl">
                  Conformément à la réglementation de sécurité de BarberGo (Maroc), vous devez renseigner votre numéro de téléphone et constituer votre dossier (CIN + Selfie) pour valider votre profil. Vous ne pourrez accepter de rendez-vous avec les clients qu'après avoir complété ces informations.
                </p>
              </div>
            </div>

            {!hasPhone && (
              <div className="pt-2 space-y-2">
                <span className="text-[9px] text-warm-gray uppercase font-bold block">Numéro de téléphone</span>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="+212 6 XX XX XX XX"
                    className={`flex-1 px-4 py-2.5 text-xs outline-none rounded-sm border ${theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                  />
                  <button
                    onClick={handleSavePhone}
                    disabled={savingPhone || !phoneInput.trim()}
                    className="px-5 py-2.5 bg-gold text-black text-[10px] uppercase font-bold tracking-widest hover:bg-gold-light rounded-sm disabled:opacity-40 font-sans shrink-0"
                  >
                    {savingPhone ? 'Enregistrement...' : 'Enregistrer mon numéro'}
                  </button>
                </div>
              </div>
            )}

            {kycStatus === 'unverified' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <button
                  onClick={() => setKycCinLoaded(true)}
                  className={`p-4 border border-dashed rounded-sm text-left flex items-center justify-between text-xs transition-colors ${
                    kycCinLoaded ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'border-white/10 hover:border-gold/30 text-warm-gray'
                  }`}
                >
                  <span>{kycCinLoaded ? '✔ CIN_Maroc_Recto_Verso.jpg chargé' : '📁 Téléverser une copie de votre CIN Maroc'}</span>
                </button>
                <button
                  onClick={() => setKycSelfieLoaded(true)}
                  className={`p-4 border border-dashed rounded-sm text-left flex items-center justify-between text-xs transition-colors ${
                    kycSelfieLoaded ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'border-white/10 hover:border-gold/30 text-warm-gray'
                  }`}
                >
                  <span>{kycSelfieLoaded ? '✔ Selfie_Live_Verif.jpg chargé' : '📁 Prendre un Selfie de validation de sécurité'}</span>
                </button>
                {kycCinLoaded && kycSelfieLoaded && (
                  <button
                    onClick={handleUploadKycFiles}
                    disabled={submittingKyc}
                    className="md:col-span-2 py-3 bg-gold text-black text-[10px] uppercase font-bold tracking-widest hover:bg-gold-light rounded-sm flex items-center justify-center gap-1.5 font-sans"
                  >
                    {submittingKyc ? "Enregistrement en cours..." : "Soumettre mon dossier d'identité"}
                  </button>
                )}
              </div>
            ) : (
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-4 bg-amber-500/5 p-4 rounded-sm border border-amber-500/10">
                <p className="text-xs text-warm-gray">
                  Dossier à l'examen par les administrateurs de BarberGo Casablanca. Statut : <strong>Examen instantané</strong>.
                </p>
                <button
                  onClick={handleSimulateAdminApprove}
                  className="w-full sm:w-auto px-4 py-2 bg-emerald-500 text-black text-[9px] uppercase font-bold tracking-widest rounded-sm hover:bg-emerald-600 transition-colors"
                >
                  Simuler la Validation de l'Admin (Débloquer Immédiatement)
                </button>
              </div>
            )}
          </div>
        )}

        {/* BANNER COMMISSION BLOCKED */}
        {isBlockedByCommissions && (
          <div className="mb-8 p-6 bg-red-500/10 border border-red-500/20 rounded-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex gap-4 items-start text-left">
              <Shield className="text-red-500 shrink-0 mt-1" size={24} />
              <div>
                <h4 className="font-bebas text-lg text-red-500 uppercase tracking-wider">Accès Bloqué - Commissions Impayées Limitées</h4>
                <p className="text-xs text-warm-gray leading-relaxed max-w-2xl">
                  Vous avez atteint la limite de <strong>3 séances sans versement de commission</strong> (8% par intervention). Veuillez régler votre solde de <strong>{commissionsOwed} DH</strong> pour pouvoir à nouveau recevoir ou contre-proposer des offres aux futurs clients.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowPayModal(true)}
              className="w-full md:w-auto px-6 py-3 bg-gold text-black text-[10px] font-bold uppercase tracking-widest rounded-sm shadow-xl active:scale-95 transition-all shrink-0"
            >
              Régler ma facture par Carte
            </button>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="space-y-8">
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={<Calendar className="text-gold" />} label="Rendez-vous" value={appointments.length.toString()} sub="Total historique" theme={theme} />
              <StatCard icon={<Clock className="text-gold" />} label="Pour aujourd'hui" value={todayCount.toString()} sub="Prévus ce jour" theme={theme} />
              
              {/* COMMISSION CARD */}
              <div className={`p-5 rounded-sm border ${theme === 'dark' ? 'bg-mid-brown border-white/5' : 'bg-white border-gray-200 shadow-sm'} flex flex-col justify-between`}>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <DollarSign className="text-gold" size={14} />
                    <span className="text-[9px] text-warm-gray uppercase font-bold tracking-widest">Commissions due (8%)</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${isBlockedByCommissions ? 'bg-red-500/20 text-red-400' : 'bg-green-500/15 text-green-400'}`}>
                    {unpaidCount}/3 rdv
                  </span>
                </div>
                <div className="text-3xl font-bebas text-white mt-1">{commissionsOwed} DH</div>
                <button
                  disabled={commissionsOwed === 0}
                  onClick={() => setShowPayModal(true)}
                  className="text-left text-[9px] text-gold uppercase font-bold tracking-widest hover:underline mt-2 disabled:opacity-40"
                >
                  Payer la commission →
                </button>
              </div>

              <StatCard icon={<BarChart3 className="text-emerald-500" />} label="Mon Revenu net" value={`${totalRevenue - commissionsOwed} DH`} sub="Après déduction des 8%" theme={theme} />
            </div>

            {/* Main Content Split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Pending and counter list */}
              <div className="lg:col-span-2 space-y-4 text-left">
                <h3 className="font-bebas text-2xl tracking-widest uppercase text-gold mb-6">Demandes de réservation</h3>
                <div className="space-y-4">
                  {appointments.filter(a => a.status === 'pending').length > 0 ? (
                    appointments.filter(a => a.status === 'pending').map(app => (
                      <AppointmentRow 
                        key={app.id} 
                        app={app} 
                        serviceName={getServiceName(app.serviceId)} 
                        onUpdate={onUpdateStatus}
                        onUpdateAppointment={onUpdateAppointment}
                        isBlocked={isBlockedByCommissions || profileIncomplete}
                        theme={theme} 
                      />
                    ))
                  ) : (
                    <div className={`p-10 text-center border border-dashed rounded-sm opacity-50 ${theme === 'dark' ? 'border-gold/20' : 'border-gray-300'}`}>
                      <CheckCircle2 size={32} className="mx-auto mb-4 text-gold/30" />
                      <p className="text-xs uppercase tracking-widest font-bold">Aucune demande en attente</p>
                    </div>
                  )}
                </div>

                <div className="pt-8">
                   <h3 className="font-bebas text-2xl tracking-widest uppercase text-gold mb-6">Activité récente & Séances Confirmées</h3>
                   <div className="space-y-3">
                     {appointments.filter(a => a.status !== 'pending').slice(0, 8).map(app => (
                       <div 
                         key={app.id}
                         className={`p-4 rounded-sm border ${theme === 'dark' ? 'border-white/5 bg-white/2' : 'border-gray-200 bg-white'} space-y-3`}
                       >
                         <div className="flex items-center justify-between">
                           <div>
                             <span className={`text-[10px] font-bold uppercase tracking-tighter px-2 py-0.5 rounded ${
                               app.status === 'confirmed' ? 'bg-green-500/10 text-green-400' :
                               app.status === 'completed' ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'
                             }`}>
                               {app.status}
                             </span>
                           </div>
                           <span className="text-sm font-bold text-gold">{app.totalPrice} DH</span>
                         </div>

                         <div className="flex gap-4 justify-between items-start">
                           <div>
                             <h4 className="text-base font-bebas tracking-widest uppercase">{getServiceName(app.serviceId)}</h4>
                             <p className="text-[10px] text-warm-gray font-semibold uppercase">{new Date(app.dateTime instanceof Date ? app.dateTime : app.dateTime.toDate()).toLocaleString('fr-FR')}</p>
                             {app.clientNotes && (
                               <p className="text-xs text-warm-gray italic mt-1 bg-black/15 p-2 rounded border border-white/5">
                                 " {app.clientNotes} "
                               </p>
                             )}
                           </div>
                           
                           {/* GEOLOCATION LIVE VIEW FOR CONFIRMED APPS */}
                           {app.status === 'confirmed' && app.clientLocationShared && (
                             <div className="text-right shrink-0">
                               <div className="flex items-center gap-1 text-emerald-400 justify-end">
                                 <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                 <span className="text-[10px] font-bold uppercase">GPS Actif</span>
                               </div>
                               <span className="text-[9px] text-warm-gray block uppercase">Casablanca Centre</span>
                             </div>
                           )}
                         </div>

                         {/* ACTIONS FOR RECENT SESSIONS */}
                         <div className="flex gap-2 pt-2 border-t border-white/5">
                           {app.status === 'confirmed' && (
                             <button
                               onClick={() => handleTriggerCompleteWithCommission(app)}
                               className="px-4 py-1.5 bg-emerald-500 text-black text-[9px] uppercase font-bold tracking-widest rounded-sm"
                             >
                               Marquer Séance Complétée (+8% Tax)
                             </button>
                           )}

                           {/* REPORT CLIENT */}
                           {reportedApps[app.id] ? (
                             <span className="text-[9px] text-red-400 uppercase font-bold inline-flex items-center gap-1">
                               <Flag size={10} /> Client Signalé avec succès
                             </span>
                           ) : (
                             <button
                               onClick={() => setReportingAppId(app.id)}
                               className="px-3 py-1.5 border border-red-500/20 text-red-400 text-[9px] uppercase font-bold tracking-widest rounded-sm hover:bg-red-500/5 transition-colors"
                             >
                               Signaler ce client
                             </button>
                           )}
                         </div>

                         {/* REPORT DIALOG FOR AN APPOINTMENT */}
                         {reportingAppId === app.id && (
                           <div className="p-4 border border-red-500/30 bg-red-500/5 rounded-sm space-y-3">
                             <h5 className="text-[10px] uppercase font-bold tracking-widest text-red-500">Signaler un comportement inapproprié (Casablanca compliance) :</h5>
                             <div className="space-y-1">
                               {["Client introuvable à l'adresse", "Client en retard de plus de 30 min", "Désaccord sur le type de coiffure", "Comportement irrespectueux"].map((reason) => (
                                 <label key={reason} className="flex items-center gap-2 text-xs text-warm-gray cursor-pointer">
                                   <input
                                     type="radio"
                                     name="reportReason"
                                     value={reason}
                                     onChange={() => setReportReason(reason)}
                                   />
                                   {reason}
                                 </label>
                               ))}
                             </div>
                             <div className="flex gap-2">
                               <button
                                 disabled={!reportReason}
                                 onClick={() => handleReportClientSubmit(app.id)}
                                 className="px-4 py-1.5 bg-red-500 text-black text-[9px] uppercase font-bold tracking-widest rounded-sm disabled:opacity-40"
                                >
                                 Valider le signalement
                               </button>
                               <button
                                 onClick={() => setReportingAppId(null)}
                                 className="px-3 py-1.5 text-xs text-warm-gray font-sans"
                               >
                                 Annuler
                               </button>
                             </div>
                           </div>
                         )}
                       </div>
                     ))}
                   </div>
                </div>
              </div>

              {/* Right Column: Bio & Status */}
              <div className="space-y-6 text-left">
                <div className={`p-6 rounded-sm border ${theme === 'dark' ? 'bg-mid-brown border-gold/30' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gold rounded-sm flex items-center justify-center font-bebas text-3xl text-black">
                      {profile.firstName[0]}{profile.lastName[0]}
                    </div>
                    <div>
                        <h4 className="font-bebas text-xl tracking-widest uppercase italic">{profile.firstName}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-warm-gray font-bold uppercase tracking-wider">
                          <MapPin size={12} className="text-gold" /> CASABLANCA, MAROC
                        </div>
                    </div>
                  </div>
                  {profile.bio && (
                    <p className="text-xs text-warm-gray italic leading-relaxed mb-4 pb-4 border-b border-white/5">"{profile.bio}"</p>
                  )}
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs border-b border-white/5 pb-2">
                      <span className="text-warm-gray uppercase tracking-widest">Statut d'activité</span>
                      <span className="text-emerald-400 font-bold uppercase tracking-widest inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> En ligne
                      </span>
                    </div>
                    <div className="flex justify-between text-xs border-b border-white/5 pb-2">
                      <span className="text-warm-gray uppercase tracking-widest">Commission due</span>
                      <span className="text-red-400 font-bold uppercase tracking-widest">{commissionsOwed} DH</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-warm-gray uppercase tracking-widest">Note moyenne</span>
                      <span className="text-gold font-bold uppercase tracking-widest">4.9/5 stars</span>
                    </div>
                  </div>

                  {profile.portfolioPhotos && profile.portfolioPhotos.length > 0 && (
                    <div className="grid grid-cols-4 gap-1.5 mt-4">
                      {profile.portfolioPhotos.slice(0, 4).map((url, i) => (
                        <div key={i} className="aspect-square rounded-sm overflow-hidden border border-gold/15">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => setShowEditProfile(true)}
                    className="w-full mt-6 py-3 border border-gold/30 text-gold text-[10px] font-bold uppercase tracking-widest hover:bg-gold hover:text-black transition-all"
                  >
                    Modifier mes informations
                  </button>
                </div>

                {/* Visual Radar mini card */}
                <div 
                  onClick={() => setActiveTab('map')}
                  className={`p-6 rounded-sm border cursor-pointer hover:border-gold/60 transition-all text-left relative overflow-hidden ${theme === 'dark' ? 'bg-black border-gold/25' : 'bg-white border-gray-200'}`}
                >
                  <div className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full border border-gold/10 animate-pulse pointer-events-none" />
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[10px] text-gold uppercase tracking-widest font-extrabold">Radar Casablanca Live</span>
                  </div>
                  <h4 className="font-bebas text-lg tracking-wider text-white uppercase">Afficher la carte live</h4>
                  <p className="text-xs text-warm-gray leading-normal mt-1">
                    Visualisez les appels d'offres en cours dans les quartiers Maarif, Bourgogne, Gauthier, Anfa et répondez en direct !
                  </p>
                  <div className="text-[10px] text-warm-gray uppercase tracking-widest font-bold mt-4 hover:underline flex items-center gap-1">
                    Ouvrir le Radar GPS →
                  </div>
                </div>

                <div className={`p-6 rounded-sm border ${theme === 'dark' ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
                  <h5 className="text-[10px] uppercase font-bold tracking-widest text-blue-400 mb-2">Notice de règlement</h5>
                  <p className={`text-xs leading-relaxed italic ${theme === 'dark' ? 'text-blue-200/60' : 'text-blue-800/60'}`}>
                    "Les frais de commission s'élèvent à 8% par prestation validée. Ce taux permet de financer la maintenance de la carte GPS et le support client."
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* NEW TAB: CARTE DES ANNONCES CLIENTS (RADAR) */}
        {activeTab === 'map' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div className="text-left">
                <h2 className="font-bebas text-3xl tracking-widest text-gold uppercase">🛰️ RADAR DE DEMANDES LIVE (CASABLANCA)</h2>
                <p className="text-xs text-warm-gray">
                  Visualisez en temps réel les appels de réservations lancés par les clients autour de vous. Acceptez ou négociez le prix à la volée !
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-full font-bold uppercase tracking-wider self-start md:self-auto">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Scan actif sur un rayon de 10km
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* LEFT SIDEBAR: ACTIVE CLIENT ANNOUNCEMENTS LIST */}
              <div className="lg:col-span-1 flex flex-col h-[550px]">
                <div className={`p-4 border-t border-x rounded-t-sm flex items-center justify-between ${theme === 'dark' ? 'bg-mid-brown/40 border-gold/15' : 'bg-white border-gray-200 shadow-sm'}`}>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-gold">🎯 Annonces Spontanées Disponibles</span>
                  <span className="px-2 py-0.5 bg-black/40 text-[9px] font-mono text-gold rounded-full">
                    {appointments.filter(a => a.barberId === 'dummy_barber' && a.status === 'pending').length} en ligne
                  </span>
                </div>
                <div className={`flex-1 border-x border-b rounded-b-sm overflow-y-auto ${theme === 'dark' ? 'bg-black/30 border-gold/15' : 'bg-white border-gray-200 shadow-sm'} p-3 space-y-3`}>
                  {appointments.filter(a => a.barberId === 'dummy_barber' && a.status === 'pending').length > 0 ? (
                    appointments.filter(a => a.barberId === 'dummy_barber' && a.status === 'pending').map(app => {
                      const date = app.dateTime instanceof Date ? app.dateTime : app.dateTime.toDate();
                      const detail = getAnnouncementLocation(app.id);
                      const isSelected = selectedPin === app.id;
                      return (
                        <div
                          key={app.id}
                          onClick={() => setSelectedPin(app.id)}
                          className={`p-4 rounded-sm border cursor-pointer text-left transition-all relative ${
                            isSelected 
                              ? 'border-gold bg-gold/5 shadow-md shadow-gold/5'
                              : `border-white/5 hover:border-gold/30 ${theme === 'dark' ? 'bg-black/20' : 'bg-gray-50'}`
                          }`}
                        >
                          {/* Pulsing indicator for active bid */}
                          <span className="absolute top-4 right-4 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-gold"></span>
                          </span>

                          <div className="text-[9px] text-gold uppercase tracking-widest font-sans font-extrabold flex items-center gap-1.5 mb-1">
                            <MapPin size={8} className="text-gold" /> {detail.neighborhood} (Casablanca)
                          </div>
                          
                          <h4 className="font-bebas text-lg tracking-wider text-white uppercase">
                            {getServiceName(app.serviceId)}
                          </h4>
                          
                          <div className="flex items-center gap-4 text-[10px] text-warm-gray uppercase font-semibold mt-1">
                            <span>⏱️ {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                            <span>👤 {app.clientName || 'Client M.'}</span>
                          </div>

                          {app.clientNotes && (
                            <p className="text-xs text-warm-gray italic mt-2 bg-black/15 p-2 rounded border border-white/5 line-clamp-2">
                              "{app.clientNotes}"
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/5">
                            <div>
                              <span className="text-[8px] text-warm-gray uppercase block tracking-widest font-bold">PROPOSITION CLIENT</span>
                              <span className="text-lg font-bebas text-gold tracking-widest">{app.totalPrice} DH</span>
                            </div>
                            <button
                              disabled={isBlockedByCommissions || profileIncomplete}
                              onClick={(e) => {
                                e.stopPropagation();
                                const confirmAction = window.confirm(`Accepter la coiffure pour ${app.totalPrice} DH avec option domicile ?`);
                                if (confirmAction) onUpdateStatus(app.id, 'confirmed');
                              }}
                              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-black text-[9px] uppercase font-bold tracking-widest rounded-sm transition-all disabled:opacity-40"
                            >
                              Accepter
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-60">
                      <div className="w-12 h-12 rounded-full border border-dashed border-gold/40 flex items-center justify-center mb-4">
                        <MapPin size={20} className="text-gold/40 animate-pulse" />
                      </div>
                      <p className="text-xs text-gold uppercase font-bold tracking-widest mb-1">Radar en écoute live</p>
                      <p className="text-[10px] text-warm-gray leading-relaxed max-w-[200px]">Aucune annonce ouverte disponible. Les clients créent leurs demandes en direct depuis leur application !</p>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT MAP: FULL-FIDELITY LIVE CASABLANCA GRID RADAR */}
              <div className="lg:col-span-2 bg-[#0d0d0d] border border-gold/10 rounded-sm h-[550px] relative overflow-hidden flex flex-col">
                {/* Simulated Grid Background */}
                <div 
                  className="absolute inset-0 opacity-15 pointer-events-none" 
                  style={{ 
                    backgroundImage: 'radial-gradient(circle, #c9a84c 1.5px, transparent 1.5px)', 
                    backgroundSize: '40px 40px' 
                  }} 
                />

                {/* Radar Sweep Circle overlay */}
                <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none flex items-center justify-center">
                  <div className="w-[450px] h-[450px] rounded-full border border-gold/10 animate-pulse relative">
                    <div className="absolute inset-0 rounded-full border border-dashed border-gold/5" />
                    <div className="absolute inset-16 rounded-full border border-gold/5" />
                    <div className="absolute inset-32 rounded-full border border-dashed border-gold/5" />
                  </div>
                </div>

                {/* Map HUD Headers */}
                <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/80 border border-gold/20 p-2.5 rounded-sm">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full border-2 border-black animate-ping" />
                  <div>
                    <div className="text-[9px] uppercase tracking-widest text-gold leading-none font-sans font-extrabold">CASABLANCA LIVE MAP</div>
                    <span className="text-[8px] text-warm-gray leading-none">POSTE LOCAL : EN LIGNE COMME PARTENAIRE</span>
                  </div>
                </div>

                {/* Neighborhood Markers on map */}
                {casablancaNeighborhoods.map((n) => (
                  <div 
                    key={n.name} 
                    className="absolute font-bebas text-[11px] uppercase tracking-widest text-warm-gray/30 pointer-events-none"
                    style={{ top: `${n.y}%`, left: `${n.x}%` }}
                  >
                    {n.name}
                  </div>
                ))}

                {/* Barber Active Position (Your position) */}
                <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 text-center group z-10">
                  <div className="relative">
                    <div className="w-5 h-5 bg-emerald-500 rounded-full border-2 border-black shadow-xl relative z-10 flex items-center justify-center text-[8px] text-black font-extrabold font-sans">
                      ME
                    </div>
                    <div className="absolute -inset-4 bg-emerald-500/20 rounded-full animate-ping pointer-events-none"></div>
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black border border-emerald-500/30 px-2 py-0.5 rounded-sm text-[8px] whitespace-nowrap text-emerald-400 font-bold uppercase tracking-widest leading-none pointer-events-none">
                      VOTRE POSITION SALON / PARTENAIRE
                    </div>
                  </div>
                </div>

                {/* Interactive Client Pins */}
                {appointments.filter(a => a.barberId === 'dummy_barber' && a.status === 'pending').map((app) => {
                  const detail = getAnnouncementLocation(app.id);
                  const isSelected = selectedPin === app.id;
                  return (
                    <div
                      key={app.id}
                      className="absolute z-20"
                      style={{ top: `${detail.y}%`, left: `${detail.x}%` }}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedPin(app.id)}
                        className={`w-9 h-9 rounded-full rounded-br-none rotate-45 flex items-center justify-center shadow-2xl border-2 transition-transform active:scale-95 ${
                          isSelected 
                            ? 'bg-gold border-white scale-110' 
                            : 'bg-amber-500 border-black hover:scale-105'
                        }`}
                      >
                        <span className="-rotate-45 text-[9px] text-black font-black font-sans uppercase">
                          {app.totalPrice}
                        </span>
                      </button>

                      {/* Info popup on selection */}
                      {isSelected && (
                        <div className="absolute bottom-11 left-1/2 -translate-x-1/2 w-64 bg-[#050550]/20 backdrop-blur-md bg-black border border-gold text-left p-4 rounded shadow-2xl z-50 animate-in fade-in duration-200">
                          <div className="flex justify-between items-start mb-2 pb-1 border-b border-white/5">
                            <span className="text-[8px] text-gold uppercase tracking-widest font-extrabold">🚨 Négociation InDrive</span>
                            <button onClick={(e) => { e.stopPropagation(); setSelectedPin(null); }} className="text-warm-gray hover:text-white text-xs">✕</button>
                          </div>
                          
                          <h4 className="font-bebas text-base uppercase tracking-wider text-white">
                            {getServiceName(app.serviceId)}
                          </h4>
                          <p className="text-[10px] text-warm-gray uppercase mt-0.5">
                            Client: <strong>{app.clientName || 'Client M.'}</strong>
                          </p>
                          <p className="text-[10px] text-warm-gray uppercase">
                            Quartier: <strong>{detail.neighborhood}</strong>
                          </p>
                          <p className="text-[10px] text-gold uppercase">
                            Prix Proposé : <strong>{app.totalPrice} DH</strong>
                          </p>

                          {app.clientNotes && (
                            <p className="text-[11px] text-warm-gray bg-black/40 border border-white/5 p-1.5 rounded italic mt-1.5 text-center">
                              "{app.clientNotes}"
                            </p>
                          )}

                          <div className="flex gap-1.5 pt-3 mt-3 border-t border-white/5">
                            <button
                              disabled={isBlockedByCommissions || profileIncomplete}
                              onClick={() => {
                                const confirmAction = window.confirm(`Valider la prestation pour ${app.totalPrice} DH ?`);
                                if (confirmAction) onUpdateStatus(app.id, 'confirmed');
                              }}
                              className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-black text-[9px] uppercase font-bold tracking-widest rounded-sm transition-all disabled:opacity-40"
                            >
                              Accepter
                            </button>
                            <button
                              onClick={() => {
                                setActiveTab('overview');
                                setTimeout(() => {
                                  alert("Vous avez été redirigé vers l'aperçu. Cliquez sur le bouton 'Contre-Proposer' sous l'annonce pour négocier !");
                                }, 300);
                              }}
                              className="flex-1 py-2 bg-gold hover:bg-gold-light text-black text-[9px] uppercase font-bold tracking-widest rounded-sm transition-all"
                            >
                              Négocier
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* AGENDA TAB (CONFIRMED APPOINTMENTS) */}
        {activeTab === 'schedule' && (
          <div className="space-y-6 text-left">
            <h2 className="font-bebas text-3xl tracking-widest text-gold uppercase">📅 MON AGENDA DE COIFFURE</h2>
            <p className="text-xs text-warm-gray">Retrouvez toutes vos séances de coiffure confirmées ou terminées de Casablanca.</p>

            <div className={`p-6 border rounded-sm ${theme === 'dark' ? 'bg-mid-brown/40 border-gold/15' : 'bg-white border-gray-200 shadow-sm'}`}>
              {appointments.filter(a => a.status === 'confirmed').length > 0 ? (
                <div className="divide-y divide-white/5 space-y-4">
                  {appointments.filter(a => a.status === 'confirmed').map(app => {
                    const date = app.dateTime instanceof Date ? app.dateTime : app.dateTime.toDate();
                    return (
                      <div key={app.id} className="pt-4 first:pt-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                          <div className="text-gold font-bold text-xs uppercase tracking-widest">⏱️ {date.toLocaleDateString('fr-FR')} à {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                          <h4 className="font-bebas text-xl text-white uppercase mt-1">{getServiceName(app.serviceId)}</h4>
                          <p className="text-xs text-warm-gray mt-0.5">Client : <strong>{app.clientName || 'Client Casablanca'}</strong></p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xl font-bebas text-gold tracking-widest">{app.totalPrice} DH</span>
                          <button
                            onClick={() => handleTriggerCompleteWithCommission(app)}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black text-[9px] uppercase font-bold tracking-widest rounded-sm"
                          >
                            Séance terminée
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 opacity-60">
                  <Calendar className="mx-auto mb-3 text-gold/30 font-bold" size={32} />
                  <p className="text-xs text-warm-gray font-bold uppercase tracking-widest">Aucune séance confirmée dans l'agenda</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CLIENTS BASE TAB (CRM) */}
        {activeTab === 'clients' && (
          <div className="space-y-6 text-left">
            <h2 className="font-bebas text-3xl tracking-widest text-gold uppercase">👤 BASE CLIENTÈLE (FIDÉLISATION)</h2>
            <p className="text-xs text-warm-gray">Historique des clients de Casablanca qui ont effectué une coiffure avec votre salon.</p>

            <div className={`p-6 border rounded-sm ${theme === 'dark' ? 'bg-mid-brown/40 border-gold/15' : 'bg-white border-gray-200 shadow-sm'}`}>
              {appointments.filter(a => a.status === 'completed').length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from(new Set(appointments.filter(a => a.status === 'completed').map(a => a.clientId))).map(clientId => {
                    const clientApps = appointments.filter(a => a.clientId === clientId);
                    const lastApp = clientApps[clientApps.length - 1];
                    return (
                      <div key={clientId} className="p-4 border border-gold/10 bg-black/20 rounded-sm flex items-center justify-between">
                        <div>
                          <div className="w-10 h-10 bg-gold rounded-full flex items-center justify-center font-bold text-black text-sm uppercase mb-2">
                            {lastApp.clientName ? lastApp.clientName[0] : 'C'}
                          </div>
                          <h4 className="text-sm font-bold text-white">{lastApp.clientName || 'Client Régulier'}</h4>
                          <p className="text-[10px] text-warm-gray uppercase mt-1">Note fidélité: ⭐⭐⭐⭐⭐</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-gold uppercase block font-bold tracking-widest">Total prestations</span>
                          <span className="text-2xl font-bebas text-white">{clientApps.length} coiffures</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 opacity-60">
                  <Users className="mx-auto mb-3 text-gold/30 font-bold" size={32} />
                  <p className="text-xs text-warm-gray font-bold uppercase tracking-widest">Aucun client récurrent dans votre historique</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DISCOVER TAB: OTHER BARBERS' PROFILES & PHOTOS */}
        {activeTab === 'discover' && (
          <div className="space-y-6 text-left">
            <h2 className="font-bebas text-3xl tracking-widest text-gold uppercase flex items-center gap-3">
              <Compass size={26} /> Découvrir les autres coiffeurs
            </h2>
            <p className="text-xs text-warm-gray">Parcourez les profils et les réalisations des autres membres BarberGo.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {barbers.filter(b => b.uid !== profile.uid).map(b => (
                <button
                  key={b.uid}
                  onClick={() => setViewingBarber(b)}
                  className={`text-left p-5 rounded-sm border transition-all hover:border-gold/50 ${theme === 'dark' ? 'bg-mid-brown/30 border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 shrink-0 bg-gold rounded-sm flex items-center justify-center font-bebas text-xl text-black">
                      {b.firstName[0]}{b.lastName[0]}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bebas text-lg tracking-widest uppercase truncate">{b.firstName} {b.lastName}</h4>
                      <p className="text-[9px] text-warm-gray uppercase tracking-widest">{b.gender === 'femme' ? 'Coiffeuse' : 'Coiffeur'}</p>
                    </div>
                  </div>
                  {b.bio && <p className="text-xs text-warm-gray italic line-clamp-2 mb-3">"{b.bio}"</p>}
                  {b.portfolioPhotos && b.portfolioPhotos.length > 0 ? (
                    <div className="grid grid-cols-4 gap-1">
                      {b.portfolioPhotos.slice(0, 4).map((url, i) => (
                        <div key={i} className="aspect-square rounded-sm overflow-hidden border border-gold/10">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-warm-gray/50 uppercase tracking-widest">Aucune photo publiée</p>
                  )}
                </button>
              ))}
              {barbers.filter(b => b.uid !== profile.uid).length === 0 && (
                <div className="col-span-full text-center py-10 opacity-60">
                  <Compass className="mx-auto mb-3 text-gold/30" size={32} />
                  <p className="text-xs text-warm-gray font-bold uppercase tracking-widest">Aucun autre coiffeur inscrit pour le moment</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* MODAL BILL PAYMENT */}
      <AnimatePresence>
        {showPayModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-sm p-6 rounded-sm border text-left ${theme === 'dark' ? 'bg-mid-brown border-gold/30' : 'bg-white border-gray-200'}`}
            >
              <h3 className="font-bebas text-xl text-gold uppercase tracking-widest mb-2">Règlement de commission BarberGo</h3>
              <p className="text-xs text-warm-gray leading-relaxed mb-4">
                Payez vos frais (8%) par carte de crédit pour débloquer immédiatement votre compte BarberGo.
              </p>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-xs border-b border-white/5 pb-2">
                  <span>Séances impayées :</span>
                  <strong>{unpaidCount} interventions</strong>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span>Montant de la facture :</span>
                  <span className="text-gold">{commissionsOwed} DH</span>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <label className="text-[8px] uppercase tracking-widest font-bold text-warm-gray">Numéro de carte (Simulation de paiement)</label>
                <input 
                  type="text" 
                  value="4242 •••• •••• 4242"
                  disabled
                  className="w-full text-xs font-mono p-3 bg-black/40 border border-white/10 rounded-sm text-gold"
                />
              </div>

              <div className="flex gap-2">
                <button
                  disabled={isPaying}
                  onClick={handlePayBalance}
                  className="flex-1 py-3 bg-gold text-black text-[10px] font-bold uppercase tracking-widest hover:bg-gold-light transition-all rounded-sm font-sans"
                >
                  {isPaying ? "Transaction en cours..." : `Payer ${commissionsOwed} DH`}
                </button>
                <button
                  disabled={isPaying}
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-3 border border-white/10 text-warm-gray text-[10px] font-bold uppercase tracking-widest rounded-sm"
                >
                  Annuler
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDIT MY PROFILE (BIO + PORTFOLIO PHOTOS) */}
      <AnimatePresence>
        {showEditProfile && (
          <EditProfileModal
            profile={profile}
            theme={theme}
            onClose={() => setShowEditProfile(false)}
            onUpdateBio={onUpdateBio}
            onUpdatePhone={onUpdatePhone}
            onUploadPhoto={onUploadPhoto}
            onDeletePhoto={onDeletePhoto}
          />
        )}
      </AnimatePresence>

      {/* MODAL: VIEW ANOTHER BARBER'S PROFILE */}
      <AnimatePresence>
        {viewingBarber && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-lg p-6 rounded-sm border text-left max-h-[85vh] overflow-y-auto ${theme === 'dark' ? 'bg-mid-brown border-gold/30' : 'bg-white border-gray-200'}`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gold rounded-sm flex items-center justify-center font-bebas text-3xl text-black shrink-0">
                    {viewingBarber.firstName[0]}{viewingBarber.lastName[0]}
                  </div>
                  <div>
                    <h3 className="font-bebas text-2xl text-gold tracking-widest uppercase">{viewingBarber.firstName} {viewingBarber.lastName}</h3>
                    <p className="text-[10px] text-warm-gray uppercase tracking-widest">{viewingBarber.gender === 'femme' ? 'Coiffeuse' : 'Coiffeur'}</p>
                  </div>
                </div>
                <button onClick={() => setViewingBarber(null)} className="text-warm-gray hover:text-gold transition-colors shrink-0"><X size={20} /></button>
              </div>
              {viewingBarber.bio && (
                <p className="text-xs text-warm-gray italic leading-relaxed mb-6 pb-6 border-b border-white/5">"{viewingBarber.bio}"</p>
              )}
              <div className="text-[10px] text-warm-gray uppercase tracking-widest font-bold mb-3">Réalisations</div>
              {viewingBarber.portfolioPhotos && viewingBarber.portfolioPhotos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {viewingBarber.portfolioPhotos.map((url, i) => (
                    <div key={i} className="aspect-square rounded-sm overflow-hidden border border-gold/15">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-warm-gray/50 uppercase tracking-widest text-center py-8">Aucune photo publiée pour le moment</p>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Stats Card Helper
function StatCard({ icon, label, value, sub, theme }: { icon: React.ReactNode, label: string, value: string, sub: string, theme: 'dark' | 'light' }) {
  return (
    <div className={`p-5 rounded-sm border ${theme === 'dark' ? 'bg-mid-brown border-white/5' : 'bg-white border-gray-200 shadow-sm'} text-left`}>
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <span className="text-[10px] text-warm-gray uppercase font-bold tracking-widest">{label}</span>
      </div>
      <div className={`text-3xl font-bebas tracking-wider ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{value}</div>
      <div className="text-[10px] text-warm-gray/40 uppercase tracking-tighter mt-1">{sub}</div>
    </div>
  );
}


// APPOINTMENT ROW WITH INDRIVE NEGOTIATION OPTIONS
interface AppointmentRowProps {
  key?: string;
  app: Appointment;
  serviceName: string;
  onUpdate: (id: string, s: Appointment['status']) => Promise<void>;
  onUpdateAppointment?: (id: string, updates: Partial<Appointment>) => Promise<void>;
  isBlocked: boolean;
  theme: 'dark' | 'light';
}

function AppointmentRow({ app, serviceName, onUpdate, onUpdateAppointment, isBlocked, theme }: AppointmentRowProps) {
  const date = app.dateTime instanceof Date ? app.dateTime : app.dateTime.toDate();
  const [showCounterPanel, setShowCounterPanel] = useState(false);
  const [counterPrice, setCounterPrice] = useState<number>(0);
  const [counterNotes, setCounterNotes] = useState<string>('');

  useEffect(() => {
    // Default proposed counter is around standard price + 10 or 15 DH
    setCounterPrice(Math.round(((app.totalPrice || 120) + 15) / 5) * 5);
  }, [app]);

  const handleSendCounterOffer = async () => {
    if (!onUpdateAppointment) return;
    await onUpdateAppointment(app.id, {
      negotiationStatus: 'barber_countered',
      counterPriceByBarber: counterPrice,
      proposedPrice: app.totalPrice // Remember original proposal
    });
    setShowCounterPanel(false);
  };

  return (
    <div className={`p-5 rounded-sm border flex flex-col gap-4 transition-all ${theme === 'dark' ? 'bg-black/40 border-gold/10 hover:border-gold/30' : 'bg-white border-gray-200 shadow-sm'}`}>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        {/* Info of appointment */}
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className={`w-12 h-12 shrink-0 flex flex-col items-center justify-center rounded-sm text-center leading-none ${theme === 'dark' ? 'bg-gold/10 text-gold' : 'bg-gray-100 text-gray-500'}`}>
            <span className="text-[10px] uppercase font-bold">{date.toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
            <span className="text-2xl font-bebas leading-none mt-1">{date.getDate()}</span>
          </div>
          <div>
            <div className={`text-base font-bebas tracking-widest uppercase ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{serviceName}</div>
            <div className="text-[10px] text-warm-gray uppercase font-bold tracking-widest flex items-center gap-2 mt-0.5">
              <Clock size={10} className="text-gold" /> {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </div>
            {app.clientNotes && (
              <p className="text-xs text-warm-gray italic mt-1 bg-black/10 p-2 rounded border border-white/5">
                " {app.clientNotes} "
              </p>
            )}
          </div>
        </div>

        {/* Pricing details & Counter displays */}
        <div className="text-right w-full md:w-auto">
          <div className="text-xs uppercase font-bold text-warm-gray mb-1">PROPOSITION CLIENT</div>
          <div className="text-2xl font-bebas text-gold tracking-widest">{app.totalPrice} DH</div>
          {(app.negotiationStatus as string) === 'barber_countered' && (
            <div className="text-[10px] text-amber-500 uppercase font-bold mt-1">
              Contre-offre envoyée: {app.counterPriceByBarber} DH
            </div>
          )}
        </div>
      </div>

      {/* ROW ACTION BUTTONS */}
      {(app.negotiationStatus as string) !== 'barber_countered' && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
          <button 
            disabled={isBlocked || (app.negotiationStatus as string) === 'barber_countered'}
            onClick={() => onUpdate(app.id, 'confirmed')}
            className="flex-1 md:flex-none px-5 py-2.5 bg-emerald-500 font-sans text-black text-[9.5px] font-bold uppercase tracking-widest rounded-sm hover:opacity-90 transition-all disabled:opacity-40"
          >
            Accepter le prix ({app.totalPrice} DH)
          </button>
          
          <button 
            disabled={isBlocked || (app.negotiationStatus as string) === 'barber_countered'}
            onClick={() => setShowCounterPanel(!showCounterPanel)}
            className="flex-1 md:flex-none px-5 py-2.5 bg-gold text-black font-sans text-[9.5px] font-bold uppercase tracking-widest rounded-sm hover:bg-gold-light transition-all disabled:opacity-40"
          >
            Contre-Proposer
          </button>
          
          <button 
            onClick={() => onUpdate(app.id, 'cancelled')}
            className="flex-1 md:flex-none px-4 py-2.5 border border-red-500/20 text-red-400 font-sans text-[9.5px] font-bold uppercase tracking-widest rounded-sm hover:bg-red-500/5 transition-all"
          >
            Refuser
          </button>
        </div>
      )}

      {/* DISQUALIFY BLOCK TEXT FOR STATS */}
      {isBlocked && (
        <p className="text-[10px] text-red-400 uppercase font-bold leading-relaxed">
          🔒 Touches désactivées : complétez votre téléphone et votre dossier KYC, ou payez le solde de vos commissions dues.
        </p>
      )}

      {/* COUNTER NEGOTIATE DRAWER PANEL */}
      <AnimatePresence>
        {showCounterPanel && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-black/40 p-4 border border-gold/20 rounded-sm space-y-4"
          >
            <h5 className="text-[10px] uppercase font-bold tracking-widest text-gold mb-1">Négocier à la InDrive</h5>
            
            <div className="flex items-center justify-between gap-4 max-w-xs">
              <span className="text-[10px] text-warm-gray uppercase font-bold">Votre Prix :</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCounterPrice(p => Math.max(10, p - 5))}
                  className="w-8 h-8 border border-white/10 text-white flex items-center justify-center font-bold"
                >
                  -5
                </button>
                <input 
                  type="number" 
                  value={counterPrice}
                  onChange={(e) => setCounterPrice(parseInt(e.target.value) || 120)}
                  className="w-16 text-center text-sm font-bold bg-transparent border-b border-gold text-gold outline-none"
                />
                <button
                  type="button"
                  onClick={() => setCounterPrice(p => p + 5)}
                  className="w-8 h-8 border border-white/10 text-white flex items-center justify-center font-bold"
                >
                  +5
                </button>
              </div>
            </div>

            <div className="flex gap-2 justify-start">
              {[-10, 10].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setCounterPrice(p => Math.max(10, p + val))}
                  className="px-2 py-0.5 border border-white/5 text-[9px] uppercase hover:border-gold text-warm-gray"
                >
                  {val > 0 ? `+${val}` : val} DH
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSendCounterOffer}
                className="px-5 py-2 bg-gold text-black text-[9px] uppercase font-bold tracking-widest rounded-sm"
              >
                Envoyer la contre-offre ({counterPrice} DH)
              </button>
              <button
                onClick={() => setShowCounterPanel(false)}
                className="px-3 py-2 text-xs text-warm-gray"
              >
                Annuler
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Deterministic Casablanca location helpers
export const casablancaNeighborhoods = [
  { name: 'Maarif', x: 42, y: 35 },
  { name: 'Anfa', x: 28, y: 22 },
  { name: 'Oasis', x: 55, y: 65 },
  { name: 'Gauthier', x: 38, y: 28 },
  { name: 'Bourgogne', x: 20, y: 18 },
  { name: 'Sidi Maârouf', x: 75, y: 80 },
  { name: 'Derb Ghallef', x: 48, y: 48 },
  { name: 'Oulfa', x: 65, y: 62 },
];

export function getAnnouncementLocation(appId: string) {
  let hash = 0;
  for (let i = 0; i < appId.length; i++) {
    hash = appId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % casablancaNeighborhoods.length;
  const base = casablancaNeighborhoods[index];
  
  // Deterministic safe jitter in [0, 4]
  const jitterX = Math.abs((hash * 3) % 9) - 4;
  const jitterY = Math.abs((hash * 7) % 9) - 4;
  
  return {
    neighborhood: base.name,
    x: Math.max(10, Math.min(90, base.x + jitterX)),
    y: Math.max(10, Math.min(90, base.y + jitterY))
  };
}

// EDIT PROFILE MODAL: bio + portfolio photo management (real upload via Firebase Storage)
interface EditProfileModalProps {
  profile: UserProfile;
  theme: 'dark' | 'light';
  onClose: () => void;
  onUpdateBio: (bio: string) => Promise<void>;
  onUpdatePhone: (phone: string) => Promise<void>;
  onUploadPhoto: (file: File) => Promise<string | undefined>;
  onDeletePhoto: (url: string) => Promise<void>;
}

function EditProfileModal({ profile, theme, onClose, onUpdateBio, onUpdatePhone, onUploadPhoto, onDeletePhoto }: EditProfileModalProps) {
  const [bio, setBio] = useState(profile.bio || '');
  const [savingBio, setSavingBio] = useState(false);
  const [phone, setPhone] = useState(profile.phone || '');
  const [savingPhone, setSavingPhone] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveBio = async () => {
    setSavingBio(true);
    try {
      await onUpdateBio(bio.trim());
    } catch (e) {
      setError("Impossible d'enregistrer la bio pour le moment.");
    }
    setSavingBio(false);
  };

  const handleSavePhone = async () => {
    setSavingPhone(true);
    try {
      await onUpdatePhone(phone.trim());
    } catch (e) {
      setError("Impossible d'enregistrer le numéro de téléphone pour le moment.");
    }
    setSavingPhone(false);
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Merci de choisir un fichier image.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('La photo dépasse la taille maximale de 8 Mo.');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      await onUploadPhoto(file);
    } catch (e) {
      setError("L'envoi de la photo a échoué. Vérifiez que Firebase Storage est bien activé pour ce projet.");
    }
    setUploading(false);
  };

  const handleDelete = async (url: string) => {
    setDeletingUrl(url);
    try {
      await onDeletePhoto(url);
    } catch (e) {
      setError('Impossible de supprimer cette photo pour le moment.');
    }
    setDeletingUrl(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className={`w-full max-w-lg rounded-sm border text-left max-h-[85vh] overflow-y-auto ${theme === 'dark' ? 'bg-mid-brown border-gold/30' : 'bg-white border-gray-200'}`}
      >
        <div className="p-6 border-b border-gold/10 flex justify-between items-center bg-gold/5">
          <h3 className="font-bebas text-xl text-gold tracking-widest uppercase">Modifier mon profil</h3>
          <button onClick={onClose} className="text-warm-gray hover:text-gold transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-sm">{error}</div>
          )}

          {/* PHONE */}
          <div>
            <label className="text-[10px] text-warm-gray uppercase font-bold tracking-widest mb-2 block">Numéro de téléphone</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+212 6 XX XX XX XX"
                className={`flex-1 text-xs p-3 rounded-sm border outline-none ${theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
              />
              <button
                onClick={handleSavePhone}
                disabled={savingPhone || !phone.trim() || phone === (profile.phone || '')}
                className="px-4 py-1.5 bg-gold text-black text-[9px] font-bold uppercase tracking-widest rounded-sm disabled:opacity-40 shrink-0"
              >
                {savingPhone ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>

          {/* BIO */}
          <div>
            <label className="text-[10px] text-warm-gray uppercase font-bold tracking-widest mb-2 block">Ma présentation</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Décrivez votre spécialité, votre expérience, votre style..."
              className={`w-full text-xs p-3 rounded-sm border outline-none resize-none ${theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-[9px] text-warm-gray/50">{bio.length}/500</span>
              <button
                onClick={handleSaveBio}
                disabled={savingBio || bio === (profile.bio || '')}
                className="px-4 py-1.5 bg-gold text-black text-[9px] font-bold uppercase tracking-widest rounded-sm disabled:opacity-40"
              >
                {savingBio ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>

          {/* PORTFOLIO PHOTOS */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[10px] text-warm-gray uppercase font-bold tracking-widest">Mes réalisations</label>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gold/30 text-gold text-[9px] font-bold uppercase tracking-widest rounded-sm hover:bg-gold hover:text-black transition-all disabled:opacity-40"
              >
                <Upload size={12} /> {uploading ? 'Envoi en cours...' : 'Ajouter une photo'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelected} className="hidden" />
            </div>

            {profile.portfolioPhotos && profile.portfolioPhotos.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {profile.portfolioPhotos.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-sm overflow-hidden border border-gold/15 group">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => handleDelete(url)}
                      disabled={deletingUrl === url}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <Trash2 size={18} className="text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-warm-gray/50 uppercase tracking-widest text-center py-6 border border-dashed border-white/10 rounded-sm">
                Aucune photo publiée — ajoutez vos plus belles réalisations
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
