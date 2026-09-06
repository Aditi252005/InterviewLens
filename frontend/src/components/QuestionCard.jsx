import { useState } from "react";

const CATEGORY_LABEL = {
  project: "Project deep dive",
  technical: "Technical",
  role: "Role fundamentals",
  jobDescription: "From the job description",
  resumeDefense: "Resume defense",
};

export default function QuestionCard({ question }) {
  const [open, setOpen] = useState(false);
  const hasFollowUps = question.followUps && question.followUps.length > 0;

  return (
    <div className="q-card">
      <div className="q-card-top">
        <span className={`difficulty difficulty-${question.difficulty}`}>{question.difficulty}</span>
        <span className="mono-tag">{CATEGORY_LABEL[question.category] || question.category}</span>
      </div>

      <p className="q-text">{question.question}</p>

      {question.source ? (
        <p className="q-source">
          <b>Source:</b> {question.source}
        </p>
      ) : null}

      {hasFollowUps ? (
        <>
          <button className="followups-toggle" onClick={() => setOpen((v) => !v)}>
            {open ? "Hide follow-up questions" : `Show ${question.followUps.length} follow-up question${question.followUps.length > 1 ? "s" : ""}`}
          </button>
          {open ? (
            <ul className="followups-list">
              {question.followUps.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
