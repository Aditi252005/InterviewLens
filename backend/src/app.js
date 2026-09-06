const express = require("express");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("./config/passport");

const healthRoutes = require("./routes/health");
const authRoutes = require("./routes/auth");
const interviewRoutes = require("./routes/interviews");
const { notFoundHandler, errorHandler, AppError } = require("./middleware/errorHandler");

function createApp() {
  const app = express();

  const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
  const isProduction = process.env.NODE_ENV === "production";

  app.set("trust proxy", 1); // needed for secure cookies behind Render/Railway/Vercel proxies

  app.use(
    cors({
      origin: CLIENT_URL,
      credentials: true,
    })
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  if (!process.env.SESSION_SECRET) {
    throw new AppError("SESSION_SECRET is not set in the environment", 500, "MISSING_CONFIG");
  }

  app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: process.env.MONGODB_URI
        ? MongoStore.create({ mongoUrl: process.env.MONGODB_URI, ttl: 14 * 24 * 60 * 60 })
        : undefined,
      cookie: {
        httpOnly: true,
        secure: isProduction, // requires HTTPS in production
        sameSite: isProduction ? "none" : "lax",
        maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  app.use("/api/health", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/interviews", interviewRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
