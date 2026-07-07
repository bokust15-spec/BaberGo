import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Search, Scissors, Star, User, Users, ChevronRight, X, ArrowLeft, BadgeCheck, CalendarDays } from 'lucide-react';
import { UserProfile, useFirebase } from '../hooks/useFirebase';
import BookingModal from './BookingModal';
import CreateAnnonceForm from './CreateAnnonceForm';

interface AppMVPProps {
  onLogout: () => void;
  theme: 'dark' | 'light';
  profile: UserProfile | null;
  onLogoutFirebase: () => void;
}

// Barbers don't have a photo field yet, so give each one a stable, real portrait
// (same barber always gets the same face within a session) instead of a plain initial.
const BARBER_AVATARS = [
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?q=80&w=200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1499996860823-5214fcc65f8f?q=80&w=200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1645736279976-59f8fd22720c?q=80&w=200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1572955304332-bf714bd49add?q=80&w=200&auto=format&fit=crop',
];

function avatarFor(uid: string) {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = (hash * 31 + uid.charCodeAt(i)) >>> 0;
  return BARBER_AVATARS[hash % BARBER_AVATARS.length];
}

const PORTFOLIO_PHOTOS = [
  'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=300&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=300&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=300&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1648221122323-572c13a31663?q=80&w=300&auto=format&fit=crop',
];

const SALON_COVER_PHOTO = 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=900&auto=format&fit=crop';

// Until barbers can upload their own portfolio to Firestore, this mock feed shows the
// kind of looks they offer — same idea, real photos (all distinct from the ones used on
// the landing page), placeholder names/cities.
interface StylePost {
  id: string;
  photo: string;
  style: string;
  barberName: string;
  gender: 'homme' | 'femme';
  city: string;
  rating: number;
  priceFrom: number;
  // Days of the week (0 = dimanche ... 6 = samedi) this barber is available.
  availableDays: number[];
}

const MOROCCAN_CITIES = ['Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger', 'Meknès', 'Agadir', 'Oujda', 'Kénitra', 'Tétouan', 'Salé', 'Mohammedia'];
const MALE_FIRST = ['Yassine', 'Amine', 'Karim', 'Othmane', 'Hamza', 'Rachid', 'Anas', 'Zakaria', 'Ilyas', 'Soufiane', 'Adil', 'Mehdi'];
const MALE_LAST = ['T.', 'B.', 'L.', 'D.', 'S.', 'M.', 'K.', 'A.', 'R.', 'F.', 'H.', 'N.'];
const FEMALE_FIRST = ['Sophia', 'Nadia', 'Yasmine', 'Sara', 'Leila', 'Salma', 'Imane', 'Khadija', 'Meryem', 'Hind', 'Aya', 'Rania'];
const FEMALE_LAST = ['El K.', 'R.', 'F.', 'M.', 'H.', 'B.', 'T.', 'L.', 'S.', 'D.', 'N.', 'A.'];
const PRICE_OPTIONS = [60, 70, 80, 90, 100, 120, 150];

function buildPosts(ids: string[], styles: string[], gender: 'homme' | 'femme', startIdx: number): StylePost[] {
  const firsts = gender === 'homme' ? MALE_FIRST : FEMALE_FIRST;
  const lasts = gender === 'homme' ? MALE_LAST : FEMALE_LAST;
  return ids.map((id, i) => {
    const n = startIdx + i;
    return {
      id: `post-${n}`,
      photo: `https://images.unsplash.com/photo-${id}?q=80&w=500&auto=format&fit=crop`,
      style: styles[i % styles.length],
      barberName: `${firsts[n % firsts.length]} ${lasts[(n + 3) % lasts.length]}`,
      gender,
      city: MOROCCAN_CITIES[n % MOROCCAN_CITIES.length],
      rating: Math.round((4.5 + (n % 6) * 0.1) * 10) / 10,
      priceFrom: PRICE_OPTIONS[n % PRICE_OPTIONS.length],
      availableDays: [n % 7, (n + 2) % 7, (n + 4) % 7],
    };
  });
}

