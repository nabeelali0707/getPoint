import { z } from "zod";
import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import * as tripsService from "../services/trips.service.js";

const startTripSchema = z.object({
  pointId: z.string().uuid().optional(),
});

const pingSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  speed: z.number().optional(),
});

export async function getCurrentTrip(req: AuthenticatedRequest, res: Response) {
  const result = await tripsService.getCurrentTrip(req.user!.id);
  res.json(result);
}

export async function startTrip(req: AuthenticatedRequest, res: Response) {
  const { pointId } = startTripSchema.parse(req.body ?? {});
  const result = await tripsService.startTrip(req.user!.id, pointId);
  res.status(201).json(result);
}

export async function endTrip(req: AuthenticatedRequest, res: Response) {
  const result = await tripsService.endTrip(req.user!.id, req.params.id);
  res.json(result);
}

export async function recordPing(req: AuthenticatedRequest, res: Response) {
  const input = pingSchema.parse(req.body);
  const result = await tripsService.recordPing(req.user!.id, req.params.id, input);
  res.json(result);
}
