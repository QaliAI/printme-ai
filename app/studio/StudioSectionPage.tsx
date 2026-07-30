import Link from 'next/link';

export function StudioSectionPage({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <>
      <header className="studio-page-header">
        <div>
          <p>{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <Link href="/studio/designs/new" className="studio-secondary">
          Assign in design editor
        </Link>
      </header>
      <section className="studio-empty">
        <h2>{title} are managed in the shared catalog</h2>
        <p>Assignments publish automatically with eligible designs.</p>
      </section>
    </>
  );
}
