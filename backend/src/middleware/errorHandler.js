function errorHandler(error, _req, res, _next) {
  let statusCode = error.statusCode || 500;
  let message = error.message || "Internal Server Error";

  if (error.name === "MulterError") {
    statusCode = 400;
    if (error.code === "LIMIT_FILE_SIZE") {
      message = "Image exceeds 5 MB limit";
    }
  }

  if (statusCode >= 500) {
    console.error("[backend]", error);
  }

  res.status(statusCode).json({
    success: false,
    message,
    details: error.details || null
  });
}

module.exports = { errorHandler };
