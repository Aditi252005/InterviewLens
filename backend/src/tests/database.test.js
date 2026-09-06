const mongoose = require("mongoose");
const { setupTestDB, teardownTestDB } = require("./setup");
const InterviewSession = require("../models/InterviewSession");

beforeAll(setupTestDB);
afterAll(teardownTestDB);

describe("InterviewSession model", () => {
  test("saves a session with embedded questions correctly", async () => {
    const userId = new mongoose.Types.ObjectId();

    const session = await InterviewSession.create({
      userId,
      resumeFileName: "resume.pdf",
      targetRole: "SDE-1",
      jobDescription: "Some JD text",
      questions: [
        { category: "project", difficulty: "medium", question: "Why Redis?", source: "Cart Service", followUps: ["What if it goes down?"] },
      ],
    });

    expect(session._id).toBeDefined();
    expect(session.createdAt).toBeDefined();
    expect(session.questions[0].category).toBe("project");
  });

  test("filters sessions by userId", async () => {
    const userA = new mongoose.Types.ObjectId();
    const userB = new mongoose.Types.ObjectId();

    await InterviewSession.create({ userId: userA, resumeFileName: "a.pdf", targetRole: "SDE-1", questions: [] });
    await InterviewSession.create({ userId: userB, resumeFileName: "b.pdf", targetRole: "SDE-1", questions: [] });

    const aSessions = await InterviewSession.find({ userId: userA });
    expect(aSessions.every((s) => s.userId.toString() === userA.toString())).toBe(true);
    expect(aSessions).toHaveLength(1);
  });
});
