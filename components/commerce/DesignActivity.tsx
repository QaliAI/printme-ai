'use client';

import { useEffect, useState } from 'react';

const RECENT_KEY = 'printme:recent-designs:v1';
const FAVORITES_KEY = 'printme:favorite-designs:v1';

function readIds(key: string) {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? '[]');
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

export function DesignActivity({
  designId,
  signedIn = false,
}: {
  designId: string;
  signedIn?: boolean;
}) {
  const [favorite, setFavorite] = useState(false);
  useEffect(() => {
    const recent = readIds(RECENT_KEY).filter((id) => id !== designId);
    window.localStorage.setItem(
      RECENT_KEY,
      JSON.stringify([designId, ...recent].slice(0, 20)),
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFavorite(readIds(FAVORITES_KEY).includes(designId));
  }, [designId]);

  return (
    <div>
      <button
        type="button"
        disabled={!signedIn}
        aria-pressed={favorite}
        onClick={() => {
          const favorites = readIds(FAVORITES_KEY);
          const next = favorite
            ? favorites.filter((id) => id !== designId)
            : [designId, ...favorites];
          window.localStorage.setItem(
            FAVORITES_KEY,
            JSON.stringify(next),
          );
          setFavorite(!favorite);
        }}
      >
        {signedIn
          ? favorite
            ? 'Saved to favorites'
            : 'Save to favorites'
          : 'Sign in to save'}
      </button>
    </div>
  );
}
