export default function Hero() {
  return (
    <section className="pub-hero">
      <img src="/images/band-hero.jpg" alt="Tal-Echo in den Nidwaldner Bergen" className="pub-hero-image" />
      <div className="pub-hero-overlay" />
      <div className="pub-hero-content">
        <p className="pub-hero-eyebrow">Ländlerformation aus Nidwalden</p>
        <h1 className="pub-hero-title">Tal-Echo</h1>
        <p className="pub-hero-tagline">
          Handgemachte Volksmusik für Hochzeiten, Feste und unvergessliche Anlässe.
        </p>
        <a href="#anfrage" className="pub-btn pub-btn-primary pub-hero-cta">
          Jetzt anfragen
        </a>
      </div>
    </section>
  );
}
