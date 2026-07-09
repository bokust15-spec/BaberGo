import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, MapPin, Calendar, Sparkles, Apple, Play, ShieldCheck, Wallet, Quote, Menu, X, User } from 'lucide-react';
import CategoryRail from './CategoryRail';
import { SERVICE_CATEGORIES } from '../data/categories';
import { UserProfile } from '../hooks/useFirebase';

interface LandingPageProps {
  onLogin: () => void;
  theme: 'dark' | 'light';
  profile: UserProfile | null;
  onEnterApp: () => void;
  onRegisterOpen: (role?: 'client' | 'barber') => void;
  onFindNearby: () => void;
  onSelectCategory: (categoryId: string) => void;
}

// Distinct from WORK_GALLERY / HERO_MOSAIC / CATEGORY_PHOTOS on purpose — every photo
// on the page should be different so the interface doesn't feel repetitive.
const WORK_PHOTOS = {
  salonInterior: 'https://images.unsplash.com/photo-1643684391140-c5056cfd3436?q=80&w=900&auto=format&fit=crop',
  preciseFade: 'https://images.unsplash.com/photo-1606158436222-1896b18c5d25?q=80&w=700&auto=format&fit=crop',
  clipperWork: 'https://images.unsplash.com/photo-1457972729786-0411a3b2b626?q=80&w=700&auto=format&fit=crop',
  bwSalon: 'https://images.unsplash.com/photo-1630595271375-5073a6c0638b?q=80&w=1200&auto=format&fit=crop',
};

// Real BarberGo-provided photos (in SERVICE_CATEGORIES order) — Cheveux, Barbe,
// Main et pied, Make-up, Esthétique, Soin de visage, Massage, Beauté évènementiel.
const WORK_GALLERY = [
  // Cheveux
  { src: '/gallery/806_s-Tendance-coiffure-femme-coupe-Cyril-bazin-coiffeur-createur.jpg', alt: "Coiffeuse réalisant une coupe de précision" },
  { src: '/gallery/e01366032addce763b9a232f58d3069d.jpg', alt: "Pose de tresses sur cheveux bouclés" },
  { src: '/gallery/Gemini_Generated_Image_c9yfxcc9yfxcc9yf.png', alt: "Box braids réalisées en salon" },
  { src: '/gallery/Gemini_Generated_Image_us8qesus8qesus8q.png', alt: "Twists et locks coiffés par un barbier" },
  { src: '/gallery/tout-savoir-sur-lebrushing.png', alt: "Brushing en cours de réalisation" },
  { src: '/gallery/wig-bob-rouge.jpg', alt: "Perruque bob colorée sur femme noire" },
  { src: '/gallery/44b9fa0bfaabbe7fd296d957e74b015a.jpg', alt: "Coupe dégradée précise pour homme" },
  { src: 'https://images.unsplash.com/photo-1514336937476-a5b961020a5c?q=80&w=400&auto=format&fit=crop', alt: "Dégradé net réalisé à la tondeuse" },
  { src: 'https://images.unsplash.com/photo-1611431182782-cb1f5acd6e94?q=80&w=400&auto=format&fit=crop', alt: "Barbier coiffant un client en salon" },
  { src: 'https://images.unsplash.com/photo-1699641975121-5c3f55a553e5?q=80&w=400&auto=format&fit=crop', alt: "Coupe réalisée en barbershop traditionnel" },
  { src: 'https://images.unsplash.com/photo-1663077639920-f5ebd9a6296c?q=80&w=400&auto=format&fit=crop', alt: "Homme se faisant coiffer chez le barbier" },
  { src: 'https://images.unsplash.com/photo-1604355240616-5e907f42b431?q=80&w=400&auto=format&fit=crop', alt: "Finitions à la tondeuse sur la nuque" },
  // Barbe
  { src: '/gallery/homme-dans-salon-coiffure-se-coupe-cheveux-se-taille-barbe_1303-20953.avif', alt: "Taille de barbe en salon de coiffure" },
  // Main et pied
  { src: '/gallery/woman-getting-pedicure.jpg', alt: "Pose de vernis sur les ongles de pieds" },
  { src: '/gallery/manucure-glitter.jpg', alt: "Manucure pailletée réalisée" },
  // Make-up
  { src: '/gallery/Makeup-glowup.jpg', alt: "Application de maquillage au pinceau" },
  { src: '/gallery/Woman-having-her-makeup-done-rs.jpg', alt: "Maquillage coloré en cours d'application" },
  // Esthétique
  { src: '/gallery/bac-pro-esthetique-voies.jpg', alt: "Soins esthétiques du visage en institut" },
  { src: '/gallery/cil-a-cil.webp', alt: "Extensions de cils posées un à un" },
  // Soin de visage
  { src: '/gallery/PhotoSoinVisage.jpg', alt: "Masque de soin appliqué au visage" },
  // Massage
  { src: '/gallery/GettyImages-1175433234-034014dc5b9c45edaeaf04c7b80ceafc.jpg', alt: "Massage relaxant du dos" },
  { src: '/gallery/Gemini_Generated_Image_tmrns5tmrns5tmrn.png', alt: "Massage relaxant pour homme" },
  // Beauté évènementiel
  { src: '/gallery/ceremonie-du-henne-mariage-1536x615.jpg', alt: "Henné de mariage sur les mains" },
  { src: '/gallery/tatouage-henne-pied.webp', alt: "Application de henné sur le pied" },
  { src: '/gallery/Gemini_Generated_Image_6p7c2q6p7c2q6p7c.jpg', alt: "Maquillage de mariée avant la cérémonie" },
];

