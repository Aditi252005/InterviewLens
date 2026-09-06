const request = require("supertest");
const mongoose = require("mongoose");
const { setupTestDB, teardownTestDB } = require("./setup");
const buildTestApp = require("./testApp");
const InterviewSession = require("../models/InterviewSession");

let app;
let ownerSessionId;
const OWNER_ID = new mongoose.Types.ObjectId().toString();
const OTHER_USER_ID = new mongoose.Types.ObjectId().toString();

beforeAll(async () => {
  await setupTestDB();
  app = buildTestApp();

  const session = await InterviewSession.create({
    userId: OWNER_ID,
    resumeFileName: "resume.pdf",
    targetRole: "SDE-1",
    jobDescription: "",
    questions: [
      { category: "technical", difficulty: "easy", question: "What is a REST API?", source: "", followUps: [] },
    ],
  });
  ownerSessionId = session._id.toString();
});

afterAll(teardownTestDB);

describe("interview session authorization", () => {
  test("unauthenticated request is rejected", async () => {
    const res = await request(app).get(`/api/interviews/${ownerSessionId}`);
    expect(res.status).toBe(401);
  });

  test("owner can access their own session", async () => {
    const res = await request(app)
      .get(`/api/interviews/${ownerSessionId}`)
      .set("x-test-user-id", OWNER_ID);

    expect(res.status).toBe(200);
    expect(res.body.session._id).toBe(ownerSessionId);
  });

  test("a different authenticated user cannot access someone else's session", async () => {
    const res = await request(app)
      .get(`/api/interviews/${ownerSessionId}`)
      .set("x-test-user-id", OTHER_USER_ID);

    expect(res.status).toBe(404);
  });

  test("a different authenticated user cannot delete someone else's session", async () => {
    const res = await request(app)
      .delete(`/api/interviews/${ownerSessionId}`)
      .set("x-test-user-id", OTHER_USER_ID);

    expect(res.status).toBe(404);

    const stillExists = await InterviewSession.findById(ownerSessionId);
    expect(stillExists).not.toBeNull();
  });

  test("GET /api/interviews only returns sessions for the authenticated user", async () => {
    const res = await request(app).get("/api/interviews").set("x-test-user-id", OTHER_USER_ID);

    expect(res.status).toBe(200);
    expect(res.body.sessions).toHaveLength(0);
  });
});
