import { useState } from "react";
import { OrganizationSwitcher, SignedIn, SignedOut, SignIn, useAuth } from "@clerk/clerk-react";
import { TeamHeader } from "./components/TeamHeader";
import { ScannerView } from "./components/ScannerView";
import { HistoryView } from "./components/HistoryView";
import type { UserRole } from "./types";

type View = "scanner" | "history";

export default function App() {
  const { orgId, orgRole } = useAuth();
  const [view, setView] = useState<View>("scanner");

  const role: UserRole | null = orgId ? (orgRole === "org:admin" ? "admin" : "mitglied") : null;

  return (
    <div className="app">
      <SignedOut>
        <div className="sign-in-wrapper">
          <h1>Elektro Scanner</h1>
          <p>Bitte anmelden, um zu scannen.</p>
          <SignIn routing="hash" />
        </div>
      </SignedOut>

      <SignedIn>
        <TeamHeader role={role} />

        {!orgId ? (
          <div className="no-org-box">
            <h1>Elektro Scanner</h1>
            <p>Bitte ein Team auswählen oder neu erstellen, um den Scanner zu nutzen.</p>
            <OrganizationSwitcher hidePersonal afterSelectOrganizationUrl="/" afterCreateOrganizationUrl="/" />
          </div>
        ) : (
          <main className="app-main">
            <header className="app-header">
              <h1>Elektro Scanner</h1>
              <p>Produkt fotografieren oder Barcode scannen – im Team geteilt.</p>
            </header>

            <div className="view-tabs">
              <button
                type="button"
                className={`view-tab ${view === "scanner" ? "active" : ""}`}
                onClick={() => setView("scanner")}
              >
                🔍 Scannen
              </button>
              <button
                type="button"
                className={`view-tab ${view === "history" ? "active" : ""}`}
                onClick={() => setView("history")}
              >
                📋 Scan-Historie
              </button>
            </div>

            {view === "scanner" ? <ScannerView role={role ?? "mitglied"} /> : <HistoryView />}
          </main>
        )}
      </SignedIn>
    </div>
  );
}
