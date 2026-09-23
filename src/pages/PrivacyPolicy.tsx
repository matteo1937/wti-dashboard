import { useEffect } from "react";
import { Link } from "react-router-dom";
import { trackPageView } from "../lib/api";

export default function PrivacyPolicy() {
  useEffect(() => {
    trackPageView("/datenschutz");
  }, []);

  return (
    <div className="public-landing">
      <div className="pub-section-wrap">
        <section className="pub-section" style={{ maxWidth: 760 }}>
          <p className="pub-eyebrow">Rechtliches</p>
          <h1 className="pub-heading">Datenschutzerklärung</h1>
          <p className="pub-lede" style={{ maxWidth: "none" }}>
            Diese Seite erklärt kurz und verständlich, welche Daten wir über diese Website erfassen
            und wofür wir sie verwenden.
          </p>

          <h2 className="pub-heading" style={{ fontSize: "1.3rem", marginTop: 40 }}>
            Verantwortliche Stelle
          </h2>
          <p className="pub-lede" style={{ maxWidth: "none" }}>
            Tal-Echo (Ländlerformation), erreichbar über{" "}
            <a href="mailto:tal-echo@hotmail.com">tal-echo@hotmail.com</a> oder{" "}
            <a href="tel:+41774528882">077 452 88 82</a>.
          </p>

          <h2 className="pub-heading" style={{ fontSize: "1.3rem", marginTop: 32 }}>
            Anfrageformular
          </h2>
          <p className="pub-lede" style={{ maxWidth: "none" }}>
            Wenn du uns über das Formular für einen Auftritt anfragst, speichern wir die von dir
            eingegebenen Angaben (Name, Kontaktdaten, sowie optional Ort, Datum, Uhrzeit und
            Nachricht) in unserem internen System. Diese Daten verwenden wir ausschliesslich, um
            deine Anfrage zu bearbeiten und dich zu kontaktieren. Wir geben sie nicht an Dritte
            weiter.
          </p>

          <h2 className="pub-heading" style={{ fontSize: "1.3rem", marginTop: 32 }}>
            Seitenaufrufe (Statistik)
          </h2>
          <p className="pub-lede" style={{ maxWidth: "none" }}>
            Um grob einzuschätzen, wie viele Personen unsere Website besuchen, zählen wir
            Seitenaufrufe. Dabei speichern wir weder IP-Adressen noch Cookies noch andere
            personenbezogene Kennungen — nur die aufgerufene Seite, eine grobe Herkunftsangabe und
            den Zeitpunkt, rein für unsere interne Auswertung.
          </p>

          <h2 className="pub-heading" style={{ fontSize: "1.3rem", marginTop: 32 }}>
            Eingebettete Inhalte Dritter
          </h2>
          <p className="pub-lede" style={{ maxWidth: "none" }}>
            Auf dieser Seite binden wir einen Spotify-Player ein und verlinken auf unser
            Instagram-Profil. Wenn du diese Inhalte nutzt, gelten die Datenschutzbestimmungen von
            Spotify bzw. Meta/Instagram — wir haben darauf keinen Einfluss.
          </p>

          <h2 className="pub-heading" style={{ fontSize: "1.3rem", marginTop: 32 }}>
            Deine Rechte
          </h2>
          <p className="pub-lede" style={{ maxWidth: "none" }}>
            Du kannst jederzeit Auskunft über die bei uns gespeicherten Daten verlangen oder deren
            Berichtigung bzw. Löschung. Melde dich dazu einfach per E-Mail oder Telefon bei uns.
          </p>

          <p style={{ marginTop: 40 }}>
            <Link to="/">← Zurück zur Startseite</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
