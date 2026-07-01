import type { Response } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import * as tripService from "../services/trip.service.js";
import { HttpError } from "../utils/http-error.js";

const startTripSchema = z.object({
  pointId: z.string().uuid().optional()
});

const tripIdParamsSchema = z.object({
  id: z.string().uuid()
});

function requireUser(req: AuthenticatedRequest) {
  if (!req.user) {
    throw new HttpError(401, "Authentication required.");
  }

  return req.user;
}

export async function startTrip(req: AuthenticatedRequest, res: Response) {
  const user = requireUser(req);
  const body = startTripSchema.parse(req.body);
  const trip = await tripService.startTrip(user.id, body.pointId);
  res.status(201).json({ trip });
}

export async function endTrip(req: AuthenticatedRequest, res: Response) {
  const user = requireUser(req);
  const { id } = tripIdParamsSchema.parse(req.params);
  const trip = await tripService.endTrip(user.id, id);
  res.json({ trip });
}
