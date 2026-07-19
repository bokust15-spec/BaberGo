import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ShieldCheck, FileImage, Check, X as XIcon, Banknote, CalendarClock, RefreshCw, Search, MessageCircle, MapPin, Trash2 } from 'lucide-react';
import { UserProfile, Appointment, AppointmentChatMeta, ChatMessage } from '../hooks/useFirebase';
import { cannedMessageLabel, cancelReasonLabel } from '../data/chatMessages';

interface KycSubmission {
  cinUrl?: string;
  selfieUrl?: string;
  submittedAt: any;
}

interface AdminPanelProps {
  barbers: UserProfile[];
  allAppointments: Appointment[];
  onRefreshAppointments: () => void;
  theme: 'dark' | 'light';
  onClose: () => void;
  getKycSubmission: (barberUid: string) => Promise<KycSubmission | null>;
  approveBarberKyc: (barberUid: string) => Promise<void>;
  rejectBarberKyc: (barberUid: string) => Promise<void>;
  settleCommission: (barberUid: string) => Promise<void>;
  getAppointmentChatForAdmin: (appointmentId: string) => Promise<{ meta: AppointmentChatMeta | null; messages: ChatMessage[] }>;
  onDeleteAppointment: (id: string) => Promise<void>;
}

function toDate(value: any): Date {
  return value instanceof Date ? value : value.toDate();
}

const STATUS_LABEL: Record<Appointment['status'], string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  completed: 'Terminée',
  cancelled: 'Refusée'
};

const STATUS_CLASS: Record<Appointment['status'], string> = {
  pending: 'bg-amber-500/10 text-amber-400',
  confirmed: 'bg-emerald-500/10 text-emerald-400',
  completed: 'bg-gold/10 text-gold',
  cancelled: 'bg-red-500/10 text-red-400'
};

type AdminTab = 'reservations' | 'kyc' | 'commissions';

