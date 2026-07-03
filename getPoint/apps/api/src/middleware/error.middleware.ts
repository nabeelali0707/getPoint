import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/http-error.js";

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new HttpError(404, `Route not found: ${req.method} ${req.path}`));
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    const flattened = error.flatten();
    const firstFieldError = Object.values(flattened.fieldErrors)
      .flat()
      .find(Boolean);

    const message = firstFieldError ?? "Validation failed.";
    return res.status(400).json({
      error: message,
      message,
      details: flattened
    });
  }

  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({
      error: error.message,
      message: error.message,
      details: error.details
    });
  }

  if (error instanceof Error) {
    return res.status(500).json({ error: error.message, message: error.message });
  }

  return res.status(500).json({ error: "Unexpected server error", message: "Unexpected server error" });
}