// Small mosaic of real photos filling the hero's right column, one per key prestation.
const HERO_MOSAIC = [
  { src: '/gallery/Gemini_Generated_Image_us8qesus8qesus8q.png', alt: "Twists tressés pour homme par un barbier" },
  { src: 'https://images.unsplash.com/photo-1690749138086-7422f71dc159?q=80&w=400&auto=format&fit=crop', alt: "Soin des mains minutieux" },
  { src: 'https://images.unsplash.com/photo-1728949202468-c37fdbd76856?q=80&w=400&auto=format&fit=crop', alt: "Soin du visage appliqué à un homme" },
  { src: '/gallery/homme-dans-salon-coiffure-se-coupe-cheveux-se-taille-barbe_1303-20953.avif', alt: "Homme se faisant coiffer en salon" },
  { src: '/gallery/44b9fa0bfaabbe7fd296d957e74b015a.jpg', alt: "Coupe dégradée précise pour homme" },
  { src: 'https://images.unsplash.com/photo-1716672042560-c59ebb0805e6?q=80&w=400&auto=format&fit=crop', alt: "Henné traditionnel sur les mains" },
];

// One representative real photo per prestation category, used as the background
// of the "Nos prestations" tiles so browsing categories feels tangible, not abstract.
const CATEGORY_PHOTOS: Record<string, string> = {
  'cheveux': 'https://images.unsplash.com/photo-1629397685944-7073f5589754?q=80&w=500&auto=format&fit=crop',
  'barbe': 'https://images.unsplash.com/photo-1506029214967-eef911357d1b?q=80&w=500&auto=format&fit=crop',
  'main-pied': 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?q=80&w=500&auto=format&fit=crop',
  'makeup': 'https://images.unsplash.com/photo-1709477542149-f4e0e21d590b?q=80&w=500&auto=format&fit=crop',
  'esthetique': 'https://images.unsplash.com/photo-1531299244174-d247dd4e5a66?q=80&w=500&auto=format&fit=crop',
  'soin-visage': 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?q=80&w=500&auto=format&fit=crop',
  'massage': 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?q=80&w=500&auto=format&fit=crop',
  'beaute-evenementiel': 'https://images.unsplash.com/photo-1732118400647-a81e3b37be87?q=80&w=500&auto=format&fit=crop',
};

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

