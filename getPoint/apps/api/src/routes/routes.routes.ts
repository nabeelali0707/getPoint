import { Router } from "express";
import * as routesController from "../controllers/routes.controller.js";
import { optionalAuthenticate } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const routesRouter = Router();

routesRouter.use(optionalAuthenticate);
routesRouter.get("/", asyncHandler(routesController.listRoutes));
routesRouter.get("/:id", asyncHandler(routesController.getRoute));