export default function AdminPanel({ barbers, allAppointments, onRefreshAppointments, theme, onClose, getKycSubmission, approveBarberKyc, rejectBarberKyc, settleCommission, getAppointmentChatForAdmin, onDeleteAppointment }: AdminPanelProps) {
  const [dossiers, setDossiers] = useState<Record<string, KycSubmission | null>>({});
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<Appointment['status'] | 'all'>('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedChatId, setExpandedChatId] = useState<string | null>(null);
  const [chatData, setChatData] = useState<Record<string, { meta: AppointmentChatMeta | null; messages: ChatMessage[] } | 'loading'>>({});
  const [activeTab, setActiveTab] = useState<AdminTab>('reservations');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingAppointmentId, setDeletingAppointmentId] = useState<string | null>(null);

  const handleToggleChat = (appointmentId: string) => {
    if (expandedChatId === appointmentId) {
      setExpandedChatId(null);
      return;
    }
    setExpandedChatId(appointmentId);
    if (!(appointmentId in chatData)) {
      setChatData(prev => ({ ...prev, [appointmentId]: 'loading' }));
      getAppointmentChatForAdmin(appointmentId).then(data => setChatData(prev => ({ ...prev, [appointmentId]: data })));
    }
  };

  const pendingKyc = barbers.filter(b => b.kycStatus === 'pending');
  const owingCommission = barbers.filter(b => (b.unpaidCommissionsCount || 0) > 0);

  const barberName = (barberId: string) => {
    const b = barbers.find(x => x.uid === barberId);
    return b ? `${b.firstName} ${b.lastName}` : 'Pro introuvable';
  };

  // Most recent activity first — the whole point of this section is to catch anything
  // new without having to scroll past older, already-handled bookings.
  const sortedAppointments = useMemo(
    () => [...allAppointments].sort((a, b) => toDate(b.dateTime).getTime() - toDate(a.dateTime).getTime()),
    [allAppointments]
  );

  const filteredAppointments = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toTime = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null;
    return sortedAppointments.filter(app => {
      if (statusFilter !== 'all' && app.status !== statusFilter) return false;
      const appTime = toDate(app.dateTime).getTime();
      if (fromTime !== null && appTime < fromTime) return false;
      if (toTime !== null && appTime > toTime) return false;
      if (!q) return true;
      const haystack = `${app.clientName || ''} ${app.clientEmail || ''} ${barberName(app.barberId)} ${app.serviceName || ''}`.toLowerCase();
      return haystack.includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedAppointments, statusFilter, search, dateFrom, dateTo, barbers]);

  const statusCounts = useMemo(() => {
    const counts: Record<Appointment['status'], number> = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
    allAppointments.forEach(app => { counts[app.status] = (counts[app.status] || 0) + 1; });
    return counts;
  }, [allAppointments]);

  useEffect(() => {
    pendingKyc.forEach(b => {
      if (!(b.uid in dossiers)) {
        getKycSubmission(b.uid).then(d => setDossiers(prev => ({ ...prev, [b.uid]: d })));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingKyc.map(b => b.uid).join(',')]);

  const handleApprove = async (uid: string) => {
    setBusyUid(uid);
    try { await approveBarberKyc(uid); } catch (e) { console.error(e); }
    setBusyUid(null);
  };

  const handleReject = async (uid: string) => {
    setBusyUid(uid);
    try { await rejectBarberKyc(uid); } catch (e) { console.error(e); }
    setBusyUid(null);
  };

  const handleSettle = async (uid: string) => {
    setBusyUid(uid);
    try { await settleCommission(uid); } catch (e) { console.error(e); }
    setBusyUid(null);
  };

  const handleDeleteAppointment = async (id: string) => {
    setDeletingAppointmentId(id);
    try {
      await onDeleteAppointment(id);
    } catch (e) {
      console.error(e);
    }
    setDeletingAppointmentId(null);
    setConfirmDeleteId(null);
  };

  const cardClass = theme === 'dark' ? 'bg-mid-brown/30 border-gold/15' : 'bg-white border-gray-200';

  return (
    <div className={`min-h-screen pt-20 pb-16 px-4 md:px-8 font-dm-sans transition-colors duration-300 ${theme === 'dark' ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'}`}>
      <nav className={`fixed top-0 left-0 right-0 z-40 border-b px-6 py-4 flex items-center justify-between backdrop-blur-md ${theme === 'dark' ? 'bg-black/80 border-gold/20' : 'bg-white/80 border-gray-200 shadow-sm'}`}>
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-gold" />
          <span className="font-bebas text-xl tracking-widest text-gold">Admin BaberGo</span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 text-warm-gray hover:text-gold transition-colors text-[10px] font-bold uppercase tracking-widest"
        >
          <ArrowLeft size={14} /> Retour
        </button>
      </nav>

      {/* Rubriques séparées — KYC et Commissions ont chacune leur propre onglet, avec un
          badge doré dès qu'un dossier ou un solde attend une action, pour que l'admin
          n'ait jamais à faire défiler toute la liste des réservations pour les trouver. */}
      <div className="max-w-3xl mx-auto flex gap-2 mb-8">
        {([
          { id: 'reservations' as const, label: 'Réservations', Icon: CalendarClock, count: 0 },
          { id: 'kyc' as const, label: 'KYC', Icon: FileImage, count: pendingKyc.length },
          { id: 'commissions' as const, label: 'Commissions', Icon: Banknote, count: owingCommission.length },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-colors ${
              activeTab === tab.id
                ? 'bg-gold text-black border-gold'
                : theme === 'dark' ? 'border-white/10 text-warm-gray hover:text-gold' : 'border-gray-200 text-gray-500 hover:text-gold'
            }`}
          >
            <tab.Icon size={14} />
            {tab.label}
            {tab.count > 0 && (
              <span className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none ${activeTab === tab.id ? 'border-2 border-black/20' : ''}`}>
                {tab.count > 99 ? '99+' : tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <main className="max-w-3xl mx-auto space-y-10">
        {activeTab === 'reservations' && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bebas text-lg tracking-widest text-gold uppercase flex items-center gap-2">
              <CalendarClock size={16} /> Toutes les réservations ({allAppointments.length})
            </h2>
            <button
              onClick={onRefreshAppointments}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-white/10 text-warm-gray hover:text-gold transition-colors text-[9px] font-bold uppercase tracking-widest"
            >
              <RefreshCw size={11} /> Actualiser
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            {([
              { id: 'all' as const, label: 'Toutes', count: allAppointments.length },
              { id: 'pending' as const, label: STATUS_LABEL.pending, count: statusCounts.pending },
              { id: 'confirmed' as const, label: STATUS_LABEL.confirmed, count: statusCounts.confirmed },
              { id: 'completed' as const, label: STATUS_LABEL.completed, count: statusCounts.completed },
              { id: 'cancelled' as const, label: STATUS_LABEL.cancelled, count: statusCounts.cancelled }
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest border transition-colors ${statusFilter === tab.id ? 'bg-gold text-black border-gold' : 'border-white/10 text-warm-gray hover:text-gold'}`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          <div className="relative mb-3">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un client, un pro, une prestation..."
              className={`w-full pl-9 pr-3 py-2 rounded-lg text-xs outline-none border ${theme === 'dark' ? 'bg-black/40 border-white/10 text-white placeholder:text-warm-gray/50' : 'bg-white border-gray-200 text-gray-900'}`}
            />
          </div>

          <div className="flex items-end gap-2 mb-4">
            <div className="flex-1">
              <label className="block text-[8px] uppercase font-bold text-warm-gray mb-1">De</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg text-xs outline-none border ${theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
              />
            </div>
            <div className="flex-1">
              <label className="block text-[8px] uppercase font-bold text-warm-gray mb-1">À</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg text-xs outline-none border ${theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
              />
            </div>
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="px-2 py-2 text-[9px] text-warm-gray hover:text-gold uppercase font-bold tracking-widest shrink-0"
              >
                Effacer
              </button>
            )}
          </div>

          {filteredAppointments.length === 0 ? (
            <p className="text-xs text-warm-gray">Aucune réservation {statusFilter !== 'all' || search || dateFrom || dateTo ? 'pour ces critères' : "pour le moment"}.</p>
          ) : (
            <div className="space-y-2">
              {filteredAppointments.map(app => (
                <div key={app.id} className={`p-3.5 rounded-xl border ${cardClass}`}>
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{app.serviceName || 'Prestation'}</p>
                      <p className="text-[10px] text-warm-gray truncate">
                        {app.clientName || 'Client'}{app.clientEmail ? ` · ${app.clientEmail}` : ''} → {barberName(app.barberId)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${STATUS_CLASS[app.status]}`}>
                        {STATUS_LABEL[app.status]}
                      </span>
                      {confirmDeleteId === app.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDeleteAppointment(app.id)}
                            disabled={deletingAppointmentId === app.id}
                            className="px-2 py-1 bg-red-500 text-white text-[8px] font-bold uppercase tracking-widest rounded disabled:opacity-40"
                          >
                            {deletingAppointmentId === app.id ? '...' : 'Confirmer'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 border border-white/10 text-warm-gray text-[8px] font-bold uppercase tracking-widest rounded"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(app.id)}
                          className="p-1.5 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/10"
                          aria-label="Supprimer la réservation"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-warm-gray">
                    <span>{toDate(app.dateTime).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    <span className="text-gold font-bold">{app.totalPrice} DH</span>
                  </div>
                  {app.negotiationStatus && (
                    <p className="text-[9px] text-warm-gray/70 mt-1 uppercase tracking-widest">Négociation : {app.negotiationStatus}</p>
                  )}
                  {app.status === 'cancelled' && app.cancelledBy && (
                    <p className="text-[9px] text-red-400/90 mt-1 uppercase tracking-widest">
                      Annulée par le {app.cancelledBy === 'client' ? 'client' : 'pro'}
                      {app.cancelReason && ` — ${cancelReasonLabel(app.cancelReason)}`}
                      {app.cancelReasonDetail && ` (${app.cancelReasonDetail})`}
                    </p>
                  )}

                  {app.status !== 'pending' && (
                    <button
                      onClick={() => handleToggleChat(app.id)}
                      className="mt-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-gold"
                    >
                      <MessageCircle size={11} /> {expandedChatId === app.id ? 'Masquer la conversation' : 'Voir la conversation'}
                    </button>
                  )}

                  {expandedChatId === app.id && (
                    <div className={`mt-2 p-3 rounded-lg border space-y-1.5 max-h-56 overflow-y-auto ${theme === 'dark' ? 'border-white/10 bg-black/20' : 'border-gray-200 bg-gray-50'}`}>
                      {chatData[app.id] === 'loading' || chatData[app.id] === undefined ? (
                        <p className="text-[10px] text-warm-gray">Chargement...</p>
                      ) : (chatData[app.id] as { meta: AppointmentChatMeta | null; messages: ChatMessage[] }).messages.length === 0 ? (
                        <p className="text-[10px] text-warm-gray">Aucun message échangé.</p>
                      ) : (
                        (chatData[app.id] as { meta: AppointmentChatMeta | null; messages: ChatMessage[] }).messages.map(msg => (
                          <p key={msg.id} className="text-[10px]">
                            <span className="font-bold text-gold">{msg.senderRole === 'client' ? 'Client' : 'Pro'} :</span>{' '}
                            {msg.type === 'canned' && cannedMessageLabel(msg.cannedKey || '')}
                            {msg.type === 'location' && (
                              <span className="inline-flex items-center gap-1"><MapPin size={9} /> Localisation partagée ({msg.location?.lat.toFixed(4)}, {msg.location?.lng.toFixed(4)})</span>
                            )}
                            {msg.type === 'reschedule_proposal' && `Propose le créneau du ${toDate(msg.proposedDateTime).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}`}
                            {msg.type === 'reschedule_response' && (msg.accepted ? 'Accepte le nouveau créneau' : 'Refuse le nouveau créneau')}
                          </p>
                        ))
                      )}
                      {(chatData[app.id] as { meta: AppointmentChatMeta | null; messages: ChatMessage[] } | undefined)?.meta?.clientSharedPhone && (
                        <p className="text-[10px] text-emerald-400 pt-1 border-t border-white/5">
                          Numéro partagé par le client : {(chatData[app.id] as { meta: AppointmentChatMeta | null; messages: ChatMessage[] }).meta?.clientSharedPhone}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
        )}

        {activeTab === 'kyc' && (
        <section>
          <h2 className="font-bebas text-lg tracking-widest text-gold uppercase mb-4">KYC en attente ({pendingKyc.length})</h2>
          {pendingKyc.length === 0 ? (
            <p className="text-xs text-warm-gray">Aucun dossier en attente.</p>
          ) : (
            <div className="space-y-3">
              {pendingKyc.map(b => {
                const dossier = dossiers[b.uid];
                return (
                  <div key={b.uid} className={`p-4 rounded-xl border ${cardClass}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-bold">{b.firstName} {b.lastName}</p>
                        <p className="text-[10px] text-warm-gray">{b.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          disabled={busyUid === b.uid}
                          onClick={() => handleApprove(b.uid)}
                          className="flex items-center gap-1 px-3 py-2 bg-emerald-500 text-black text-[9px] font-bold uppercase tracking-widest rounded-lg hover:bg-emerald-400 disabled:opacity-40"
                        >
                          <Check size={12} /> Approuver
                        </button>
                        <button
                          disabled={busyUid === b.uid}
                          onClick={() => handleReject(b.uid)}
                          className="flex items-center gap-1 px-3 py-2 border border-red-500/40 text-red-400 text-[9px] font-bold uppercase tracking-widest rounded-lg hover:bg-red-500/10 disabled:opacity-40"
                        >
                          <XIcon size={12} /> Refuser
                        </button>
                      </div>
                    </div>
                    {dossier === undefined ? (
                      <p className="text-[10px] text-warm-gray">Chargement du dossier...</p>
                    ) : dossier === null ? (
                      <p className="text-[10px] text-red-400">Aucun fichier trouvé pour ce dossier.</p>
                    ) : (
                      <div className="flex gap-3">
                        {dossier.cinUrl ? (
                          <a href={dossier.cinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[10px] text-gold underline">
                            <FileImage size={12} /> Voir la CIN
                          </a>
                        ) : (
                          <span className="text-[10px] text-warm-gray">CIN manquante</span>
                        )}
                        {dossier.selfieUrl ? (
                          <a href={dossier.selfieUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[10px] text-gold underline">
                            <FileImage size={12} /> Voir le selfie
                          </a>
                        ) : (
                          <span className="text-[10px] text-warm-gray">Selfie manquant</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
        )}

        {activeTab === 'commissions' && (
        <section>
          <h2 className="font-bebas text-lg tracking-widest text-gold uppercase mb-4">Commissions dues ({owingCommission.length})</h2>
          {owingCommission.length === 0 ? (
            <p className="text-xs text-warm-gray">Aucun solde en attente.</p>
          ) : (
            <div className="space-y-3">
              {owingCommission.map(b => (
                <div key={b.uid} className={`p-4 rounded-xl border flex items-center justify-between ${cardClass}`}>
                  <div>
                    <p className="text-sm font-bold">{b.firstName} {b.lastName}</p>
                    <p className="text-[10px] text-warm-gray">{b.unpaidCommissionsCount || 0} interventions — <span className="text-gold font-bold">{b.totalCommissionsOwed || 0} DH</span></p>
                  </div>
                  <button
                    disabled={busyUid === b.uid}
                    onClick={() => handleSettle(b.uid)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gold text-black text-[9px] font-bold uppercase tracking-widest rounded-lg hover:bg-gold-light disabled:opacity-40"
                  >
                    <Banknote size={12} /> Marquer comme payé
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
        )}
      </main>
    </div>
  );
}
