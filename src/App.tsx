import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import { RequestsProvider, useRequests } from "./context/RequestsContext";
import Calendar from "./pages/Calendar";
import Login from "./pages/Login";
import NewRequest from "./pages/NewRequest";
import OpenRequests from "./pages/OpenRequests";
import PublicBookingForm from "./pages/PublicBookingForm";
import RequestDetail from "./pages/RequestDetail";

function Shell() {
  const { requests } = useRequests();
  const openRequests = requests.filter((r) => r.status === "open");

  return (
    <div className="app-shell">
      <Navbar openRequests={openRequests} />
      <div className="main-content">
        <Routes>
          <Route path="offene-anfragen" element={<OpenRequests />} />
          <Route path="neue-anfrage" element={<NewRequest />} />
          <Route path="anfragen/:id" element={<RequestDetail />} />
          <Route path="kalender" element={<Calendar />} />
          <Route path="*" element={<Navigate to="/intern/offene-anfragen" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function InternLogin() {
  const { member, loading } = useAuth();
  if (loading) {
    return <div className="main-content">Lade …</div>;
  }
  if (member) {
    return <Navigate to="/intern/offene-anfragen" replace />;
  }
  return <Login />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicBookingForm />} />
      <Route path="/intern/login" element={<InternLogin />} />
      <Route
        path="/intern/*"
        element={
          <ProtectedRoute>
            <RequestsProvider>
              <Shell />
            </RequestsProvider>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
