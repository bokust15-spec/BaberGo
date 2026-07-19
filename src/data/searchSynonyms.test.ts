import { describe, it, expect } from 'vitest';
import { entryMatchesSearchTerm } from './searchSynonyms';

const esthetiquePro = { item: { name: 'Épilation sourcils' }, barber: { categories: ['esthetique'] } };
const cheveuxPro = { item: { name: 'Balayage blond' }, barber: { categories: ['cheveux'] } };
const customTattooPro = { item: { name: 'Portrait bras' }, barber: { categories: ['Tatouage'] } };
const massagePro = { item: { name: 'Massage relaxant' }, barber: { categories: ['massage'] } };

describe('entryMatchesSearchTerm', () => {
  it('matches a synonym to its mapped fixed category', () => {
    expect(entryMatchesSearchTerm(esthetiquePro, 'tatouage')).toBe(true);
    expect(entryMatchesSearchTerm(massagePro, 'hammam')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(entryMatchesSearchTerm(esthetiquePro, 'TATOUAGE')).toBe(true);
  });

  it('is accent-insensitive', () => {
    expect(entryMatchesSearchTerm(esthetiquePro, 'epilation')).toBe(true);
  });

  it('matches a custom (non-fixed) category directly by its text', () => {
    expect(entryMatchesSearchTerm(customTattooPro, 'tatouage')).toBe(true);
  });

  it('does not cross-match an unrelated category', () => {
    expect(entryMatchesSearchTerm(cheveuxPro, 'tatouage')).toBe(false);
    expect(entryMatchesSearchTerm(massagePro, 'manucure')).toBe(false);
  });

  it('treats an empty search term as matching everything', () => {
    expect(entryMatchesSearchTerm(cheveuxPro, '')).toBe(true);
  });

  it('falls back to matching the service/style name directly', () => {
    expect(entryMatchesSearchTerm(cheveuxPro, 'balayage')).toBe(true);
  });
});
