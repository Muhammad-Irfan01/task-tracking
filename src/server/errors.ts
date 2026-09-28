import type { FieldErrors } from "@/lib/schemas";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: FieldErrors,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, errors?: FieldErrors) => new HttpError(400, message, errors);
export const unauthorized = (message = "You need to sign in") => new HttpError(401, message);
export const forbidden = (message = "You don't have permission to do that") => new HttpError(403, message);
export const notFound = (entity: string) => new HttpError(404, `${entity} not found`);
export const conflict = (message: string) => new HttpError(409, message);
export const invalid = (errors: FieldErrors, message = "Please fix the highlighted fields") =>
  new HttpError(422, message, errors);
