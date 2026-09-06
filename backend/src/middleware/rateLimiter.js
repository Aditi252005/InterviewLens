const rateLimit = require("express-rate-limit");

// In-memory rate limiter for the MVP. This is per-process state, so it
// resets on restart and does not share state across multiple server
// instances. If this app is ever horizontally scaled behind a load
// balancer, replace the in-memory store with a shared/distributed one
// (e.g. a Redis-backed store) so limits are enforced consistently
// across instances. For a single-instance MVP this is sufficient.
const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 generation requests per user per hour
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate-limit per authenticated user when available, falling back to IP.
    return req.user && req.user.id ? `user:${req.user.id}` : req.ip;
  },
  message: { error: "You're generating questions too frequently. Please try again later." },
});

module.exports = { generateLimiter };
