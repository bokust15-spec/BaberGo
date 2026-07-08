import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, MapPin, Calendar, Sparkles, Apple, Play, ShieldCheck, Wallet, Quote, Menu, X } from 'lucide-react';
import CategoryRail from './CategoryRail';

interface LandingPageProps {
  onLogin: () => void;
  theme: 'dark' | 'light';
  onRegisterOpen: (role?: 'client' | 'barber') => void;
  onFindNearby: () => void;
  onSelectCategory: (categoryId: string) => void;
}

const WORK_PHOTOS = {
  heroBeardTrim: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=900&auto=format&fit=crop',
  salonInterior: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=900&auto=format&fit=crop',
  preciseFade: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=700&auto=format&fit=crop',
  clipperWork: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=700&auto=format&fit=crop',
  bwSalon: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1200&auto=format&fit=crop',
};

const HAIR_GALLERY = [
  { src: 'https://images.unsplash.com/photo-1647140655214-e4a2d914971f?q=80&w=400&auto=format&fit=crop', alt: "Taille de barbe précise pour homme" },
  { src: 'https://images.unsplash.com/photo-1572955304332-bf714bd49add?q=80&w=400&auto=format&fit=crop', alt: "Tresses box braids sur cheveux métissés" },
  { src: 'https://images.unsplash.com/photo-1635273051937-a0ddef9573b6?q=80&w=400&auto=format&fit=crop', alt: "Dégradé homme réalisé par un barbier" },
  { src: 'https://images.unsplash.com/photo-1613099084406-4b9140fc780a?q=80&w=400&auto=format&fit=crop', alt: "Tresses fines sur cheveux métissés" },
  { src: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=400&auto=format&fit=crop', alt: "Coupe de précision homme" },
  { src: 'https://images.unsplash.com/photo-1572954889228-2b12a55144d1?q=80&w=400&auto=format&fit=crop', alt: "Tresses longues sur cheveux métissés" },
  { src: 'https://images.unsplash.com/photo-1648221122323-572c13a31663?q=80&w=400&auto=format&fit=crop', alt: "Dégradé au rasoir pour homme" },
  { src: 'https://images.unsplash.com/photo-1612459284970-e8f027596582?q=80&w=400&auto=format&fit=crop', alt: "Tresses courtes sur cheveux métissés" },
  { src: 'https://images.unsplash.com/photo-1645736279976-59f8fd22720c?q=80&w=400&auto=format&fit=crop', alt: "Belle perruque longue sur femme noire" },
  { src: 'https://images.unsplash.com/photo-1695662917617-a1bfc0e2fbed?q=80&w=400&auto=format&fit=crop', alt: "Crête stylée pour homme" },
  { src: 'https://images.unsplash.com/photo-1560869713-bf165a9cfac1?q=80&w=400&auto=format&fit=crop', alt: "Boucles soyeuses pour femme" },
  { src: 'https://images.unsplash.com/photo-1644199161554-f9e84cd64b7b?q=80&w=400&auto=format&fit=crop', alt: "Tête rasée (boule à zéro) avec barbe" },
  { src: 'https://images.unsplash.com/photo-1605980766335-d3a41c7332a1?q=80&w=400&auto=format&fit=crop', alt: "Balayage blond pour femme" },
  { src: 'https://images.unsplash.com/photo-1761792390398-717211a593db?q=80&w=400&auto=format&fit=crop', alt: "Boule à zéro platine pour homme" },
  { src: 'https://images.unsplash.com/photo-1572863141204-83031c77e65a?q=80&w=400&auto=format&fit=crop', alt: "Coiffure lumineuse pour femme" },
];

const TESTIMONIALS = [
  {
    name: 'Amine B.',
    role: 'Client · Casablanca',
    quote: "Réservé en 5 minutes, l'expert est arrivé à l'heure chez moi. Une prestation impeccable sans bouger de chez moi.",
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop',
  },
  {
    name: 'Sophia El K.',
    role: 'Cliente · Rabat',
    quote: "Enfin une appli qui rend la prise de rendez-vous simple. Les avis certifiés m'ont aidée à choisir le bon expert.",
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop',
  },
  {
    name: 'Yassine T.',
    role: 'Expert partenaire · Marrakech',
    quote: "En tant qu'expert indépendant, BarberGo m'a permis de développer ma clientèle rapidement, sans frais fixes.",
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=200&auto=format&fit=crop',
  },
];

export default function LandingPage({ onLogin, theme, onRegisterOpen, onFindNearby, onSelectCategory }: LandingPageProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, scrollLeft: 0 });
  // Timestamp of the last user interaction. The band auto-resumes a short moment after
  // the user stops touching it, so it can never get stuck paused (e.g. cursor leaving
  // the window mid-drag without firing a pointerup/pointerleave).
  const lastInteractionRef = useRef(0);
  const RESUME_DELAY = 500;
  // scrollLeft is truncated to whole pixels by the browser, so accumulating sub-1px
  // increments directly on it never progresses. Track the precise position ourselves
  // and only write the (rounded) result to the DOM each frame.
  const scrollPosRef = useRef(0);

  useEffect(() => {
    let rafId: number;
    const step = () => {
      const el = galleryRef.current;
      if (el) {
        const half = el.scrollWidth / 2;

        if (draggingRef.current) {
          scrollPosRef.current = el.scrollLeft;
        } else {
          // Something other than our own last write moved the position (native
          // touch/trackpad panning, momentum scrolling, etc. — the browser stops
          // sending us pointermove events once it takes over a native scroll
          // gesture, so this is the only reliable way to notice it). Treat it as
          // fresh interaction so the auto-scroll never fights the user's gesture.
          if (Math.abs(el.scrollLeft - scrollPosRef.current) > 1) {
            lastInteractionRef.current = Date.now();
            scrollPosRef.current = el.scrollLeft;
          }
          const idle = Date.now() - lastInteractionRef.current > RESUME_DELAY;
          if (idle && half > 0) {
            scrollPosRef.current += 0.25;
            if (scrollPosRef.current >= half) scrollPosRef.current -= half;
            else if (scrollPosRef.current < 0) scrollPosRef.current += half;
          }
          el.scrollLeft = scrollPosRef.current;
        }
      }
      rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);

    const clearDrag = () => { draggingRef.current = false; };
    window.addEventListener('pointerup', clearDrag);
    window.addEventListener('pointercancel', clearDrag);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointerup', clearDrag);
      window.removeEventListener('pointercancel', clearDrag);
    };
  }, []);

  const markGalleryInteraction = () => { lastInteractionRef.current = Date.now(); };

  const handleGalleryPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    markGalleryInteraction();
    if (e.pointerType === 'mouse') {
      draggingRef.current = true;
      dragStartRef.current = { x: e.clientX, scrollLeft: galleryRef.current?.scrollLeft ?? 0 };
      // Keep receiving move/up events on this element even if the cursor drifts
      // outside its (fairly short) bounds while dragging horizontally.
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };
  const handleGalleryPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    markGalleryInteraction();
    if (!draggingRef.current || !galleryRef.current) return;
    galleryRef.current.scrollLeft = dragStartRef.current.scrollLeft - (e.clientX - dragStartRef.current.x);
  };
  const stopGalleryDrag = () => {
    draggingRef.current = false;
  };

  return (
    <div className="relative z-10 transition-colors duration-300">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-nav px-6 md:px-16 py-4 grid grid-cols-3 items-center">
        <a href="#hero" className="logo text-2xl text-gold shrink-0 justify-self-start">Barber<span className={theme === 'dark' ? 'text-white' : 'text-black'}>Go</span></a>
        <div className="hidden md:flex gap-5 lg:gap-8 items-center justify-self-center">
          <a href="#hero" className="whitespace-nowrap text-warm-gray text-sm font-medium uppercase tracking-widest hover:text-gold hover:underline underline-offset-8 decoration-gold transition-colors">Accueil</a>
          <a href="#services" className="whitespace-nowrap text-warm-gray text-sm font-medium uppercase tracking-widest hover:text-gold hover:underline underline-offset-8 decoration-gold transition-colors">Services</a>
          <button onClick={() => onRegisterOpen('barber')} className="whitespace-nowrap text-warm-gray text-sm font-medium uppercase tracking-widest hover:text-gold hover:underline underline-offset-8 decoration-gold transition-colors">Je suis expert(e) beauté</button>
          <button onClick={onLogin} className="whitespace-nowrap text-warm-gray text-sm font-medium uppercase tracking-widest hover:text-gold hover:underline underline-offset-8 decoration-gold transition-colors">Se connecter</button>
          <a href="#how" className="whitespace-nowrap text-warm-gray text-sm font-medium uppercase tracking-widest hover:text-gold hover:underline underline-offset-8 decoration-gold transition-colors">Comment ça marche</a>
          <a href="#avis" className="whitespace-nowrap text-warm-gray text-sm font-medium uppercase tracking-widest hover:text-gold hover:underline underline-offset-8 decoration-gold transition-colors">Avis</a>
        </div>
        <div className="justify-self-end flex items-center">
          <button
            onClick={() => setIsMobileMenuOpen(prev => !prev)}
            aria-label="Ouvrir le menu"
            aria-expanded={isMobileMenuOpen}
            className={`md:hidden mr-14 p-2 rounded-full transition-colors ${theme === 'dark' ? 'text-gold hover:bg-white/10' : 'text-gold hover:bg-black/5'}`}
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* MOBILE NAV PANEL */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className={`md:hidden fixed top-[64px] left-0 right-0 z-40 glass-nav border-t-0 flex flex-col px-6 py-4 gap-1`}
          >
            <a onClick={() => setIsMobileMenuOpen(false)} href="#hero" className="py-3 text-warm-gray text-sm font-medium uppercase tracking-widest hover:text-gold transition-colors border-b border-gold/10">Accueil</a>
            <a onClick={() => setIsMobileMenuOpen(false)} href="#services" className="py-3 text-warm-gray text-sm font-medium uppercase tracking-widest hover:text-gold transition-colors border-b border-gold/10">Services</a>
            <button onClick={() => { setIsMobileMenuOpen(false); onRegisterOpen('barber'); }} className="py-3 text-left text-warm-gray text-sm font-medium uppercase tracking-widest hover:text-gold transition-colors border-b border-gold/10">Je suis expert(e) beauté</button>
            <button onClick={() => { setIsMobileMenuOpen(false); onLogin(); }} className="py-3 text-left text-warm-gray text-sm font-medium uppercase tracking-widest hover:text-gold transition-colors border-b border-gold/10">Se connecter</button>
            <a onClick={() => setIsMobileMenuOpen(false)} href="#how" className="py-3 text-warm-gray text-sm font-medium uppercase tracking-widest hover:text-gold transition-colors border-b border-gold/10">Comment ça marche</a>
            <a onClick={() => setIsMobileMenuOpen(false)} href="#avis" className="py-3 text-warm-gray text-sm font-medium uppercase tracking-widest hover:text-gold transition-colors">Avis</a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HERO */}
      <section id="hero" className="min-h-screen pt-20 md:pt-24 pb-10 md:pb-16 flex flex-col relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none select-none text-[20vw] font-bebas text-gold tracking-widest whitespace-nowrap z-0">
          BARBERGO
        </div>

        {/* GALLERY BAND: real haircuts & braids, full-bleed scrolling strip. Auto-scrolls, but users can drag/swipe to go faster or pause it themselves. */}
        <div className="relative w-full mb-10 md:mb-14 z-10">
          <div
            ref={galleryRef}
            onPointerEnter={markGalleryInteraction}
            onPointerLeave={markGalleryInteraction}
            onPointerDown={handleGalleryPointerDown}
            onPointerMove={handleGalleryPointerMove}
            onPointerUp={stopGalleryDrag}
            onPointerCancel={stopGalleryDrag}
            onWheel={markGalleryInteraction}
            className="relative left-1/2 right-1/2 -mx-[50vw] w-screen overflow-x-auto scrollbar-hide py-1 cursor-grab active:cursor-grabbing"
          >
            <div className="flex gap-4 w-max select-none">
              {[...HAIR_GALLERY, ...HAIR_GALLERY].map((item, i) => (
                <div key={i} className="w-24 h-32 sm:w-28 sm:h-36 md:w-32 md:h-40 shrink-0 rounded-xl overflow-hidden border border-gold/20 shadow-lg">
                  <img src={item.src} alt={item.alt} className="w-full h-full object-cover pointer-events-none" loading="lazy" draggable={false} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 md:px-16 flex flex-col md:flex-row items-center flex-1">
        <div className="flex-1 relative z-10 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-4 md:mb-6 w-full"
          >
            <p className={`text-[10px] uppercase tracking-widest font-bold mb-2 ${theme === 'dark' ? 'text-warm-gray' : 'text-gray-500'}`}>Parcourir par prestation</p>
            <CategoryRail selected={null} onSelect={(id) => id ? onSelectCategory(id) : onFindNearby()} theme={theme} />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`font-bricolage tracking-normal text-4xl sm:text-5xl md:text-8xl lg:text-9xl leading-[0.95] md:leading-[0.9] mb-3 md:mb-6 ${theme === 'dark' ? 'text-white' : 'text-black'}`}
          >
            Réservez votre<br />
            <span className="gold-gradient-text italic">moment beauté.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-warm-gray text-sm md:text-lg max-w-lg mb-6 md:mb-10 leading-relaxed font-light"
          >
            BarberGo met en relation les meilleurs talents beauté & bien-être avec les clients les plus exigeants.
            À domicile ou en salon — réservez votre prestation en un clic, partout dans le monde.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col gap-4 w-fit"
          >
            <div className="flex flex-wrap gap-3 md:gap-4">
              <button onClick={onFindNearby} className="btn-primary flex items-center gap-2 md:gap-3 !px-5 !py-3 md:!px-8 md:!py-3 text-[11px] md:text-sm">
                <MapPin size={16} className="shrink-0" />
                Trouver un expert autour de moi
              </button>
              <button
                onClick={() => onRegisterOpen('barber')}
                className={`flex items-center gap-2 md:gap-3 px-5 py-3 md:px-8 md:py-4 text-[11px] md:text-xs font-bold uppercase tracking-widest border transition-all ${theme === 'dark' ? 'border-gold/30 text-warm-gray hover:text-gold hover:border-gold' : 'border-gold/30 text-warm-gray hover:text-gold hover:border-gold'}`}
              >
                <Sparkles size={14} className="shrink-0" />
                Je suis expert(e) beauté
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex gap-6 sm:gap-8 md:gap-12 mt-8 md:mt-16"
          >
            <div className="text-center md:text-left">
              <div className="text-xl md:text-3xl font-bebas text-gold mb-1">5,000+</div>
              <div className="text-[9px] md:text-[10px] text-warm-gray uppercase tracking-widest font-bold">Experts</div>
            </div>
            <div className="text-center md:text-left">
              <div className="text-xl md:text-3xl font-bebas text-gold mb-1">50K+</div>
              <div className="text-[9px] md:text-[10px] text-warm-gray uppercase tracking-widest font-bold">utilisateurs</div>
            </div>
            <div className="text-center md:text-left">
              <div className="text-xl md:text-3xl font-bebas text-gold mb-1">4.9/5</div>
              <div className="text-[9px] md:text-[10px] text-warm-gray uppercase tracking-widest font-bold">Score</div>
            </div>
          </motion.div>
        </div>

        {/* HERO PHOTO */}
        <div className="flex-1 w-full flex flex-col items-center justify-center mt-8 md:mt-0 relative z-10">
          <p className={`font-bold uppercase tracking-widest text-2xl md:text-3xl mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Beauté & bien-être à domicile</p>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative w-[240px] sm:w-[320px] md:w-[460px]"
          >
            <img
              src={WORK_PHOTOS.heroBeardTrim}
              alt="Expert BarberGo réalisant une prestation pour un client"
              className="w-full h-[340px] sm:h-[440px] md:h-[620px] object-cover rounded-2xl border-2 border-gold/25 shadow-2xl"
            />
            <div className="absolute bottom-0 left-0 right-0 p-4 rounded-b-2xl bg-gradient-to-t from-black/85 via-black/40 to-transparent">
              <p className="text-gold font-bold italic text-center text-xl md:text-2xl">BarberGo vous fait gagner du temps !</p>
            </div>
          </motion.div>
        </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className={`py-24 px-6 md:px-16 relative ${theme === 'dark' ? 'bg-black' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-gold text-xs uppercase tracking-[0.3em] font-medium block mb-4">Notre mission</span>
            <h2 className={`text-4xl md:text-6xl mb-6 uppercase ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
              On connecte les <span className="italic gold-gradient-text">talents</span> aux clients
            </h2>
            <p className="text-warm-gray leading-relaxed mb-10">
              BarberGo est la plateforme qui met en relation des experts beauté & bien-être indépendants vérifiés avec des
              clients à la recherche d'une prestation de qualité. Le client localise un expert proche de lui, consulte son
              profil, ses tarifs et ses avis certifiés, puis réserve un créneau en quelques secondes. Le prestataire reçoit
              la demande, confirme le rendez-vous et se déplace à domicile ou reçoit en salon — le paiement est sécurisé
              directement dans l'application.
            </p>
            <div className="space-y-6">
              {[
                { icon: <MapPin size={18} />, title: 'Géolocalisation instantanée', desc: "Trouvez les experts disponibles autour de vous en temps réel." },
                { icon: <ShieldCheck size={18} />, title: 'Experts vérifiés (KYC)', desc: "CIN et selfie de validation contrôlés avant toute mise en relation." },
                { icon: <Wallet size={18} />, title: 'Paiement & réservation sécurisés', desc: "Réservez, payez et laissez un avis, le tout depuis l'application." },
              ].map((f, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="w-10 h-10 shrink-0 bg-gold/10 border border-gold/20 flex items-center justify-center text-gold rounded-sm">{f.icon}</div>
                  <div>
                    <h4 className={`font-bebas tracking-wider text-lg mb-1 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{f.title}</h4>
                    <p className="text-warm-gray text-sm leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <img
              src={WORK_PHOTOS.salonInterior}
              alt="Salon partenaire BarberGo"
              className="col-span-2 h-56 w-full object-cover rounded-lg border border-gold/15"
            />
            <img
              src={WORK_PHOTOS.preciseFade}
              alt="Prestation de précision réalisée par un expert BarberGo"
              className="h-48 w-full object-cover rounded-lg border border-gold/15"
            />
            <img
              src={WORK_PHOTOS.clipperWork}
              alt="Expert BarberGo au travail"
              className="h-48 w-full object-cover rounded-lg border border-gold/15"
            />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-24 px-6 md:px-16 border-y border-gold/10 relative overflow-hidden">
        <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-dark-brown/70' : 'bg-gray-50'}`} />
        <img
          src={WORK_PHOTOS.bwSalon}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-[0.06] pointer-events-none select-none"
        />
        <div className="max-w-7xl mx-auto text-center mb-20 relative z-10">
          <span className="text-gold text-xs uppercase tracking-[0.3em] font-medium block mb-4">Processus simple</span>
          <h2 className={`text-5xl md:text-7xl mb-6 uppercase ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Comment <span className="italic gold-gradient-text text-bebas underline decoration-gold/30">trouver votre expert</span></h2>
          <p className="text-warm-gray max-w-2xl mx-auto">Votre moment beauté n'a jamais été aussi facile à réserver. Trouvez, réservez et profitez de l'expertise d'un pro en quatre étapes.</p>
        </div>

        <div className={`max-w-7xl mx-auto grid md:grid-cols-4 gap-0 border border-gold/10 relative z-10 ${theme === 'dark' ? 'bg-black/20' : 'bg-white'}`}>
          {[
            { num: '01', icon: <MapPin />, title: "Localisation", desc: "Activez votre position pour voir les experts autour de vous, où que vous soyez." },
            { num: '02', icon: <Sparkles />, title: "Exploration", desc: "Consultez les portfolios et avis certifiés des experts locaux." },
            { num: '03', icon: <Calendar />, title: "Réservation", desc: "Choisissez votre créneau et payez en toute sécurité." },
            { num: '04', icon: <Star />, title: "Satisfaction", desc: "Le prestataire vient à vous ou vous accueille. Notez votre expérience." }
          ].map((item, i) => (
            <div key={i} className="p-10 border border-gold/5 hover:bg-gold/5 transition-colors relative group overflow-hidden">
               <div className="absolute top-[-1rem] right-4 text-9xl font-bebas text-gold/5 select-none leading-none group-hover:text-gold/10 transition-all">{item.num}</div>
               <div className="w-12 h-12 bg-gold/10 border border-gold/20 flex items-center justify-center text-gold mb-6 relative z-10">{item.icon}</div>
               <h3 className={`text-xl mb-4 relative z-10 font-bebas tracking-wider ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{item.title}</h3>
               <p className="text-warm-gray text-sm leading-relaxed relative z-10">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-12 relative z-10">
          <button onClick={onFindNearby} className="btn-primary flex items-center gap-3">
            <MapPin size={18} />
            Trouver un expert autour de moi
          </button>
        </div>
      </section>

      {/* AVIS */}
      <section id="avis" className={`py-24 px-6 md:px-16 ${theme === 'dark' ? 'bg-black' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto text-center mb-16">
          <span className="text-gold text-xs uppercase tracking-[0.3em] font-medium block mb-4">Ils nous font confiance</span>
          <h2 className={`text-5xl md:text-7xl mb-6 uppercase ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Avis de nos <span className="italic gold-gradient-text">utilisateurs</span></h2>
        </div>
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="luxury-card p-8 relative overflow-hidden">
              <Quote className="absolute top-6 right-6 text-gold/10" size={48} />
              <div className="flex gap-1 mb-4 relative z-10">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} size={14} className="text-gold fill-gold" />
                ))}
              </div>
              <p className="text-warm-gray text-sm leading-relaxed mb-6 relative z-10">"{t.quote}"</p>
              <div className="flex items-center gap-3 relative z-10">
                <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-full object-cover border border-gold/30" />
                <div>
                  <div className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{t.name}</div>
                  <div className="text-warm-gray text-[10px] uppercase tracking-widest">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA SECTION */}
      <section className={`py-32 relative flex flex-col items-center text-center px-6 overflow-hidden ${theme === 'dark' ? 'bg-black' : 'bg-white'}`}>
         <div className="absolute text-[25vw] font-bebas text-gold/5 leading-none select-none -bottom-10 pointer-events-none">BARBERGO</div>
         <span className="text-gold text-xs uppercase tracking-[0.3em] font-medium block mb-6 px-4 py-1 border border-gold/20 rounded-full">Rejoignez-nous aujourd'hui</span>
         <h2 className={`text-6xl md:text-8xl mb-10 max-w-4xl uppercase ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Prêt pour votre <br /><span className="gold-gradient-text italic">prochain moment beauté ?</span></h2>
         <div className="flex flex-wrap justify-center gap-6 relative z-10">
            <button className="bg-mid-brown border border-gold/20 px-8 py-4 flex items-center gap-4 rounded-lg hover:border-gold/50 transition-all">
               <Apple size={24} className="text-white" />
               <div className="text-left">
                  <div className="text-[10px] text-warm-gray uppercase tracking-widest leading-none">Download on</div>
                  <div className="text-lg text-white font-bold">App Store</div>
               </div>
            </button>
            <button className="bg-mid-brown border border-gold/20 px-8 py-4 flex items-center gap-4 rounded-lg hover:border-gold/50 transition-all">
               <Play size={24} className="text-white" />
               <div className="text-left">
                  <div className="text-[10px] text-warm-gray uppercase tracking-widest leading-none">Get it on</div>
                  <div className="text-lg text-white font-bold">Google Play</div>
               </div>
            </button>
         </div>
      </section>

      {/* FOOTER */}
      <footer className={`border-t border-gold/10 pt-20 pb-10 px-6 md:px-16 ${theme === 'dark' ? 'bg-black' : 'bg-gray-900 text-white'}`}>
         <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-1">
               <a href="#hero" className="logo text-2xl text-gold block mb-6 font-bebas">Barber<span className="text-white">Go</span></a>
               <p className="text-warm-gray text-sm leading-relaxed">
                  Connecter les meilleurs talents beauté & bien-être avec les clients exigeants, partout dans le monde.
               </p>
            </div>
            <div>
               <h4 className="text-gold text-[10px] uppercase font-bold tracking-[0.2em] mb-6">Rubriques</h4>
               <ul className="flex flex-col gap-3">
                 <li><a href="#hero" className="text-warm-gray text-sm hover:text-white transition-colors">Accueil</a></li>
                 <li><a href="#services" className="text-warm-gray text-sm hover:text-white transition-colors">Services</a></li>
                 <li><a href="#how" className="text-warm-gray text-sm hover:text-white transition-colors">Comment ça marche</a></li>
                 <li><a href="#avis" className="text-warm-gray text-sm hover:text-white transition-colors">Avis</a></li>
               </ul>
            </div>
            {['Compagnie', 'Support'].map((col, i) => (
               <div key={i}>
                  <h4 className="text-gold text-[10px] uppercase font-bold tracking-[0.2em] mb-6">{col}</h4>
                  <ul className="flex flex-col gap-3">
                    {['Trouver un expert', 'Réservations', 'Avis'].map((link, j) => (
                      <li key={j}><a href="#" className="text-warm-gray text-sm hover:text-white transition-colors">{link}</a></li>
                    ))}
                  </ul>
               </div>
            ))}
         </div>
         <div className="border-t border-gold/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-warm-gray text-[10px] uppercase tracking-widest">© 2025 BarberGo. Tous droits réservés.</p>
            <div className="flex gap-6">
              <a href="#" className="text-gold text-[10px] uppercase tracking-widest">Confidentialité</a>
              <a href="#" className="text-gold text-[10px] uppercase tracking-widest">CGU</a>
            </div>
         </div>
      </footer>
    </div>
  );
}
