import Navbar from "../components/Navbar";
import { API_URL } from "../api/axios";

const FEATURES = [
  {
    title: "Resume-based questions",
    body: "Every question is grounded in what's actually on your resume — no generic question banks.",
  },
  {
    title: "Job-specific preparation",
    body: "Paste a job description and get questions that connect your background to what the role needs.",
  },
  {
    title: "Project deep dives",
    body: "Expect the questions an interviewer would ask about the projects you've actually shipped.",
  },
  {
    title: "Resume defense",
    body: "Every claim and metric on your resume gets a question that asks you to explain it.",
  },
  {
    title: "Role-appropriate depth",
    body: "Questions are scaled to your target role, from fundamentals to system design.",
  },
  {
    title: "Preparation history",
    body: "Come back to any past preparation session without regenerating it.",
  },
];

const SAMPLE_QUESTIONS = [
  { cat: "Project deep dive", text: "Why did you choose Redis for the cart service?" },
  { cat: "Resume defense", text: "You mention a 40% latency reduction — how was that measured?" },
  { cat: "Role fundamentals", text: "Walk me through what happens when you call malloc." },
];

export default function Landing() {
  function handleGoogleLogin() {
    window.location.href = `${API_URL}/auth/google`;
  }

  return (
    <div className="page">
      <Navbar />
      <main className="page-body">
        <section className="hero shell">
          <div className="hero-grid">
            <div>
              <h1 className="display-xl">
                Prepare for the questions they'll actually ask.
              </h1>
              <p className="lede" style={{ marginTop: 20 }}>
                InterviewLens reads your resume, your target role, and the job description, then
                builds an interview preparation session around your actual experience.
              </p>
              <div className="hero-cta">
                <button className="btn btn-primary" onClick={handleGoogleLogin}>
                  Continue with Google
                </button>
              </div>
            </div>

            <div className="hero-panel">
              <p className="hero-panel-label">A sample from a real session</p>
              {SAMPLE_QUESTIONS.map((q, i) => (
                <div className="sample-q" key={i}>
                  <span className="sample-q-cat">{q.cat}</span>
                  {q.text}
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>

      {/* <footer className="site-footer">
        <div className="shell">InterviewLens.</div>
      </footer> */}
    </div>
  );
}
