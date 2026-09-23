import Reveal from "./Reveal";
import { InstagramIcon, SpotifyIcon } from "./icons";

const SPOTIFY_ARTIST_ID = "3WNHBFT3fCOybw9dt38v4V";
const INSTAGRAM_URL = "https://www.instagram.com/tal_echo/";
const SPOTIFY_URL = "https://open.spotify.com/intl-de/artist/3WNHBFT3fCOybw9dt38v4V";

export default function Listen() {
  return (
    <div className="pub-section-wrap">
      <section className="pub-section">
        <Reveal className="pub-center">
          <p className="pub-eyebrow">Hörproben</p>
          <h2 className="pub-heading">Reinhören &amp; folgen</h2>
          <p className="pub-lede">
            Ein paar Klangbeispiele gefällig? Auf Spotify findet ihr unsere Aufnahmen, auf
            Instagram Eindrücke von unseren Auftritten.
          </p>
        </Reveal>
        <div className="pub-listen-inner">
          <Reveal className="pub-spotify-embed">
            <iframe
              title="Tal-Echo auf Spotify"
              src={`https://open.spotify.com/embed/artist/${SPOTIFY_ARTIST_ID}?utm_source=generator&theme=0`}
              width="100%"
              height="352"
              style={{ border: 0 }}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
          </Reveal>
          <Reveal delay={100} className="pub-social-links">
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="pub-social-link">
              <InstagramIcon />
              <span>
                Instagram
                <span className="pub-social-sub">@tal_echo</span>
              </span>
            </a>
            <a href={SPOTIFY_URL} target="_blank" rel="noopener noreferrer" className="pub-social-link">
              <SpotifyIcon />
              <span>
                Spotify
                <span className="pub-social-sub">Alle Aufnahmen anhören</span>
              </span>
            </a>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
