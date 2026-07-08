import { UserProfile } from '../hooks/useFirebase';

// Barbers don't all have a real photo yet, so give each one a stable, real portrait
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

export function avatarFor(uid: string) {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = (hash * 31 + uid.charCodeAt(i)) >>> 0;
  return BARBER_AVATARS[hash % BARBER_AVATARS.length];
}

export const PORTFOLIO_PHOTOS = [
  'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=300&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=300&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=300&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1648221122323-572c13a31663?q=80&w=300&auto=format&fit=crop',
];

export const SALON_COVER_PHOTO = 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=900&auto=format&fit=crop';

// Until every barber has uploaded their own real portfolio to Firestore, this mock feed
// shows the kind of looks they offer — same idea, real photos (all distinct from the ones
// used on the landing page), placeholder names/cities. Shared between the client search
// (AppMVP) and the barber-facing "Accueil" tab so both sides see the exact same feed.
export interface StylePost {
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
  // One of SERVICE_CATEGORIES ids (src/data/categories.ts)
  category: string;
}

const MOROCCAN_CITIES = ['Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger', 'Meknès', 'Agadir', 'Oujda', 'Kénitra', 'Tétouan', 'Salé', 'Mohammedia'];

// Approximate city-center coordinates, used only to estimate the distance between the
// client and a barber's city once the client shares their location — no precise
// per-barber GPS position exists (or is needed) beyond that.
export const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'Casablanca': { lat: 33.5731, lng: -7.5898 },
  'Rabat': { lat: 34.0209, lng: -6.8416 },
  'Marrakech': { lat: 31.6295, lng: -7.9811 },
  'Fès': { lat: 34.0331, lng: -5.0003 },
  'Tanger': { lat: 35.7595, lng: -5.8340 },
  'Meknès': { lat: 33.8935, lng: -5.5473 },
  'Agadir': { lat: 30.4278, lng: -9.5981 },
  'Oujda': { lat: 34.6814, lng: -1.9086 },
  'Kénitra': { lat: 34.2610, lng: -6.5802 },
  'Tétouan': { lat: 35.5785, lng: -5.3684 },
  'Salé': { lat: 34.0531, lng: -6.7985 },
  'Mohammedia': { lat: 33.6863, lng: -7.3830 },
};

export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}
const MALE_FIRST = ['Yassine', 'Amine', 'Karim', 'Othmane', 'Hamza', 'Rachid', 'Anas', 'Zakaria', 'Ilyas', 'Soufiane', 'Adil', 'Mehdi'];
const MALE_LAST = ['T.', 'B.', 'L.', 'D.', 'S.', 'M.', 'K.', 'A.', 'R.', 'F.', 'H.', 'N.'];
const FEMALE_FIRST = ['Sophia', 'Nadia', 'Yasmine', 'Sara', 'Leila', 'Salma', 'Imane', 'Khadija', 'Meryem', 'Hind', 'Aya', 'Rania'];
const FEMALE_LAST = ['El K.', 'R.', 'F.', 'M.', 'H.', 'B.', 'T.', 'L.', 'S.', 'D.', 'N.', 'A.'];
const PRICE_OPTIONS = [60, 70, 80, 90, 100, 120, 150];

function buildPosts(ids: string[], styles: string[], gender: 'homme' | 'femme', startIdx: number, category: string = 'coiffure'): StylePost[] {
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
      category,
    };
  });
}

export const STYLE_POSTS: StylePost[] = [
  ...buildPosts([
    '1635273051839-003bf06a8751', '1593702275687-f8b402bf1fb5', '1599011176306-4a96f1516d4d',
    '1578390432942-d323db577792', '1562004760-aceed7bb0fe3', '1618049049816-43a00d5b0c3d',
    '1654097800183-574ba7368f74', '1640301133543-41fe25ad6450', '1456327102063-fb5054efe647',
    '1627100232173-acf3733f02bc', '1587776535733-b4c80a99ef82', '1633601851802-ad8eb2bcf1f4',
    '1619233543640-af09c173763b', '1522075469751-3a6694fb2f61',
  ], ['Fondu net', 'Coupe soignée', 'Dégradé classique', 'Coupe structurée'], 'homme', 0),

  ...buildPosts([
    '1517832606299-7ae9b720a186', '1532710093739-9470acff878f', '1593702295094-aea22597af65', '1553521041-d168abd31de3',
  ], ['Taille de barbe', 'Rasage traditionnel'], 'homme', 14, 'barbier'),

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

  ...buildPosts([
    '1522529599102-193c0d76b5b6', '1592485607288-3cb668d0213b', '1625647027179-bd3ba2aea4e4',
    '1643904524791-2ca626c9b54c', '1643904524951-2a3a58856745',
  ], ['Afro naturel', 'Afro texturé'], 'homme', 138),

  ...buildPosts([
    '1774304325907-c9a3ee44a763', '1483908046566-7389784ef261', '1570542867012-26f54afed609',
    '1668749095149-924da8c36965',
  ], ['Box braids homme', 'Tresses fines homme'], 'homme', 143),

  ...buildPosts([
    '1762108669600-d86eb3342c6d', '1668749096270-319a91089440', '1668749095833-247322d8d26b',
    '1778546978267-b93e8c6ea099',
  ], ['Cornrows tressées', 'Tresses collées'], 'homme', 147),

  ...buildPosts([
    '1612454152924-33bb4a8b17d4', '1612455253302-6e13a4a11bba', '1632828171993-3f191bbbea1a',
    '1666645492015-c4dfa4cd6100',
  ], ['Twists texturés', 'Vrilles définies'], 'homme', 151),

  ...buildPosts([
    '1611762341724-9cdbe003ea44', '1745804543291-932c748b18b5', '1567894340315-735d7c361db0',
    '1744636574936-9b3de5c85d0d',
  ], ['Fade texturé', 'Dégradé afro'], 'homme', 155),
];

export function mockBarberFromPost(post: StylePost): UserProfile {
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
