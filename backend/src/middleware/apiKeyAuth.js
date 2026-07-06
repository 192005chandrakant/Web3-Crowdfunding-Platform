function requireApiKey(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  const expectedKey = process.env.WEBHOOK_API_KEY;

  if (!expectedKey) {
    return res.status(503).json({
      success: false,
      message: "Webhook API key is not configured on this server"
    });
  }

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: "Missing X-API-Key header"
    });
  }

  if (apiKey !== expectedKey) {
    return res.status(403).json({
      success: false,
      message: "Invalid API key"
    });
  }

  next();
}

module.exports = { requireApiKey };
