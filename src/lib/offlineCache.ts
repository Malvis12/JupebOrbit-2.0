import { Question } from '../types';

const CACHE_PREFIX = 'jupeb_orbit_qcache_';

/**
 * Cache a list of questions in localStorage for offline PWA access.
 */
export function cacheQuestions(key: string, questions: Question[]): void {
  try {
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(questions));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Retrieve cached questions for offline fallback.
 */
export function getCachedQuestions(key: string): Question[] {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
