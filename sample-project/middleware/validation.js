const validate = (schema) => (req, res, next) => {
  // A simplistic validation middleware. In a real app, you might use Joi or express-validator
  if (schema.body) {
    for (const key of schema.body) {
      if (req.body[key] === undefined) {
        return res.status(400).json({ error: `Missing required field: ${key}` });
      }
    }
  }
  next();
};

module.exports = validate;
