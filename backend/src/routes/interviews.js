const express = require("express");
const mongoose = require("mongoose");

const { requireAuth } = require("../middleware/auth");
const { generateLimiter } = require("../middleware/rateLimiter");
const { upload, assertRealPdf, safeDelete } = require("../middleware/upload");
const { AppError } = require("../middleware/errorHandler");
const asyncHandler = require("../utils/asyncHandler");
const InterviewSession = require("../models/InterviewSession");
const { generateInterviewQuestions } = require("../services/geminiService");

const router = express.Router();

const MAX_JD_CHARS = Number(process.env.MAX_JOB_DESCRIPTION_CHARS || 6000);
const ALLOWED_ROLES = [
  "SDE-1",
  "SDE-2",
  "Frontend Engineer",
  "Backend Engineer",
  "Full Stack Engineer",
  "Data Engineer",
  "DevOps Engineer",
  "QA Engineer",
];

router.use(requireAuth);

// POST /api/interviews/generate
router.post(
  "/generate",
  generateLimiter,
  upload.single("resume"),
  asyncHandler(async (req, res) => {
    const { targetRole } = req.body;
    let { jobDescription } = req.body;
    jobDescription = typeof jobDescription === "string" ? jobDescription.trim() : "";

    // Validate inputs before ever touching the file or calling Gemini.
    if (!req.file) {
      throw new AppError("A resume PDF is required.", 400, "RESUME_REQUIRED");
    }
    if (!targetRole || !targetRole.trim()) {
      safeDelete(req.file.path);
      throw new AppError("A target role is required.", 400, "ROLE_REQUIRED");
    }
    if (!ALLOWED_ROLES.includes(targetRole)) {
      safeDelete(req.file.path);
      throw new AppError("Unsupported target role.", 400, "INVALID_ROLE");
    }
    if (jobDescription.length > MAX_JD_CHARS) {
      safeDelete(req.file.path);
      throw new AppError(`Job description is too long (max ${MAX_JD_CHARS} characters).`, 400, "JD_TOO_LONG");
    }

    try {
      assertRealPdf(req.file.path); // throws + cleans up if not a real PDF

      const questions = await generateInterviewQuestions(req.file.path, targetRole, jobDescription);

      const session = await InterviewSession.create({
        userId: req.user.id, // always the authenticated user, never from the client
        resumeFileName: req.file.originalname,
        targetRole,
        jobDescription,
        questions,
      });

      res.status(201).json({ session });
    } finally {
      // The temporary resume is deleted whether generation succeeded or failed.
      safeDelete(req.file.path);
    }
  })
);

// GET /api/interviews - only the authenticated user's own sessions
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const sessions = await InterviewSession.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .select("resumeFileName targetRole jobDescription createdAt questions");

    const summaries = sessions.map((s) => ({
      id: s._id,
      resumeFileName: s.resumeFileName,
      targetRole: s.targetRole,
      hasJobDescription: Boolean(s.jobDescription && s.jobDescription.length > 0),
      questionCount: s.questions.length,
      createdAt: s.createdAt,
    }));

    res.json({ sessions: summaries });
  })
);

// GET /api/interviews/:id - must belong to the authenticated user
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw new AppError("Preparation session not found.", 404, "NOT_FOUND");
    }

    const session = await InterviewSession.findOne({
      _id: req.params.id,
      userId: req.user.id, // ownership check baked into the query, not checked after the fact
    });

    if (!session) {
      throw new AppError("Preparation session not found.", 404, "NOT_FOUND");
    }

    res.json({ session });
  })
);

// DELETE /api/interviews/:id - must belong to the authenticated user
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw new AppError("Preparation session not found.", 404, "NOT_FOUND");
    }

    const result = await InterviewSession.deleteOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (result.deletedCount === 0) {
      throw new AppError("Preparation session not found.", 404, "NOT_FOUND");
    }

    res.json({ message: "Preparation session deleted." });
  })
);

module.exports = router;
