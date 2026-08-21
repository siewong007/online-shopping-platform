import { LEGAL_DOCUMENTS, type LegalSlug } from "./content";

type LegalPageProps = {
  onBack: () => void;
  onHome: () => void;
  slug: LegalSlug;
};

/** Static policy page. Content lives in ./content.ts so the prose is editable in one place. */
export function LegalPage({ onBack, onHome, slug }: LegalPageProps) {
  const document = LEGAL_DOCUMENTS[slug];

  return (
    <main className="legal-page" aria-labelledby="legal-page-title">
      <article className="legal-page__inner">
        <p className="eyebrow">Ekoway Hardware</p>
        <h1 id="legal-page-title">{document.title}</h1>
        <p className="legal-page__updated">Last updated {document.updated}</p>
        <p className="legal-page__intro">{document.intro}</p>

        {document.sections.map((section) => (
          <section className="legal-page__section" key={section.heading}>
            <h2>{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        ))}

        <div className="legal-page__actions">
          <button className="solid-button" onClick={onBack} type="button">
            Back to the store
          </button>
          <button className="outline-button" onClick={onHome} type="button">
            Go to home
          </button>
        </div>
      </article>
    </main>
  );
}
