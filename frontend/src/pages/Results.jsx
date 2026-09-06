import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import QuestionCard from "../components/QuestionCard";
import api from "../api/axios";

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "project", label: "Project" },
  { key: "technical", label: "Technical" },
  { key: "role", label: "Role" },
  { key: "jobDescription", label: "Job description" },
  { key: "resumeDefense", label: "Resume defense" },
];

export default function Results() {
  const { id } = useParams();
  const location = useLocation();

  const [session, setSession] = useState(location.state?.session || null);
  const [loading, setLoading] = useState(!location.state?.session);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (session && session._id === id) return; // already have it from navigation state
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await api.get(`/interviews/${id}`);
        if (!cancelled) setSession(res.data.session);
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.status === 404
              ? "This preparation session doesn't exist or isn't yours."
              : "Couldn't load this preparation session."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const counts = useMemo(() => {
    if (!session) return {};
    const c = { all: session.questions.length };
    for (const q of session.questions) c[q.category] = (c[q.category] || 0) + 1;
    return c;
  }, [session]);

  const visibleQuestions = useMemo(() => {
    if (!session) return [];
    if (activeTab === "all") return session.questions;
    return session.questions.filter((q) => q.category === activeTab);
  }, [session, activeTab]);

  if (loading) {
    return (
      <div className="page">
        <Navbar />
        <div className="page-loading">Loading your preparation session…</div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="page">
        <Navbar />
        <main className="page-body">
          <div className="shell">
            <Link to="/dashboard" className="link-back">← Back to dashboard</Link>
            <div className="error-banner">{error || "Session not found."}</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page">
      <Navbar />
      <main className="page-body">
        <div className="shell">
          <Link to="/dashboard" className="link-back">← Back to dashboard</Link>

          <div className="results-header">
            <p className="section-label">your personalized interview preparation</p>
            <h1 className="display-lg">{session.targetRole}</h1>
            <p className="results-meta">
              {session.questions.length} questions · resume: {session.resumeFileName}
            </p>
          </div>

          <div className="tabs">
            {CATEGORIES.map((c) => {
              const count = counts[c.key] || 0;
              if (c.key !== "all" && count === 0) return null;
              return (
                <button
                  key={c.key}
                  className={`tab ${activeTab === c.key ? "active" : ""}`}
                  onClick={() => setActiveTab(c.key)}
                >
                  {c.label} <span className="tab-count">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="question-list">
            {visibleQuestions.map((q, i) => (
              <QuestionCard question={q} key={i} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
