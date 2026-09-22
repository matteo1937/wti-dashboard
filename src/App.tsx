import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import { RequestsProvider, useRequests } from "./context/RequestsContext";
import Calendar from "./pages/Calendar";
import Login from "./pages/Login";
import NewRequest from "./pages/NewRequest";
import OpenRequests from "./pages/OpenRequests";
import RequestDetail from "./pages/RequestDetail";

function Shell() {
  const { requests } = useRequests();
  const openRequests = requests.filter((r) => r.status === "open");

  return (
    <div className="app-shell">
      <Navbar openRequests={openRequests} />
      <div className="main-content">
        <Routes>
          <Route path="/offene-anfragen" element={<OpenRequests />} />
          <Route path="/neue-anfrage" element={<NewRequest />} />
          <Route path="/anfragen/:id" element={<RequestDetail />} />
          <Route path="/kalender" element={<Calendar />} />
          <Route path="*" element={<Navigate to="/offene-anfragen" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  const { member, loading } = useAuth();

  if (loading) {
    return <div className="main-content">Lade …</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={member ? <Navigate to="/offene-anfragen" replace /> : <Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <RequestsProvider>
              <Shell />
            </RequestsProvider>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
