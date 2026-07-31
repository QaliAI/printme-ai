'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface DesignSummary {
  id: string;
  slug: string;
  title: string;
  publication_status: string;
  updated_at: string;
}

export default function StudioDesignsPage() {
  const [designs, setDesigns] = useState<DesignSummary[]>([]);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session || cancelled) return;
      const response = await fetch('/api/studio/designs', {
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
        },
      });
      if (cancelled) return;
      if (!response.ok) {
        setUnavailable(true);
        return;
      }
      const payload = (await response.json()) as {
        designs: DesignSummary[];
      };
      setDesigns(payload.designs);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <header className="studio-page-header">
        <div>
          <p>Curated design library</p>
          <h1>Designs</h1>
        </div>
        <Link href="/studio/designs/new" className="studio-primary">
          Upload design
        </Link>
      </header>
      {designs.length ? (
        <div className="studio-design-list">
          {designs.map((design) => (
            <Link href={`/studio/designs/${design.id}`} key={design.id}>
              <span>
                <strong>{design.title}</strong>
                <small>/{design.slug}</small>
              </span>
              <b>{design.publication_status}</b>
            </Link>
          ))}
        </div>
      ) : (
        <section className="studio-empty">
          <h2>{unavailable ? 'Staging persistence required' : 'No designs yet'}</h2>
          <p>
            {unavailable
              ? 'Apply the Studio migration and configure the asset bucket in staging.'
              : 'Upload the first curated design to begin.'}
          </p>
        </section>
      )}
    </>
  );
}
