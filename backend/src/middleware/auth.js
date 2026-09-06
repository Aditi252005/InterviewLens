// Guards routes that require a logged-in user. The authenticated user is
// always read from the server-side session (req.user, set by Passport) —
// never from a body/query/param value supplied by the client.
function requireAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    return next();
  }
  return res.status(401).json({ error: "Authentication required." });
}

module.exports = { requireAuth };
