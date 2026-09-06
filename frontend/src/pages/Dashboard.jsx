import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function Dashboard() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await api.get("/interviews");
        if (!cancelled) setSessions(res.data.sessions);
      } catch {
        if (!cancelled) setError("Couldn't load your preparation history. Please refresh the page.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page">
      <Navbar />
      <main className="page-body">
        <div className="shell">
          <div className="dash-header">
            <div>
              <p className="section-label">dashboard</p>
              <h1 className="display-lg">Welcome back, {user?.name?.split(" ")[0]}</h1>
            </div>
            <Link to="/prepare" className="btn btn-primary">
              Prepare for an interview
            </Link>
          </div>

          <p className="section-label">Previous preparations</p>

          {error ? <div className="error-banner">{error}</div> : null}

          {loading ? (
            <div className="page-loading">Loading your sessions…</div>
          ) : sessions.length === 0 ? (
            <div className="empty-state">
              <h3>No preparation sessions yet</h3>
              <p>Upload a resume and pick a target role to generate your first set of questions.</p>
            </div>
          ) : (
            <div className="history-list">
              {sessions.map((s) => (
                <div className="history-row" key={s.id}>
                  <div className="history-main">
                    <h3>{s.targetRole}</h3>
                    <div className="history-meta">
                      {s.questionCount} questions · {formatDate(s.createdAt)}
                      {s.hasJobDescription ? " · with job description" : ""}
                    </div>
                  </div>
                  <Link to={`/sessions/${s.id}`} className="btn btn-ghost btn-sm">
                    View
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
