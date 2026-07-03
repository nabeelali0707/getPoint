import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import * as notificationsService from "../services/notifications.service.js";

export async function listNotifications(req: AuthenticatedRequest, res: Response) {
  const notifications = await notificationsService.listNotifications(req.user!.id);
  res.json({ notifications });
}

export async function markAllRead(req: AuthenticatedRequest, res: Response) {
  const result = await notificationsService.markAllRead(req.user!.id);
  res.json(result);
}

export async function markRead(req: AuthenticatedRequest, res: Response) {
  const result = await notificationsService.markRead(req.user!.id, req.params.id);
  res.json(result);
}
