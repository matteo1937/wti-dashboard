import Reveal from "./Reveal";
import { AccordionIcon, DoubleBassIcon } from "./icons";

const MUSICIANS = [
  { name: "Lian Müller", role: "Bassgeige", icon: DoubleBassIcon },
  { name: "Matteo Zaugg", role: "Schwyzerörgeli & Akkordeon", icon: AccordionIcon },
  { name: "Fabian Odermatt", role: "Schwyzerörgeli & Akkordeon", icon: AccordionIcon }
];

export default function Lineup() {
  return (
    <div className="pub-section-wrap alt">
      <section className="pub-section">
        <Reveal className="pub-center">
          <p className="pub-eyebrow">Besetzung</p>
          <h2 className="pub-heading">Wer wir sind</h2>
        </Reveal>
        <div className="pub-lineup-grid">
          {MUSICIANS.map((musician, i) => (
            <Reveal key={musician.name} delay={i * 100}>
              <div className="pub-lineup-card">
                <musician.icon className="pub-lineup-icon" />
                <p className="pub-lineup-name">{musician.name}</p>
                <p className="pub-lineup-role">{musician.role}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
