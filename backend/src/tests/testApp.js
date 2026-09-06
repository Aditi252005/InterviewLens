const express = require("express");
const interviewRoutes = require("../routes/interviews");
const { notFoundHandler, errorHandler } = require("../middleware/errorHandler");

// Builds an app where the "authenticated user" is controlled per-request via
// the x-test-user-id header, standing in for a real session/Passport user.
// This lets tests exercise authorization logic (ownership checks) without
// needing a full Google OAuth flow.
function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use((req, res, next) => {
    const userId = req.header("x-test-user-id");
    if (userId) {
      req.user = { id: userId };
      req.isAuthenticated = () => true;
    } else {
      req.isAuthenticated = () => false;
    }
    next();
  });

  app.use("/api/interviews", interviewRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = buildTestApp;
