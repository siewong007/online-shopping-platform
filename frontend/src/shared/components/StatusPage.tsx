type StatusPageProps = {
  code: "403" | "404";
  onGoHome: () => void;
  onShop: () => void;
};

const copy = {
  "403": {
    eyebrow: "Access restricted",
    title: "You don't have permission to view this page.",
    message: "Your account does not have the access needed for this area. If you think this is a mistake, contact an administrator."
  },
  "404": {
    eyebrow: "Page not found",
    title: "We couldn't find that page.",
    message: "The address may be incorrect, or the page may have moved."
  }
} as const;

/** Full-page recovery for an unavailable or inaccessible application route. */
export function StatusPage({ code, onGoHome, onShop }: StatusPageProps) {
  const content = copy[code];

  return (
    <main className="status-page" aria-labelledby="status-page-title">
      <section className="status-page__card">
        <p className="status-page__code" aria-hidden="true">{code}</p>
        <p className="eyebrow">{content.eyebrow}</p>
        <h1 id="status-page-title">{content.title}</h1>
        <p className="status-page__message">{content.message}</p>
        <div className="status-page__actions">
          <button className="solid-button" onClick={onGoHome} type="button">Go to home</button>
          <button className="outline-button" onClick={onShop} type="button">Browse the store</button>
        </div>
      </section>
    </main>
  );
}
