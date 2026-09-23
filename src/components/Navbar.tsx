import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { BookingRequest } from "../types";

export default function Navbar({ openRequests }: { openRequests: BookingRequest[] }) {
  const { member, logout } = useAuth();

  const missingVoteCount = member
    ? openRequests.filter((r) => !r.votes.find((v) => v.memberId === member.id)?.vote).length
    : 0;

  return (
    <>
      <div className="navbar">
        <span className="navbar-brand">🏔️ Tal-Echo</span>
        {member && (
          <div className="navbar-user">
            <span>{member.name}</span>
            <button className="btn btn-ghost btn-sm" style={{ color: "#fff" }} onClick={() => logout()}>
              Abmelden
            </button>
          </div>
        )}
      </div>
      {member && (
        <div className="tabbar">
          <NavLink to="/intern/offene-anfragen" className={({ isActive }) => `tab-link${isActive ? " active" : ""}`}>
            Offen
            {missingVoteCount > 0 && <span className="tab-badge">{missingVoteCount}</span>}
          </NavLink>
          <NavLink to="/intern/neue-anfrage" className={({ isActive }) => `tab-link${isActive ? " active" : ""}`}>
            + Neue Anfrage
          </NavLink>
          <NavLink to="/intern/kalender" className={({ isActive }) => `tab-link${isActive ? " active" : ""}`}>
            Kalender
          </NavLink>
        </div>
      )}
    </>
  );
}
