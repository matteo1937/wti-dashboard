import Reveal from "./Reveal";

export default function About() {
  return (
    <div className="pub-section-wrap">
      <Reveal as="section" className="pub-section pub-center">
        <p className="pub-eyebrow">Willkommen</p>
        <h2 className="pub-heading">Musik, die von Herzen kommt</h2>
        <p className="pub-lede">
          Tal-Echo ist eine Ländlerformation aus Nidwalden. Mit Schwyzerörgeli, Akkordeon und
          Bassgeige sorgen wir für echte Stimmung — an der Hochzeit, am runden Geburtstag, beim
          Firmenanlass, an der Stubete oder am Dorffest. Traditionell verwurzelt, mit Herzblut
          gespielt.
        </p>
      </Reveal>
    </div>
  );
}
