import { describe, it, expect } from 'vitest';
import { isPasswordStrongEnough } from './passwordStrength';

describe('isPasswordStrongEnough', () => {
  it('rejects a purely numeric password, even long', () => {
    expect(isPasswordStrongEnough('123456789')).toBe(false);
  });

  it('rejects a purely alphabetic password', () => {
    expect(isPasswordStrongEnough('abcdefgh')).toBe(false);
  });

  it('rejects anything under 8 characters, even with a letter and digit', () => {
    expect(isPasswordStrongEnough('abc123')).toBe(false);
  });

  it('accepts a mix of letters and digits at 8+ characters', () => {
    expect(isPasswordStrongEnough('abcd1234')).toBe(true);
  });

  it('accepts a longer, more complex password', () => {
    expect(isPasswordStrongEnough('MotDePasse2026!')).toBe(true);
  });
});
