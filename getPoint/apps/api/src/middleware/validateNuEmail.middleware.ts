import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/http-error.js";
import { assertNuEmail } from "../utils/nu-email.js";

export function validateNuEmail(req: Request, _res: Response, next: NextFunction) {
  try {
    assertNuEmail(String(req.body.email ?? "").toLowerCase());
    next();
  } catch (error) {
    next(new HttpError(400, error instanceof Error ? error.message : "Invalid NU email."));
  }
}
