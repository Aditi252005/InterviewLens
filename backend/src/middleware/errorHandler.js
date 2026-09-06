// Central error handler. Never leaks stack traces, API keys, connection
// strings, or resume content to the client — only a safe message and,
// for known error types, a stable error code.

class AppError extends Error {
  constructor(message, statusCode = 400, code = "BAD_REQUEST") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: "Not found." });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  // Log only the message and code server-side; never log request bodies
  // (which could contain resume text or job descriptions).
  console.error(`[error] ${req.method} ${req.path} -> ${statusCode}: ${err.message}`);

  const payload = {
    error: statusCode === 500 ? "Something went wrong. Please try again." : err.message,
  };
  if (err.code) payload.code = err.code;

  res.status(statusCode).json(payload);
}

module.exports = { AppError, notFoundHandler, errorHandler };
