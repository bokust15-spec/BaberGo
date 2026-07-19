import { SERVICE_CATEGORIES } from './categories';

// Structural (duck-typed) subset of AppMVP/BarberDashboard's own FeedEntry — kept local
// instead of importing their (unexported) interface, since a data-layer file shouldn't
// depend on a component file.
interface SearchableEntry {
  item: { name: string; category?: string };
  barber: { categories?: string[] };
}

// Free-text search terms the way a client would actually type them (French, sometimes
// misspelled, sometimes a service name rather than a category label) mapped to each
// fixed category id — lets "tatouage" match a pro tagged "esthetique" if that's where
// tattoo work lives today, and lets typos/plurals/synonyms still hit the right people
// without needing an external AI call for every search.
const CATEGORY_SYNONYMS: Record<string, string[]> = {
  cheveux: [
    'cheveux', 'coiffure', 'coiffeur', 'coiffeuse', 'coupe', 'coupe de cheveux',
    'brushing', 'lissage', 'lissage bresilien', 'tresse', 'tresses', 'tressage',
    'coloration', 'couleur', 'balayage', 'meche', 'meches', 'extension', 'extensions',
    'chignon', 'defrisage', 'permanente', 'locks', 'dreadlocks', 'nattes',
  ],
  barbe: [
    'barbe', 'barbier', 'rasage', 'taille de barbe', 'moustache', 'degrade',
  ],
  'main-pied': [
    'main', 'pied', 'mains', 'pieds', 'manucure', 'pedicure', 'ongles', 'ongle',
    'vernis', 'nail art', 'faux ongles', 'gel', 'semi-permanent', 'capsules',
  ],
  makeup: [
    'makeup', 'maquillage', 'make-up', 'grimage', 'maquilleuse', 'maquilleur',
  ],
  esthetique: [
    'esthetique', 'epilation', 'sourcils', 'cils', 'extension de cils', 'henne',
    'threading', 'fil', 'rehaussement de cils', 'tatouage', 'tatoo', 'tattoo',
    'piercing', 'microblading', 'maquillage permanent',
  ],
  'soin-visage': [
    'soin de visage', 'soin visage', 'soins du visage', 'nettoyage de peau',
    'hydrafacial', 'peeling', 'masque', 'facial',
  ],
  massage: [
    'massage', 'massages', 'relaxation', 'spa', 'hammam', 'gommage', 'kessa',
  ],
  'beaute-evenementiel': [
    'evenementiel', 'evenement', 'mariage', 'mariee', 'coiffure mariage',
    'maquillage mariage', 'henne mariage',
  ],
};

// Strip accents/case so "épilation" and "epilation" (or "ÉPILATION") match the same way.
// Combining diacritical marks block (U+0300-U+036F), built from char codes rather than
// embedded literally to keep the source file free of invisible combining characters.
const DIACRITICS_RANGE = new RegExp(
  `[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`,
  'g'
);

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(DIACRITICS_RANGE, '')
    .toLowerCase()
    .trim();
}

function textIncludesTerm(text: string, normalizedTerm: string): boolean {
  const normalizedText = normalize(text);
  return normalizedText.includes(normalizedTerm) || normalizedTerm.includes(normalizedText);
}

// A category can be a fixed id (checked against its synonym list + label) or a custom
// string a pro typed via "+Autre" (checked directly, since it has no synonym entry).
function categoryMatchesTerm(categoryIdOrLabel: string, normalizedTerm: string): boolean {
  const fixed = SERVICE_CATEGORIES.find(c => c.id === categoryIdOrLabel);
  if (fixed) {
    if (textIncludesTerm(fixed.label, normalizedTerm)) return true;
    const synonyms = CATEGORY_SYNONYMS[fixed.id] || [];
    return synonyms.some(s => textIncludesTerm(s, normalizedTerm));
  }
  return textIncludesTerm(categoryIdOrLabel, normalizedTerm);
}

// Whether a searched term ("tatouage", "manucure"...) is relevant to this feed entry —
// checked against the post's own category, the barber's full category list, and the
// service/style name, so a search links the request to every matching profile rather
// than just the one post that happens to contain the exact word.
export function entryMatchesSearchTerm(entry: SearchableEntry, term: string): boolean {
  const normalizedTerm = normalize(term);
  if (!normalizedTerm) return true;
  if (textIncludesTerm(entry.item.name, normalizedTerm)) return true;
  if (entry.item.category && categoryMatchesTerm(entry.item.category, normalizedTerm)) return true;
  if (entry.barber.categories?.some(c => categoryMatchesTerm(c, normalizedTerm))) return true;
  return false;
}
