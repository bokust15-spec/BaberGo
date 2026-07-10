import React, { useEffect, useState } from 'react';
import { ArrowLeft, ShieldCheck, FileImage, Check, X as XIcon } from 'lucide-react';
import { UserProfile } from '../hooks/useFirebase';

interface KycSubmission {
  cinUrl: string;
  selfieUrl: string;
  submittedAt: any;
}

interface AdminPanelProps {
  barbers: UserProfile[];
  theme: 'dark' | 'light';
  onClose: () => void;
  getKycSubmission: (barberUid: string) => Promise<KycSubmission | null>;
  approveBarberKyc: (barberUid: string) => Promise<void>;
  rejectBarberKyc: (barberUid: string) => Promise<void>;
}

export default function AdminPanel({ barbers, theme, onClose, getKycSubmission, approveBarberKyc, rejectBarberKyc }: AdminPanelProps) {
  const [dossiers, setDossiers] = useState<Record<string, KycSubmission | null>>({});
  const [busyUid, setBusyUid] = useState<string | null>(null);

  const pendingKyc = barbers.filter(b => b.kycStatus === 'pending');

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

  const cardClass = theme === 'dark' ? 'bg-mid-brown/30 border-gold/15' : 'bg-white border-gray-200';

  return (
    <div className={`min-h-screen pt-20 pb-16 px-4 md:px-8 font-dm-sans transition-colors duration-300 ${theme === 'dark' ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'}`}>
      <nav className={`fixed top-0 left-0 right-0 z-40 border-b px-6 py-4 flex items-center justify-between backdrop-blur-md ${theme === 'dark' ? 'bg-black/80 border-gold/20' : 'bg-white/80 border-gray-200 shadow-sm'}`}>
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-gold" />
          <span className="font-bebas text-xl tracking-widest text-gold">Admin BarberGo</span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 text-warm-gray hover:text-gold transition-colors text-[10px] font-bold uppercase tracking-widest"
        >
          <ArrowLeft size={14} /> Retour
        </button>
      </nav>

      <main className="max-w-3xl mx-auto space-y-10">
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
                        <a href={dossier.cinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[10px] text-gold underline">
                          <FileImage size={12} /> Voir la CIN
                        </a>
                        <a href={dossier.selfieUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[10px] text-gold underline">
                          <FileImage size={12} /> Voir le selfie
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
