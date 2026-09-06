const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { AppError } = require("../middleware/errorHandler");

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.0-flash";

const SYSTEM_PROMPT = `You are an experienced software engineering interviewer.

Your job is to prepare a candidate for an interview based on:
1. Their resume (attached as a PDF)
2. Their target role
3. An optional job description

Ground every resume-specific question in information actually present in the resume.

Never fabricate:
- projects
- technologies
- companies
- achievements
- metrics
- responsibilities
- experience

If the job description mentions a technology that is not present in the resume, you may
ask about it only as a job-description question, and you must never imply the candidate
already has experience with it.

Prioritize questions a real interviewer could realistically ask. For project claims,
generate progressively deeper follow-up questions. For quantitative claims (e.g.
"improved performance by 40%"), generate questions that push the candidate to explain
the baseline, how it was measured, what was actually changed, trade-offs, and how the
result was validated.

Tailor the depth of role and technical questions to the target role (e.g. keep an
SDE-1 / junior role focused on fundamentals, not senior-level system design).

Keep questions concise, realistic, and non-repetitive. Aim for roughly:
- projectQuestions: 5-10
- technicalQuestions: 8-12
- roleQuestions: 5-10
- jobDescriptionQuestions: 5-10 (only if a job description was provided; otherwise omit or leave empty)
- resumeDefenseQuestions: 5-8

Only generate as many questions as the resume/JD content actually supports — quality
over hitting a fixed count.

Return ONLY valid JSON matching the supplied schema. Do not include markdown fences,
commentary, or any text outside the JSON object.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "object",
      properties: {
        targetRole: { type: "string" },
        questionCount: { type: "number" },
      },
      required: ["targetRole", "questionCount"],
    },
    projectQuestions: { type: "array", items: questionSchemaFor() },
    technicalQuestions: { type: "array", items: questionSchemaFor() },
    roleQuestions: { type: "array", items: questionSchemaFor() },
    jobDescriptionQuestions: { type: "array", items: questionSchemaFor() },
    resumeDefenseQuestions: { type: "array", items: questionSchemaFor() },
  },
  required: [
    "summary",
    "projectQuestions",
    "technicalQuestions",
    "roleQuestions",
    "jobDescriptionQuestions",
    "resumeDefenseQuestions",
  ],
};

function questionSchemaFor() {
  return {
    type: "object",
    properties: {
      question: { type: "string" },
      difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
      source: { type: "string" },
      followUps: { type: "array", items: { type: "string" } },
    },
    required: ["question", "difficulty"],
  };
}

const CATEGORY_KEY_TO_ENUM = {
  projectQuestions: "project",
  technicalQuestions: "technical",
  roleQuestions: "role",
  jobDescriptionQuestions: "jobDescription",
  resumeDefenseQuestions: "resumeDefense",
};

/**
 * Sends the resume PDF, target role, and optional job description to
 * Gemini and returns a flat, validated array of question objects ready
 * to be embedded in an InterviewSession document.
 *
 * @param {string} resumeFilePath - path to the temporary PDF on disk
 * @param {string} targetRole
 * @param {string} jobDescription
 * @returns {Promise<Array>} validated question objects
 */
async function generateInterviewQuestions(resumeFilePath, targetRole, jobDescription) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AppError("AI service is not configured.", 500, "AI_NOT_CONFIGURED");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const resumeBase64 = fs.readFileSync(resumeFilePath).toString("base64");

  const userInstruction = [
    `Target role: ${targetRole}`,
    jobDescription && jobDescription.trim().length > 0
      ? `Job description:\n${jobDescription.trim()}`
      : "No job description was provided. Omit jobDescriptionQuestions (return an empty array).",
  ].join("\n\n");

  let result;
  try {
    result = await model.generateContent([
      { text: SYSTEM_PROMPT },
      { text: userInstruction },
      { inlineData: { mimeType: "application/pdf", data: resumeBase64 } },
    ]);
  } catch (err) {
    // Map common Gemini failure modes to clean, safe errors. Never forward
    // the raw SDK error (it can include request details) to the client.
    const message = (err && err.message) || "";
    console.error("Gemini request failed:", message);
    if (message.includes("429") || message.toLowerCase().includes("rate")) {
      throw new AppError("The AI service is busy right now. Please try again shortly.", 429, "AI_RATE_LIMITED");
    }
    if (message.toLowerCase().includes("timeout")) {
      throw new AppError("The AI service took too long to respond. Please try again.", 504, "AI_TIMEOUT");
    }
    
    throw new AppError("The AI service could not process your resume right now.", 502, "AI_REQUEST_FAILED");
  }

  const rawText = result.response.text();

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    console.error("Gemini returned non-JSON output.");
    throw new AppError("The AI service returned an unexpected response. Please try again.", 502, "AI_INVALID_JSON");
  }

  return validateAndFlatten(parsed);
}

/**
 * Validates the shape of the parsed Gemini response and flattens it into
 * the array-of-questions format stored on InterviewSession.questions.
 * Throws an AppError if the response doesn't match the expected schema.
 */
function validateAndFlatten(parsed) {
  if (!parsed || typeof parsed !== "object") {
    throw new AppError("The AI service returned an unexpected response.", 502, "AI_INVALID_SHAPE");
  }

  const questions = [];

  for (const key of Object.keys(CATEGORY_KEY_TO_ENUM)) {
    const list = parsed[key];
    if (list === undefined) continue; // jobDescriptionQuestions may be legitimately absent
    if (!Array.isArray(list)) {
      throw new AppError("The AI service returned an unexpected response.", 502, "AI_INVALID_SHAPE");
    }

    for (const item of list) {
      if (!item || typeof item.question !== "string" || item.question.trim().length === 0) {
        continue; // skip malformed entries rather than failing the whole session
      }
      const difficulty = ["easy", "medium", "hard"].includes(item.difficulty) ? item.difficulty : "medium";
      const followUps = Array.isArray(item.followUps) ? item.followUps.filter((f) => typeof f === "string") : [];

      questions.push({
        category: CATEGORY_KEY_TO_ENUM[key],
        difficulty,
        question: item.question.trim(),
        source: typeof item.source === "string" ? item.source.trim() : "",
        followUps,
      });
    }
  }

  if (questions.length === 0) {
    throw new AppError(
      "The AI service could not generate questions from this resume. Please try a different file.",
      502,
      "AI_EMPTY_RESULT"
    );
  }

  return questions;
}

module.exports = { generateInterviewQuestions };
