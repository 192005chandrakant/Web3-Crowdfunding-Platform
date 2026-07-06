function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;

  if (statusCode >= 500) {
    console.error("[backend]", error);
  }

  res.status(statusCode).json({
    success: false,
    message: error.message || "Internal Server Error",
    details: error.details || null
  });
}

module.exports = { errorHandler };
