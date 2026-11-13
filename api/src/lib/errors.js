// Errors the API sends back as { error: { code, message, fields? } }.

export class HttpError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export const badRequest = (fields) => new HttpError(400, 'VALIDATION_ERROR', 'Some fields are invalid.', fields);
export const notFound = (what) => new HttpError(404, 'NOT_FOUND', `${what} not found.`);
export const conflict = (code, message) => new HttpError(409, code, message);

// Express error handler: the last middleware in app.js.
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    const body = { code: err.code, message: err.message };
    if (err.fields) body.fields = err.fields;
    return res.status(err.status).json({ error: body });
  }
  // Malformed JSON body (thrown by express.json()).
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON.' } });
  }
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong on our side.' } });
}

export function notFoundRoute(req, res, next) {
  next(new HttpError(404, 'NOT_FOUND', `No route for ${req.method} ${req.path}.`));
}
