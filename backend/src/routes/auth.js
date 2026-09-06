const express = require("express");
const passport = require("passport");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: `${CLIENT_URL}/login-failed`, session: true }),
  (req, res) => {
    res.redirect(`${CLIENT_URL}/dashboard`);
  }
);

// Returns the currently authenticated user, or 401 if not logged in.
router.get("/me", requireAuth, (req, res) => {
  const { id, name, email, profileImage } = req.user;
  res.json({ user: { id, name, email, profileImage } });
});

router.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out." });
    });
  });
});

module.exports = router;
