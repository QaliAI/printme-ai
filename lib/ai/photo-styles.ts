export const photoStyles = {
  illustrated: { label: 'Illustrated portrait', prompt: 'Create a bold illustrated portrait with clean lines and rich colors.' },
  poster: { label: 'Art poster', prompt: 'Create an editorial art poster portrait with a restrained palette and clear shapes.' },
  'soft-paint': { label: 'Soft painting', prompt: 'Create a softly painted portrait with gentle brushwork.' },
  'halloween-pet': { label: 'Halloween pet art', prompt: 'Transform the supplied pet into original friendly Halloween art, with pumpkins, tiny stars and a whimsical ghostly atmosphere. Keep the same pet and its distinctive markings.' },
  'haunted-portrait': { label: 'Gothic haunted portrait', prompt: 'Transform the supplied subject into an original gothic painted portrait with candlelight, subtle mist, and a haunted autumn atmosphere. Preserve the same recognizable subject.' },
} as const;
export type PhotoStyle = keyof typeof photoStyles;
