const fs = require("fs");
const request = require("supertest");
const mongoose = require("mongoose");

jest.mock("../services/geminiService");
const { generateInterviewQuestions } = require("../services/geminiService");

const { setupTestDB, teardownTestDB } = require("./setup");
const buildTestApp = require("./testApp");
const InterviewSession = require("../models/InterviewSession");
const { TMP_DIR } = require("../middleware/upload");

const USER_ID = new mongoose.Types.ObjectId().toString();

// Minimal, valid-looking PDF bytes (just needs to start with "%PDF-" for
// our magic-byte check).
const FAKE_PDF_BUFFER = Buffer.from("%PDF-1.4\n%fake-pdf-for-tests\n%%EOF");

function countTmpFiles() {
  return fs.readdirSync(TMP_DIR).filter((f) => f !== ".gitkeep").length;
}

let app;

beforeAll(async () => {
  await setupTestDB();
  app = buildTestApp();
});

afterAll(teardownTestDB);

afterEach(() => {
  jest.clearAllMocks();
});

describe("POST /api/interviews/generate", () => {
  test("rejects a non-PDF file", async () => {
    const res = await request(app)
      .post("/api/interviews/generate")
      .set("x-test-user-id", USER_ID)
      .field("targetRole", "SDE-1")
      .attach("resume", Buffer.from("not a pdf"), { filename: "resume.txt", contentType: "text/plain" });

    expect(res.status).toBe(400);
    expect(generateInterviewQuestions).not.toHaveBeenCalled();
  });

  test("rejects a request missing targetRole", async () => {
    const res = await request(app)
      .post("/api/interviews/generate")
      .set("x-test-user-id", USER_ID)
      .attach("resume", FAKE_PDF_BUFFER, { filename: "resume.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(400);
  });

  test("successful Gemini response is stored and the temp file is cleaned up", async () => {
    const filesBefore = countTmpFiles();

    generateInterviewQuestions.mockResolvedValueOnce([
      { category: "technical", difficulty: "easy", question: "What is a closure?", source: "JavaScript", followUps: [] },
    ]);

    const res = await request(app)
      .post("/api/interviews/generate")
      .set("x-test-user-id", USER_ID)
      .field("targetRole", "SDE-1")
      .field("jobDescription", "")
      .attach("resume", FAKE_PDF_BUFFER, { filename: "resume.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(201);
    expect(res.body.session.questions).toHaveLength(1);

    const stored = await InterviewSession.findOne({ userId: USER_ID });
    expect(stored).not.toBeNull();
    expect(stored.resumeFileName).toBe("resume.pdf");

    // Temp file should be deleted after processing.
    expect(countTmpFiles()).toBe(filesBefore);
  });

  test("Gemini failure is handled gracefully and the temp file is still cleaned up", async () => {
    const filesBefore = countTmpFiles();

    generateInterviewQuestions.mockRejectedValueOnce(new Error("Gemini exploded"));

    const res = await request(app)
      .post("/api/interviews/generate")
      .set("x-test-user-id", USER_ID)
      .field("targetRole", "SDE-1")
      .attach("resume", FAKE_PDF_BUFFER, { filename: "resume.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(500);
    expect(countTmpFiles()).toBe(filesBefore);
  });
});
