/**
 * Designs with a working name/text personalization template in
 * personalization-engine.ts. Kept server-safe (that module is client-only);
 * tests/commerce/personalized-designs.test.ts keeps the two in sync.
 */
export const personalizedDesignSlugs: ReadonlySet<string> = new Set([
  'haunted-household',
  'library-of-lost-hours',
  'midnight-hayride',
  'field-notes-after-dark',
  'leftovers-league',
]);
