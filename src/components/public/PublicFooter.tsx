import { Link } from "react-router-dom";
import { InstagramIcon, SpotifyIcon } from "./icons";

const INSTAGRAM_URL = "https://www.instagram.com/tal_echo/";
const SPOTIFY_URL = "https://open.spotify.com/intl-de/artist/3WNHBFT3fCOybw9dt38v4V";

export default function PublicFooter() {
  return (
    <footer className="pub-footer">
      <div className="pub-footer-social">
        <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Tal-Echo auf Instagram">
          <InstagramIcon />
        </a>
        <a href={SPOTIFY_URL} target="_blank" rel="noopener noreferrer" aria-label="Tal-Echo auf Spotify">
          <SpotifyIcon />
        </a>
      </div>
      <p className="pub-footer-text">© {new Date().getFullYear()} Tal-Echo — Ländlerformation aus Nidwalden</p>
      <p className="pub-footer-links">
        <Link to="/intern/login">Für Bandmitglieder</Link>
      </p>
    </footer>
  );
}
