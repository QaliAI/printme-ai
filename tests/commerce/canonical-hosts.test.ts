import { describe, expect, it } from 'vitest';
import { getOptionalDesignHostRedirect } from '@/lib/commerce/canonical-hosts';

describe('optional design subdomain redirect preparation', () => {
  it('maps optional hosts to canonical printme.ai paths without activating DNS', () => {
    expect(getOptionalDesignHostRedirect('new.printme.ai')).toBe(
      'https://printme.ai/designs/new',
    );
    expect(getOptionalDesignHostRedirect('hot.printme.ai')).toBe(
      'https://printme.ai/designs/trending',
    );
    expect(getOptionalDesignHostRedirect('bestsellers.printme.ai')).toBe(
      'https://printme.ai/designs/bestsellers',
    );
  });
});
