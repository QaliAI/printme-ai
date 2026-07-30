import Link from 'next/link';

export default function StudioOverviewPage() {
  return (
    <>
      <header className="studio-page-header">
        <div>
          <p>Publishing control room</p>
          <h1>Studio overview</h1>
        </div>
        <Link href="/studio/designs/new" className="studio-primary">
          New design
        </Link>
      </header>
      <section className="studio-card-grid" aria-label="Studio status">
        <article className="studio-card">
          <span>Publication gate</span>
          <strong>10 checks</strong>
          <p>Rights, assets, product fit, quality, and SEO.</p>
        </article>
        <article className="studio-card">
          <span>Approved products</span>
          <strong>3</strong>
          <p>Poster, tee, and mug configurations.</p>
        </article>
        <article className="studio-card">
          <span>Publishing model</span>
          <strong>Versioned</strong>
          <p>Published and purchased versions remain immutable.</p>
        </article>
      </section>
    </>
  );
}
