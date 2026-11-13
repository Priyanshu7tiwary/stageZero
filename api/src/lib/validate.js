import { badRequest } from './errors.js';

// Check `data` against a zod schema. Returns the cleaned data, or throws a 400
// with one message per invalid field, e.g. { email: "Enter a valid email address" }.
export function validate(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) return result.data;

  const fields = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length ? issue.path.join('.') : 'body';
    fields[key] ??= issue.message;
  }
  throw badRequest(fields);
}
