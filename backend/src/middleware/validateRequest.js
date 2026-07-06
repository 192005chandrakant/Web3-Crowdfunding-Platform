function validateRequest(schema, source = "body") {
  return (req, _res, next) => {
    const payload = source === "params" ? req.params : source === "query" ? req.query : req.body;
    const result = schema.safeParse(payload);

    if (!result.success) {
      const error = new Error("Validation failed");
      error.statusCode = 400;
      error.details = result.error.flatten();
      return next(error);
    }

    req.validated = req.validated || {};
    req.validated[source] = result.data;
    next();
  };
}

module.exports = { validateRequest };