const STYLE_POSTS: StylePost[] = [
  ...buildPosts([
    '1635273051839-003bf06a8751', '1593702275687-f8b402bf1fb5', '1599011176306-4a96f1516d4d',
    '1578390432942-d323db577792', '1562004760-aceed7bb0fe3', '1618049049816-43a00d5b0c3d',
    '1654097800183-574ba7368f74', '1640301133543-41fe25ad6450', '1456327102063-fb5054efe647',
    '1627100232173-acf3733f02bc', '1587776535733-b4c80a99ef82', '1633601851802-ad8eb2bcf1f4',
    '1619233543640-af09c173763b', '1522075469751-3a6694fb2f61',
  ], ['Fondu net', 'Coupe soignée', 'Dégradé classique', 'Coupe structurée'], 'homme', 0),

  ...buildPosts([
    '1517832606299-7ae9b720a186', '1532710093739-9470acff878f', '1593702295094-aea22597af65', '1553521041-d168abd31de3',
  ], ['Taille de barbe', 'Rasage traditionnel'], 'homme', 14),

  ...buildPosts([
    '1580618672591-eb180b1a973f', '1560869713-7d0a29430803', '1554519934-e32b1629d9ee',
    '1700760934268-8aa0ef52ce0a', '1675034743339-0b0747047727', '1695527081848-1e46c06e6458',
    '1634449571017-5fecfd26ad76', '1626383137804-ff908d2753a2', '1619367901998-73b3a70b3898',
    '1582095133179-bfd08e2fc6b3',
  ], ['Brushing salon', 'Coupe en salon', 'Coiffure soignée'], 'femme', 18),

  ...buildPosts([
    '1632765854612-9b02b6ec2b15', '1628682814595-a3f0816b25ff', '1632765866070-3fadf25d3d5b',
    '1713845784497-fe3d7ed176d8', '1707162740878-087394a935c7', '1608600927239-e968bee5e0f9',
    '1624978229552-1257bd60df93', '1548207800-8c16d068bf17', '1544535379-b81233c1a64e',
    '1613876214872-a73df2a1b8bc', '1699220274995-a37956b7e43e', '1707741902060-f6caee412f26',
    '1630595127457-ad996943f51c', '1590247051319-1288f7d18c7a',
  ], ['Afro naturel', 'Volume afro', 'Texture naturelle'], 'femme', 28),

  ...buildPosts([
    '1614204424926-196a80bf0be8', '1535579710123-3c0f261c474e', '1579119159780-51419861f69f',
    '1616104130421-6eccff73df1d', '1597898111396-f149999e08f7', '1569430548104-6ca1cda3ec41',
    '1611590027211-b954fd027b51', '1613760813498-b3747bb4b90d', '1762796159022-6771e710aced',
    '1612928414075-bc722ade44f1', '1440589473619-3cde28941638', '1619160213524-f497382f14b9',
    '1577746838851-816a43ca8733', '1594185230805-68f37369b450',
  ], ['Boucles définies', 'Cheveux bouclés', 'Look bouclé'], 'femme', 42),

  ...buildPosts([
    '1551493923-9a1b98921caa', '1535146981003-d37e3e2428c3', '1606459249576-f00b2e5e0917',
    '1492681958267-2bf4c22a7e71', '1542295297-b22e37e4904f', '1489980557514-251d61e3eeb6',
  ], ['Dreadlocks', 'Locks entretenues'], 'homme', 56),

  ...buildPosts([
    '1625536658395-2bd89a631e37', '1662991859083-86e0b45208b0', '1635627091599-aedcf8241102',
    '1624561272659-224ea122b2e9', '1653263169788-9332cdbf07f5', '1764166904347-227e8cf67e8d',
    '1616380399417-37660233a7e6', '1764166904340-24c6900d254b',
  ], ['Locks stylées', 'Coiffure élaborée'], 'femme', 62),

  ...buildPosts([
    '1604057883945-2b8b91ea1575', '1499557354967-2b2d8910bcca', '1525614686090-7a3108e3758e',
    '1608877607386-8698047d65a9', '1608347183661-cbc3ecf769ce', '1519713594620-c57c92a493c0',
    '1580663232236-5d18d5b02c5a', '1617690825153-8bb0a8e3c911', '1726071575301-ccd9bdb9f306',
    '1726071575194-b4e9bf5d224a', '1629540266304-fff9c67b7660', '1615538786254-ad8b50de17dc',
    '1779406859387-5d6fd116b3ff', '1595272251257-1bbe120103d5', '1614283233556-f35b0c801ef1',
  ], ['Carré court', 'Bob moderne', 'Coupe au carré'], 'femme', 70),

  ...buildPosts([
    '1613323885789-e2212e15c326', '1613323885593-5fbcf35bf8ba', '1547547700-b3954043b1b8',
    '1603139835576-4875e2c55b13', '1701559459709-423baf04e60f', '1595711548455-8592f61630cf',
    '1762337384597-a519d3a0c12b', '1617338840112-7e0729c6c4e4', '1617338884083-5dd1d09e5598',
    '1617338832563-ffea3d5f8167', '1617338869481-5bc944d65517',
  ], ['Queue de cheval', 'Ponytail glossy'], 'femme', 85),

  ...buildPosts(['1659857934338-cdd2eb5ccce6'], ['Queue de cheval homme'], 'homme', 96),

  ...buildPosts([
    '1617391654484-2894196c2cc9', '1712213396688-c6f2d536671f', '1707720531504-ce087725861a',
  ], ['Coloration', 'Balayage salon'], 'femme', 97),

  ...buildPosts([
    '1608483053506-9fd9dd739fa0', '1613477757159-7fbb73011611', '1538655641638-55ff5b86b36a',
    '1675045120221-366171934e02', '1606093310846-4aeb4a11378f', '1612564003424-face22ce904e',
    '1551322729-8302ffee4967', '1607503873903-c5e95f80d7b9', '1611484907204-814e845f2907',
    '1646101641717-238decb0f1fe', '1546636080-53b0bb180249', '1615847697785-effb9d96a274',
    '1704054006064-2c5b922e7a1e', '1633381521050-26bb467d9d5a',
  ], ['Cheveux longs', 'Longueur naturelle'], 'femme', 100),

  ...buildPosts([
    '1770182022686-879a575d4f09', '1774773132862-8434afac1738', '1768489134736-af8149e8fef1',
    '1774773134812-d1482432b4e4', '1762810548877-63512759805e', '1774773134425-c6e772d58533',
    '1762810629910-5ad48ad9b181', '1770182023641-def05e36a69e', '1768489037970-601e0f2d50ba',
    '1774773132713-52f8f7825e63', '1774773133824-4d3768cf8567', '1718931202052-2996aac5ed85',
    '1774773134440-bfff02591c7c',
  ], ['Box braids', 'Tresses colorées', 'Tresses fines'], 'femme', 114),

  ...buildPosts([
    '1495914510314-ba3164b1321f', '1471017851983-fc49d89c57c2', '1598771326492-f523d7bd3e89',
    '1576023614239-dd207a58658f', '1569834217682-b7f92f89a50b', '1485290334039-a3c69043e517',
    '1519362909365-f8591adb630e', '1648497797412-4c38edb628fe', '1542981532-d633913a2c8a',
    '1694215685273-74ca45d14ccb', '1636018138835-a276c45c2e77',
  ], ['Coupe pixie', 'Cheveux courts'], 'femme', 127),
];

