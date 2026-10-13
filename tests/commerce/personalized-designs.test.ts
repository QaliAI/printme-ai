import { describe, expect, it } from 'vitest';
import { defaultPersonalization } from '@/lib/commerce/personalization-engine';
import { personalizedDesignSlugs } from '@/lib/commerce/personalized-designs';

describe('personalized design list', () => {
  it('matches the templates the personalization engine can actually render', () => {
    expect([...personalizedDesignSlugs].sort()).toEqual(Object.keys(defaultPersonalization).sort());
  });
});