export default function LandingPage({ onLogin, theme, profile, onEnterApp, onRegisterOpen, onFindNearby, onSelectCategory }: LandingPageProps) {
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
          <button onClick={profile ? onEnterApp : onLogin} className="whitespace-nowrap flex items-center gap-1.5 text-warm-gray text-sm font-medium uppercase tracking-widest hover:text-gold hover:underline underline-offset-8 decoration-gold transition-colors">
            {profile && <User size={14} />}
            {profile ? profile.firstName : 'Se connecter'}
          </button>
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
            <button onClick={() => { setIsMobileMenuOpen(false); profile ? onEnterApp() : onLogin(); }} className="py-3 flex items-center gap-1.5 text-left text-warm-gray text-sm font-medium uppercase tracking-widest hover:text-gold transition-colors border-b border-gold/10">
              {profile && <User size={14} />}
              {profile ? profile.firstName : 'Se connecter'}
            </button>
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
              {[...WORK_GALLERY, ...WORK_GALLERY].map((item, i) => (
                <div key={i} className="w-24 h-32 sm:w-28 sm:h-36 md:w-32 md:h-40 shrink-0 rounded-xl overflow-hidden border border-gold/20 shadow-lg">
                  <img src={item.src} alt={item.alt} className="w-full h-full object-cover pointer-events-none" loading="lazy" draggable={false} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* HERO BACKGROUND PHOTO — experiment replacing the photo mosaic to sell the
            "à domicile" feeling more directly (cozy home setting behind the content). */}
        <div className="relative flex-1 flex flex-col justify-center overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=1600&auto=format&fit=crop"
            alt="Expert BarberGo réalisant une taille de barbe pour un client"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/70 to-black/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />

          <div className="relative z-10 px-6 md:px-16 py-14 md:py-20 font-open-sans">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-bricolage tracking-normal text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl leading-[0.95] md:leading-[0.9] mb-4 md:mb-6 md:whitespace-nowrap text-white"
            >
              Réservez votre <span className="gold-gradient-text italic">moment de beauté chez vous.</span>
            </motion.h1>

            <p className="font-bold uppercase tracking-widest text-xl md:text-2xl mb-4 text-white">Beauté & bien-être à domicile</p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mb-6 md:mb-8 w-full"
            >
              <p className="text-xs uppercase tracking-widest font-bold mb-3 text-white/70">Parcourir par prestation</p>
              <CategoryRail selected={null} onSelect={(id) => id ? onSelectCategory(id) : onFindNearby()} theme="dark" size="lg" />
            </motion.div>

            <div className="max-w-2xl">
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-white/80 text-sm md:text-lg max-w-lg mb-6 md:mb-10 leading-relaxed font-light"
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
                    className="flex items-center gap-2 md:gap-3 px-5 py-3 md:px-8 md:py-4 text-[11px] md:text-xs font-bold uppercase tracking-widest border border-white/30 text-white/80 hover:text-gold hover:border-gold transition-all"
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
                  <div className="text-[9px] md:text-[10px] text-white/70 uppercase tracking-widest font-bold">Experts</div>
                </div>
                <div className="text-center md:text-left">
                  <div className="text-xl md:text-3xl font-bebas text-gold mb-1">50K+</div>
                  <div className="text-[9px] md:text-[10px] text-white/70 uppercase tracking-widest font-bold">utilisateurs</div>
                </div>
                <div className="text-center md:text-left">
                  <div className="text-xl md:text-3xl font-bebas text-gold mb-1">4.9/5</div>
                  <div className="text-[9px] md:text-[10px] text-white/70 uppercase tracking-widest font-bold">Score</div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES / PRESTATIONS */}
      <section id="services" className={`py-24 px-6 md:px-16 relative ${theme === 'dark' ? 'bg-dark-brown/40' : 'bg-cream'}`}>
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="text-gold text-xs uppercase tracking-[0.3em] font-medium block mb-4">Nos prestations</span>
            <h2 className={`text-4xl md:text-6xl mb-6 uppercase ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
              Tout ce dont vous avez <span className="italic gold-gradient-text">besoin</span>
            </h2>
            <p className="text-warm-gray max-w-2xl mx-auto">Choisissez une prestation pour voir les experts qui la proposent près de chez vous.</p>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {SERVICE_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  className="relative aspect-[4/5] rounded-xl overflow-hidden border-2 border-gold/15 group text-left shadow-md hover:shadow-xl hover:-translate-y-1 hover:border-gold/50 transition-all duration-300"
                >
                  <img
                    src={CATEGORY_PHOTOS[cat.id]}
                    alt={cat.label}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10" />
                  <div className="absolute inset-0 p-4 flex flex-col justify-end">
                    <div className="w-9 h-9 mb-2 bg-gold/90 rounded-full flex items-center justify-center text-black">
                      <Icon size={16} />
                    </div>
                    <h3 className="font-bebas text-lg tracking-widest uppercase text-white">{cat.label}</h3>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* MISSION */}
      <section className={`py-24 px-6 md:px-16 relative ${theme === 'dark' ? 'bg-black' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
          >
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
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-2 gap-4"
          >
            <div className="col-span-2 h-56 rounded-lg overflow-hidden border border-gold/15 shadow-md hover:shadow-xl transition-shadow duration-300">
              <img
                src={WORK_PHOTOS.salonInterior}
                alt="Soin esthétique réalisé par un expert BarberGo"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="h-48 rounded-lg overflow-hidden border border-gold/15 shadow-md hover:shadow-xl transition-shadow duration-300">
              <img
                src={WORK_PHOTOS.preciseFade}
                alt="Maquillage glamour réalisé par un expert BarberGo"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="h-48 rounded-lg overflow-hidden border border-gold/15 shadow-md hover:shadow-xl transition-shadow duration-300">
              <img
                src={WORK_PHOTOS.clipperWork}
                alt="Manucure réalisée par un expert BarberGo"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-24 px-6 md:px-16 border-y border-gold/10 relative overflow-hidden">
        <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-dark-brown/70' : 'bg-cream'}`} />
        <img
          src={WORK_PHOTOS.bwSalon}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-[0.06] pointer-events-none select-none"
        />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="max-w-7xl mx-auto text-center mb-20 relative z-10"
        >
          <span className="text-gold text-xs uppercase tracking-[0.3em] font-medium block mb-4">Processus simple</span>
          <h2 className={`text-5xl md:text-7xl mb-6 uppercase ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Comment <span className="italic gold-gradient-text text-bebas underline decoration-gold/30">trouver votre expert</span></h2>
          <p className="text-warm-gray max-w-2xl mx-auto">Votre moment de beauté n'a jamais été aussi facile à réserver. Trouvez, réservez et profitez de l'expertise d'un pro en quatre étapes.</p>
        </motion.div>

        <div className={`max-w-7xl mx-auto grid md:grid-cols-4 gap-0 border border-gold/10 relative z-10 ${theme === 'dark' ? 'bg-black/20' : 'bg-white'}`}>
          {[
            { num: '01', icon: <MapPin />, title: "Localisation", desc: "Activez votre position pour voir les experts autour de vous, où que vous soyez." },
            { num: '02', icon: <Sparkles />, title: "Exploration", desc: "Consultez les portfolios et avis certifiés des experts locaux." },
            { num: '03', icon: <Calendar />, title: "Réservation", desc: "Choisissez votre créneau et payez en toute sécurité." },
            { num: '04', icon: <Star />, title: "Satisfaction", desc: "Le prestataire vient à vous ou vous accueille. Notez votre expérience." }
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="p-10 border border-gold/5 hover:bg-gold/5 transition-colors relative group overflow-hidden"
            >
               <div className="absolute top-[-1rem] right-4 text-9xl font-bebas text-gold/5 select-none leading-none group-hover:text-gold/10 transition-all">{item.num}</div>
               <div className="w-12 h-12 bg-gold/10 border border-gold/20 flex items-center justify-center text-gold mb-6 relative z-10">{item.icon}</div>
               <h3 className={`text-xl mb-4 relative z-10 font-bebas tracking-wider ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{item.title}</h3>
               <p className="text-warm-gray text-sm leading-relaxed relative z-10">{item.desc}</p>
            </motion.div>
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
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="max-w-7xl mx-auto text-center mb-16"
        >
          <span className="text-gold text-xs uppercase tracking-[0.3em] font-medium block mb-4">Ils nous font confiance</span>
          <h2 className={`text-5xl md:text-7xl mb-6 uppercase ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Avis de nos <span className="italic gold-gradient-text">utilisateurs</span></h2>
        </motion.div>
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="luxury-card p-8 relative overflow-hidden hover:-translate-y-1 hover:shadow-xl"
            >
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
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA SECTION */}
      <section className={`py-32 relative flex flex-col items-center text-center px-6 overflow-hidden ${theme === 'dark' ? 'bg-black' : 'bg-cream'}`}>
         <div className="absolute text-[25vw] font-bebas text-gold/5 leading-none select-none -bottom-10 pointer-events-none">BARBERGO</div>
         <motion.div
           initial={{ opacity: 0, y: 30 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true, amount: 0.3 }}
           transition={{ duration: 0.6 }}
           className="relative z-10 flex flex-col items-center"
         >
           <span className="text-gold text-xs uppercase tracking-[0.3em] font-medium block mb-6 px-4 py-1 border border-gold/20 rounded-full">Rejoignez-nous aujourd'hui</span>
           <h2 className={`text-6xl md:text-8xl mb-10 max-w-4xl uppercase ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Prêt pour votre <br /><span className="gold-gradient-text italic">prochain moment de beauté ?</span></h2>
           <div className="flex flex-col items-center gap-5">
              <button onClick={onFindNearby} className="btn-primary flex items-center gap-3 !px-10 !py-4">
                 <MapPin size={18} />
                 Trouver un expert autour de moi
              </button>
              <span className="text-warm-gray text-[10px] uppercase tracking-widest flex items-center gap-2">
                 <Apple size={14} /> App Store <span className="text-gold">·</span> <Play size={14} /> Google Play — bientôt disponible
              </span>
           </div>
         </motion.div>
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
            <div>
               <h4 className="text-gold text-[10px] uppercase font-bold tracking-[0.2em] mb-6">Compagnie</h4>
               <ul className="flex flex-col gap-3">
                 <li><a href="#services" className="text-warm-gray text-sm hover:text-white transition-colors">Nos prestations</a></li>
                 <li><button onClick={() => onRegisterOpen('barber')} className="text-warm-gray text-sm hover:text-white transition-colors text-left">Devenir partenaire</button></li>
                 <li><button onClick={profile ? onEnterApp : onLogin} className="text-warm-gray text-sm hover:text-white transition-colors text-left">{profile ? profile.firstName : 'Se connecter'}</button></li>
               </ul>
            </div>
            <div>
               <h4 className="text-gold text-[10px] uppercase font-bold tracking-[0.2em] mb-6">Support</h4>
               <ul className="flex flex-col gap-3">
                 <li><a href="#how" className="text-warm-gray text-sm hover:text-white transition-colors">Comment ça marche</a></li>
                 <li><a href="#avis" className="text-warm-gray text-sm hover:text-white transition-colors">Avis clients</a></li>
                 <li><button onClick={onFindNearby} className="text-warm-gray text-sm hover:text-white transition-colors text-left">Trouver un expert</button></li>
               </ul>
            </div>
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
