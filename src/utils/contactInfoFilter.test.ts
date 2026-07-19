import { describe, it, expect } from 'vitest';
import { containsContactInfo } from './contactInfoFilter';

describe('containsContactInfo', () => {
  it('allows plain text with no digits or contact patterns', () => {
    expect(containsContactInfo('Coupe dégradée avec finitions à la tondeuse')).toBe(false);
  });

  it('allows a single stray digit (age, years of experience)', () => {
    expect(containsContactInfo('5 ans d\'expérience')).toBe(false);
  });

  it('blocks two or more digits anywhere in the text', () => {
    expect(containsContactInfo('06 12 34 56 78')).toBe(true);
  });

  it('blocks digits deliberately broken up with letters/spaces', () => {
    expect(containsContactInfo('07 80 9OH9OH9OH9O')).toBe(true);
  });

  it('blocks WhatsApp mentions with no digits', () => {
    expect(containsContactInfo('Contactez-moi sur WhatsApp')).toBe(true);
    expect(containsContactInfo('wa.me/xxxxx')).toBe(true);
  });

  it('blocks email addresses', () => {
    expect(containsContactInfo('Ecrivez-moi a pro@example.com')).toBe(true);
  });

  it('handles empty/falsy input safely', () => {
    expect(containsContactInfo('')).toBe(false);
  });
});
