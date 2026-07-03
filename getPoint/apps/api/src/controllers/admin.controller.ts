import { z } from "zod";
import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import * as adminService from "../services/admin.service.js";

const rejectDriverSchema = z.object({
  reason: z.string().min(3).optional(),
});

export async function listPendingDrivers(_req: AuthenticatedRequest, res: Response) {
  const drivers = await adminService.listPendingDrivers();
  res.json({ drivers });
}

export async function approveDriver(req: AuthenticatedRequest, res: Response) {
  const result = await adminService.approveDriver(req.params.userId);
  res.json(result);
}

export async function rejectDriver(req: AuthenticatedRequest, res: Response) {
  const { reason } = rejectDriverSchema.parse(req.body ?? {});
  const result = await adminService.rejectDriver(req.params.userId, reason);
  res.json(result);
}

export async function getDashboardStats(_req: AuthenticatedRequest, res: Response) {
  const stats = await adminService.getDashboardStats();
  res.json({ stats });
}
