const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ["project", "technical", "role", "jobDescription", "resumeDefense"],
      required: true,
    },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true },
    question: { type: String, required: true },
    source: { type: String, default: "" },
    followUps: { type: [String], default: [] },
  },
  { _id: false }
);

const interviewSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    resumeFileName: { type: String, required: true },
    targetRole: { type: String, required: true },
    jobDescription: { type: String, default: "" },
    questions: { type: [questionSchema], default: [] },
  },
  { timestamps: true }
);

// Sessions are almost always listed per-user, most recent first.
interviewSessionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("InterviewSession", interviewSessionSchema);
