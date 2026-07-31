export default function StudioPublishingPage() {
  return (
    <>
      <header className="studio-page-header">
        <div>
          <p>Release readiness</p>
          <h1>Publishing</h1>
          <p>
            New uses publication time. Trending uses recent weighted engagement.
            Bestsellers require paid order quantities. Staff Picks are editorial.
          </p>
        </div>
      </header>
      <section className="studio-card-grid">
        <article className="studio-card">
          <span>New</span>
          <strong>Publication date</strong>
        </article>
        <article className="studio-card">
          <span>Trending</span>
          <strong>25% views + 75% carts</strong>
        </article>
        <article className="studio-card">
          <span>Bestsellers</span>
          <strong>Paid quantities only</strong>
        </article>
      </section>
    </>
  );
}
