import { describe, it, expect } from 'vitest';
import { toUserMessage, default as defaultExport } from './errorMessage.js';

describe('toUserMessage', () => {
  it('returns the same function as the default export', () => {
    expect(defaultExport).toBe(toUserMessage);
  });

  it('maps a fetch TypeError to a friendly network message', () => {
    const err = new TypeError('Failed to fetch');
    expect(toUserMessage(err)).toBe(
      'Network error: could not reach the server. Check your connection and try again.'
    );
  });

  it('maps common network failure strings on a generic Error', () => {
    expect(toUserMessage(new Error('NetworkError when attempting to fetch resource'))).toBe(
      'Network error: could not reach the server. Check your connection and try again.'
    );
    expect(toUserMessage(new Error('Load failed'))).toBe(
      'Network error: could not reach the server. Check your connection and try again.'
    );
  });

  it('maps an AbortError to a timeout message', () => {
    const err = new DOMException('The user aborted a request.', 'AbortError');
    expect(toUserMessage(err)).toBe(
      'The request took too long and was cancelled. Please try again.'
    );
  });

  it('passes through a normal error message', () => {
    expect(toUserMessage(new Error('Profile validation failed'))).toBe('Profile validation failed');
  });

  it('trims whitespace around error messages', () => {
    expect(toUserMessage(new Error('   subtle failure   '))).toBe('subtle failure');
  });

  it('falls back when an Error has no message', () => {
    expect(toUserMessage(new Error(''))).toBe('Something went wrong. Please try again.');
  });

  it('returns a trimmed string for thrown strings', () => {
    expect(toUserMessage('  plain string  ')).toBe('plain string');
    expect(toUserMessage('   ')).toBe('Something went wrong. Please try again.');
  });

  it('never leaks non-Error values such as objects', () => {
    expect(toUserMessage({ code: 500, detail: 'oops' })).toBe(
      'Something went wrong. Please try again.'
    );
    expect(toUserMessage(null)).toBe('Something went wrong. Please try again.');
    expect(toUserMessage(undefined)).toBe('Something went wrong. Please try again.');
    expect(toUserMessage(42)).toBe('Something went wrong. Please try again.');
  });

  it('honours a custom fallback', () => {
    expect(toUserMessage(undefined, 'Custom fallback')).toBe('Custom fallback');
    expect(toUserMessage(new Error(''), 'Custom fallback')).toBe('Custom fallback');
  });
});
