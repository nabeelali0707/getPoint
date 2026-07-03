import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import * as routesService from "../services/routes.service.js";

export async function listRoutes(req: AuthenticatedRequest, res: Response) {
  const routes = await routesService.listRoutes();
  res.json({ routes });
}

export async function getRoute(req: AuthenticatedRequest, res: Response) {
  const route = await routesService.getRouteById(req.params.id);
  res.json({ route });
}
