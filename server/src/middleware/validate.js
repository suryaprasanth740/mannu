import { badRequest } from '../utils/http.js';

/** Validate req[source] against a zod schema and replace it with the parsed value. */
export const validate =
  (schema, source = 'body') =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      const fields = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.') || '_';
        if (!fields[key]) fields[key] = issue.message;
      }
      const first = Object.entries(fields)[0];
      return next(badRequest(first ? `${first[0]}: ${first[1]}` : 'Invalid input', fields));
    }
    req[source] = result.data;
    next();
  };