function mockBarberFromPost(post: StylePost): UserProfile {
  const [firstName, ...rest] = post.barberName.split(' ');
  return {
    uid: post.id,
    firstName,
    lastName: rest.join(' '),
    gender: post.gender,
    phone: '+212 6 00 00 00 00',
    email: 'contact@barbergo.ma',
    role: 'barber',
    createdAt: null,
  };
}

export default function AppMVP({ onLogout, theme, profile, onLogoutFirebase }: AppMVPProps) {
  const [selectedPost, setSelectedPost] = useState<StylePost | null>(null);
  const selectedBarber = selectedPost ? mockBarberFromPost(selectedPost) : null;
  const [showBooking, setShowBooking] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isModalAnnonceActive, setIsModalAnnonceActive] = useState(false);

  const [searchGender, setSearchGender] = useState<'' | 'homme' | 'femme'>('');
  const [searchDateTime, setSearchDateTime] = useState('');
  const dateTimeInputRef = useRef<HTMLInputElement>(null);
  const [searchStyle, setSearchStyle] = useState('');

  const { services, barbers, createAppointment, user } = useFirebase();

  const filteredPosts = useMemo(() => {
    const selectedDay = searchDateTime ? new Date(searchDateTime).getDay() : null;
    // Only gender and the barber's availability on the chosen day actually filter results.
    const results = STYLE_POSTS.filter(p => {
      if (searchGender && p.gender !== searchGender) return false;
      if (selectedDay !== null && !p.availableDays.includes(selectedDay)) return false;
      return true;
    });
    // The style text doesn't exclude anyone — it just brings barbers who have already
    // done that look to the top, as a recommendation.
    const style = searchStyle.trim().toLowerCase();
    if (!style) return results;
    return [...results].sort((a, b) => {
      const aMatch = a.style.toLowerCase().includes(style) ? 0 : 1;
      const bMatch = b.style.toLowerCase().includes(style) ? 0 : 1;
      return aMatch - bMatch;
    });
  }, [searchGender, searchDateTime, searchStyle]);

  useEffect(() => {
    if (profile && !selectedPost) {
      const timer = setTimeout(() => setShowProfileModal(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [profile, selectedPost]);

  const handleLogoutAll = () => {
    onLogoutFirebase();
    onLogout();
  };

  const handleSearch = () => {
    document.getElementById('style-gallery')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openPost = (post: StylePost) => {
    setSelectedPost(post);
  };

  const quickBook = (post: StylePost) => {
    setSelectedPost(post);
    setShowBooking(true);
  };

  const handleBook = async (serviceId: string, dateTime: Date, totalPrice: number, proposedPrice?: number, clientNotes?: string) => {
    if (!selectedBarber || !user) return;
    await createAppointment({
      clientId: user.uid,
      barberId: selectedBarber.uid,
      serviceId,
      dateTime,
      totalPrice,
      proposedPrice,
      negotiationStatus: 'client_proposed',
      clientNotes
    });
  };

  return (
    <div className={`h-screen flex flex-col pt-16 font-dm-sans transition-colors duration-300 ${theme === 'dark' ? 'bg-black' : 'bg-gray-100'}`}>
      {/* APP TOP BAR */}
      <div className={`border-b px-4 py-3 flex items-center z-40 transition-colors duration-300 ${theme === 'dark' ? 'bg-mid-brown border-gold/20' : 'bg-white border-gray-200 shadow-sm'}`}>
         <button
           onClick={onLogout}
           className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm border transition-colors text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'border-white/10 text-warm-gray hover:text-gold hover:border-gold/30' : 'border-gray-200 text-gray-500 hover:text-gold hover:border-gold/30'}`}
         >
           <ArrowLeft size={14} />
           Retour
         </button>
      </div>

      <div className={`flex-1 overflow-y-auto transition-colors duration-300 ${theme === 'dark' ? 'bg-black' : 'bg-gray-50'}`}>
        <AnimatePresence mode="wait">
          {selectedBarber ? (
            <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto">
              <div className="p-4">
                <button
                  onClick={() => setSelectedPost(null)}
                  className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gold hover:opacity-80 transition-opacity"
                >
                  <ArrowLeft size={14} /> Retour à la recherche
                </button>
              </div>

              {/* COVER */}
              <div className="h-32 md:h-40 w-full relative overflow-hidden">
                 <img src={selectedPost?.photo || SALON_COVER_PHOTO} alt="" className="w-full h-full object-cover" />
                 <div className={`absolute inset-0 bg-gradient-to-t ${theme === 'dark' ? 'from-black via-black/20' : 'from-white via-white/10'} to-transparent`} />
              </div>

              <div className="p-6 -mt-12 relative">
                 <div className="flex gap-5 items-end mb-6">
                    <img
                      src={avatarFor(selectedBarber.uid)}
                      alt={selectedBarber.firstName}
                      className={`w-24 h-24 rounded-full object-cover shadow-xl border-4 shrink-0 ${theme === 'dark' ? 'border-black' : 'border-white'}`}
                    />
                    <div className="flex-1 pb-1">
                       <h2 className={`text-2xl font-bebas tracking-wider mb-1 uppercase flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                         {selectedBarber.firstName} {selectedBarber.lastName}
                         <BadgeCheck size={18} className="text-gold" />
                       </h2>
                       <p className="text-gold text-xs uppercase tracking-widest font-bold mb-1">Barbe & Cheveux Expert</p>
                       <p className="text-warm-gray text-[10px] uppercase tracking-widest flex items-center gap-1">
                         <MapPin size={10} /> {selectedPost?.city || 'Casablanca'}
                       </p>
                    </div>
                 </div>

                 <div className="grid grid-cols-4 gap-4 mb-8">
                    {[
                      { val: '5+', label: 'Ans' },
                      { val: '1k+', label: 'Clients' },
                      { val: `${selectedPost?.rating ?? '4.9'}★`, label: 'Note' },
                      { val: `${selectedPost?.priceFrom ?? '80'} DH`, label: 'Dès' }
                    ].map((stat, i) => (
                      <div key={i} className={`text-center p-2 rounded-sm border ${theme === 'dark' ? 'bg-mid-brown/30 border-gold/10' : 'bg-gray-50 border-gray-200'}`}>
                         <div className="text-gold font-bebas text-xl leading-none">{stat.val}</div>
                         <div className="text-[8px] text-warm-gray uppercase font-bold">{stat.label}</div>
                      </div>
                    ))}
                 </div>

                 <div className="mb-8">
                   <div className="text-[10px] text-warm-gray uppercase tracking-widest font-bold mb-4">À propos</div>
                   <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
                     Spécialiste du dégradé américain et de la taille de barbe traditionnelle. Plusieurs années d'expérience dans les meilleurs salons de la capitale.
                   </p>
                 </div>

                 <div className="mb-8">
                   <div className="text-[10px] text-warm-gray uppercase tracking-widest font-bold mb-4">Réalisations</div>
                   <div className="grid grid-cols-4 gap-2">
                     {PORTFOLIO_PHOTOS.map((src, i) => (
                       <div key={i} className="aspect-square rounded-sm overflow-hidden border border-gold/15">
                         <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
                       </div>
                     ))}
                   </div>
                 </div>

                 <button
                   onClick={() => setShowBooking(true)}
                   className="w-full btn-primary py-5 mt-4 flex items-center justify-center gap-3 group"
                 >
                   <CalendarDays size={18} />
                   <span className="uppercase font-bold tracking-[0.2em]">Prendre rendez-vous</span>
                   <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                 </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto px-4 py-8 md:py-12">
              <div className="mb-6">
                <h1 className={`font-bebas text-3xl md:text-4xl tracking-wide uppercase mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Trouvez votre coiffeur</h1>
                <p className="text-warm-gray text-sm">Recherchez selon la disponibilité, le genre et le style que vous voulez.</p>
              </div>

              {/* BOOKING-STYLE SEARCH BAR */}
              <div className={`flex flex-col md:flex-row rounded-lg md:rounded-full border-2 border-gold overflow-hidden shadow-lg mb-3 ${theme === 'dark' ? 'bg-mid-brown' : 'bg-white'}`}>
                 <div className={`flex-1 flex items-center gap-2 px-4 py-3 border-b md:border-b-0 md:border-r ${theme === 'dark' ? 'border-gold/15' : 'border-gray-200'}`}>
                    <Users size={16} className="text-gold shrink-0" />
                    <select
                      value={searchGender}
                      onChange={(e) => setSearchGender(e.target.value as '' | 'homme' | 'femme')}
                      className={`bg-transparent border-none outline-none text-xs w-full ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
                    >
                      <option value="" className={theme === 'dark' ? 'bg-mid-brown' : ''}>Un coiffeur ou une coiffeuse</option>
                      <option value="homme" className={theme === 'dark' ? 'bg-mid-brown' : ''}>Un coiffeur</option>
                      <option value="femme" className={theme === 'dark' ? 'bg-mid-brown' : ''}>Une coiffeuse</option>
                    </select>
                 </div>
                 <div className={`flex-1 flex items-center gap-2 px-4 py-3 border-b md:border-b-0 md:border-r ${theme === 'dark' ? 'border-gold/15' : 'border-gray-200'}`}>
                    <button
                      type="button"
                      onClick={() => dateTimeInputRef.current?.showPicker?.()}
                      className="text-gold shrink-0 hover:opacity-70 transition-opacity"
                      aria-label="Choisir la date et l'heure"
                    >
                      <CalendarDays size={24} />
                    </button>
                    <input
                      ref={dateTimeInputRef}
                      type="datetime-local"
                      value={searchDateTime}
                      onChange={(e) => setSearchDateTime(e.target.value)}
                      className={`bg-transparent border-none outline-none text-xs w-full [&::-webkit-calendar-picker-indicator]:opacity-0 ${theme === 'dark' ? 'text-white [color-scheme:dark]' : 'text-gray-900'}`}
                    />
                 </div>
                 <div className="flex-1 flex items-center gap-2 px-4 py-3">
                    <Scissors size={16} className="text-gold shrink-0" />
                    <input
                      value={searchStyle}
                      onChange={(e) => setSearchStyle(e.target.value)}
                      placeholder="Style de coiffure"
                      className={`bg-transparent border-none outline-none text-xs w-full ${theme === 'dark' ? 'text-white placeholder:text-warm-gray' : 'text-gray-900 placeholder:text-gray-400'}`}
                    />
                 </div>
                 <button
                   onClick={handleSearch}
                   className="btn-primary md:rounded-none px-8 py-4 flex items-center justify-center gap-2 shrink-0"
                 >
                   <Search size={16} />
                   Rechercher
                 </button>
              </div>
              <p className="text-warm-gray text-[10px] uppercase tracking-widest mb-10">
                {filteredPosts.length} coiffeur{filteredPosts.length > 1 ? 's' : ''} disponible{filteredPosts.length > 1 ? 's' : ''}
              </p>

              {/* STYLE GALLERY */}
              <div id="style-gallery">
                <h2 className={`font-bebas text-xl tracking-widest uppercase mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Coupes réalisées par nos coiffeurs</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredPosts.map((post) => (
                    <div
                      key={post.id}
                      className={`rounded-lg overflow-hidden border ${theme === 'dark' ? 'border-gold/15 bg-mid-brown/20' : 'border-gray-200 bg-white'}`}
                    >
                      <button onClick={() => openPost(post)} className="group w-full text-left block">
                        <div className="relative aspect-square">
                          <img src={post.photo} alt={post.style} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                          <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
                            <MapPin size={10} className="text-gold shrink-0" />
                            <span className="text-white text-[9px] font-bold uppercase tracking-wide">{post.city}</span>
                          </div>
                        </div>
                        <div className="p-2.5">
                          <div className={`text-xs font-bold mb-1 truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{post.style}</div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <img src={avatarFor(post.id)} alt="" className="w-5 h-5 rounded-full object-cover border border-gold shrink-0" />
                            <span className="text-warm-gray text-[10px] truncate">{post.barberName}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-gold text-[10px] font-bold">
                              <Star size={10} className="fill-gold" /> {post.rating}
                            </div>
                            <div className="text-warm-gray text-[10px]">Dès <span className="text-gold font-bold">{post.priceFrom} DH</span></div>
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => quickBook(post)}
                        className="w-full bg-gold text-black py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-gold-light transition-colors"
                      >
                        Réserver
                      </button>
                    </div>
                  ))}
                </div>
                {filteredPosts.length === 0 && (
                  <div className="text-center py-16 text-warm-gray text-xs uppercase tracking-widest">Aucun résultat pour ces critères</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {selectedBarber && (
        <BookingModal
          isOpen={showBooking}
          onClose={() => setShowBooking(false)}
          barber={selectedBarber}
          services={services}
          onBook={handleBook}
          theme={theme}
        />
      )}

      {/* PROFILE MODAL */}
      <AnimatePresence>
        {showProfileModal && profile && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className={`w-full ${isModalAnnonceActive ? 'max-w-lg' : 'max-w-sm'} border rounded-sm overflow-hidden transition-all duration-300 ${theme === 'dark' ? 'bg-mid-brown border-gold/30' : 'bg-white border-gray-200 shadow-2xl'}`}
            >
               <div className="p-6 border-b border-gold/10 flex justify-between items-center bg-gold/5">
                  <h3 className="font-bebas text-xl text-gold tracking-widest uppercase">
                    {isModalAnnonceActive ? 'Nouvelle Annonce' : 'Mon Compte'}
                  </h3>
                  <button onClick={() => { setShowProfileModal(false); setIsModalAnnonceActive(false); }} className="text-warm-gray hover:text-gold transition-colors"><X size={20} /></button>
               </div>

               {isModalAnnonceActive ? (
                 <div className="p-6 space-y-4">
                   <CreateAnnonceForm
                     services={services}
                     barbers={barbers}
                     onBook={async (serviceId, dateTime, totalPrice, proposedPrice, clientNotes, targetBarberId) => {
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
                     }}
                     theme={theme}
                     onSuccess={() => {
                        setShowProfileModal(false);
                        setIsModalAnnonceActive(false);
                     }}
                   />
                   <button
                     onClick={() => setIsModalAnnonceActive(false)}
                     className="w-full text-center text-[10px] uppercase font-bold text-gold/60 hover:text-gold tracking-wider transition-colors"
                   >
                     ← Retour aux détails du compte
                   </button>
                 </div>
               ) : (
                 <div className="p-8 text-center space-y-6">
                    <div className="w-20 h-20 bg-gold/10 rounded-full border-2 border-gold flex items-center justify-center mx-auto">
                       <User size={40} className="text-gold" />
                    </div>
                    <div>
                      <h4 className={`text-2xl font-bebas tracking-wider uppercase ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{profile.firstName} {profile.lastName}</h4>
                      <p className="text-gold text-[10px] font-bold uppercase tracking-widest mt-1">Membre BarberGo</p>
                    </div>
                    <div className="space-y-2">
                       <div className={`p-4 rounded-sm border flex justify-between items-center ${theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                          <span className="text-[10px] text-warm-gray uppercase font-bold">Email</span>
                          <span className={`text-xs ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{profile.email}</span>
                       </div>
                       <div className={`p-4 rounded-sm border flex justify-between items-center ${theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                          <span className="text-[10px] text-warm-gray uppercase font-bold">Mobile</span>
                          <span className={`text-xs ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{profile.phone}</span>
                       </div>

                       {profile.role === 'client' && (
                         <button
                           onClick={() => setIsModalAnnonceActive(true)}
                           className="w-full btn-primary py-4 uppercase font-bold tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 group mt-2"
                         >
                            ⚡ Poster une Annonce (InDrive)
                         </button>
                       )}
                    </div>
                    <button
                      onClick={handleLogoutAll}
                      className="w-full py-4 border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all rounded-sm text-[10px] font-bold uppercase tracking-widest"
                    >
                      Déconnexion
                    </button>
                 </div>
               )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
