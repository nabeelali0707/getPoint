import { z } from "zod";
import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import * as pointsService from "../services/points.service.js";

export async function listPoints(req: AuthenticatedRequest, res: Response) {
  const points = await pointsService.listPoints(req.user?.id);
  res.json({ points });
}

export async function getPoint(req: AuthenticatedRequest, res: Response) {
  const point = await pointsService.getPointById(req.params.id, req.user?.id);
  res.json({ point });
}

export async function toggleFavorite(req: AuthenticatedRequest, res: Response) {
  const result = await pointsService.toggleFavorite(req.user!.id, req.params.id);
  res.json(result);
}
