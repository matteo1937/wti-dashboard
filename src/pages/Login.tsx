import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import * as api from "../lib/api";
import { ApiError } from "../lib/api";
import type { Member } from "../types";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Member | null>(null);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .getPublicMembers()
      .then((data) => setMembers(data.members))
      .catch(() => setError("Mitglieder konnten nicht geladen werden."));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) {
      setError("Bitte wähle dein Profil aus.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await login(selected.name, passcode);
      navigate("/offene-anfragen", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Anmeldung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-logo">🏔️</div>
        <h1>Tal-Echo</h1>
        <p className="hint">Auftrittsanfragen für unser Ländlertrio</p>

        {error && <div className="error-box">{error}</div>}

        <div className="member-picker">
          {members.map((m) => (
            <button
              type="button"
              key={m.id}
              className={selected?.id === m.id ? "selected" : ""}
              onClick={() => setSelected(m)}
            >
              {m.name}
            </button>
          ))}
        </div>

        <div className="field">
          <label htmlFor="passcode">Zugangscode</label>
          <input
            id="passcode"
            type="password"
            inputMode="text"
            autoComplete="current-password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="•••••••"
          />
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Anmelden …" : "Anmelden"}
        </button>
      </form>
    </div>
  );
}
