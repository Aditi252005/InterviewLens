import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../api/axios";

const ROLES = [
  "SDE-1",
  "SDE-2",
  "Frontend Engineer",
  "Backend Engineer",
  "Full Stack Engineer",
  "Data Engineer",
  "DevOps Engineer",
  "QA Engineer",
];

const MAX_FILE_MB = 5;

const LOADING_STEPS = [
  "Reading your resume",
  "Identifying projects and skills",
  "Generating personalized questions",
];

export default function PrepareForm() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [targetRole, setTargetRole] = useState(ROLES[0]);
  const [jobDescription, setJobDescription] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState("");

  // Purely cosmetic step-cycling while the single real request is in flight.
  useEffect(() => {
    if (!submitting) return undefined;
    setStepIndex(0);
    const interval = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, LOADING_STEPS.length - 1));
    }, 1800);
    return () => clearInterval(interval);
  }, [submitting]);

  function validateAndSetFile(candidate) {
    setError("");
    if (!candidate) return;
    if (candidate.type !== "application/pdf") {
      setError("Please upload a PDF file.");
      return;
    }
    if (candidate.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`That file is too large. Maximum size is ${MAX_FILE_MB} MB.`);
      return;
    }
    setFile(candidate);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    validateAndSetFile(e.dataTransfer.files?.[0]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!file) {
      setError("Please upload your resume as a PDF.");
      return;
    }
    if (!targetRole) {
      setError("Please select a target role.");
      return;
    }

    const formData = new FormData();
    formData.append("resume", file);
    formData.append("targetRole", targetRole);
    formData.append("jobDescription", jobDescription);

    setSubmitting(true);
    try {
      const res = await api.post("/interviews/generate", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      navigate(`/sessions/${res.data.session._id}`, { state: { session: res.data.session } });
    } catch (err) {
      setSubmitting(false);
      const message = err?.response?.data?.error || "Something went wrong while generating your questions. Please try again.";
      setError(message);
    }
  }

  if (submitting) {
    return (
      <div className="page">
        <Navbar />
        <main className="page-body">
          <div className="shell form-shell">
            <div className="loading-panel">
              <p className="section-label" style={{ marginBottom: 20 }}>generating your questions</p>
              {LOADING_STEPS.map((step, i) => (
                <div key={step} className={`loading-step ${i === stepIndex ? "active" : i < stepIndex ? "done" : ""}`}>
                  <span className="loading-dot" />
                  {step}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page">
      <Navbar />
      <main className="page-body">
        <div className="shell form-shell">
          <p className="section-label">prepare for an interview</p>
          <h1 className="display-lg" style={{ marginBottom: 32 }}>Tell us what you're preparing for</h1>

          {error ? <div className="error-banner">{error}</div> : null}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Resume</label>
              {file ? (
                <div className="dropzone-file">
                  <div>
                    <div className="dropzone-title">{file.name}</div>
                    <div className="dropzone-sub">{(file.size / (1024 * 1024)).toFixed(2)} MB</div>
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFile(null)}>
                    Remove
                  </button>
                </div>
              ) : (
                <div
                  className={`dropzone ${dragActive ? "drag-active" : ""}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                >
                  <div className="dropzone-title">Drag and drop your resume here</div>
                  <div className="dropzone-sub">or click to browse — PDF only, max {MAX_FILE_MB} MB</div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    hidden
                    onChange={(e) => validateAndSetFile(e.target.files?.[0])}
                  />
                </div>
              )}
              <div className="privacy-note">
                <span className="privacy-dot" style={{ marginTop: 6 }} />
                <span>Your resume is processed temporarily and is not permanently stored.</span>
              </div>
            </div>

            <div className="field">
              <label htmlFor="targetRole">Target role</label>
              <select
                id="targetRole"
                className="select"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="jobDescription">Job description (optional)</label>
              <textarea
                id="jobDescription"
                className="textarea"
                placeholder="Paste the job description to get questions specific to this role…"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                maxLength={6000}
              />
              <div className="field-hint">{jobDescription.length}/6000 characters</div>
            </div>

            <button type="submit" className="btn btn-primary btn-block">
              Generate questions
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
