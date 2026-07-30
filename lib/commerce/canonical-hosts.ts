export const optionalDesignHostRedirects = {
  'new.printme.ai': 'https://printme.ai/designs/new',
  'hot.printme.ai': 'https://printme.ai/designs/trending',
  'bestsellers.printme.ai': 'https://printme.ai/designs/bestsellers',
} as const;

export function getOptionalDesignHostRedirect(host: string) {
  return optionalDesignHostRedirects[
    host.toLowerCase() as keyof typeof optionalDesignHostRedirects
  ];
}
