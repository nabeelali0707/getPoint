import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import * as routesService from "../services/routes.service.js";
import { HttpError } from "../utils/http-error.js";

export async function listRoutes(req: AuthenticatedRequest, res: Response) {
  const routes = await routesService.listRoutes();
  res.json({ routes });
}

export async function getRoute(req: AuthenticatedRequest, res: Response) {
  const route = await routesService.getRouteById(req.params.id);
  res.json({ route });
}

export async function uploadRoute(req: AuthenticatedRequest, res: Response) {
  if (!req.file) {
    throw new HttpError(400, "No file uploaded.");
  }
  const result = await routesService.processRouteUpload(req.file.path);
  res.json({ success: true, result });
}

export async function updateRoute(req: AuthenticatedRequest, res: Response) {
  const route = await routesService.updateRoute(req.params.id, req.body);
  res.json({ success: true, route });
}

export async function deleteRoute(req: AuthenticatedRequest, res: Response) {
  await routesService.deleteRoute(req.params.id);
  res.json({ success: true });
}
