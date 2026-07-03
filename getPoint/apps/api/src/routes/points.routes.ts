import { Router } from "express";
import * as pointsController from "../controllers/points.controller.js";
import { authenticate, optionalAuthenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/rbac.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const pointsRouter = Router();

pointsRouter.use(optionalAuthenticate);
pointsRouter.get("/", asyncHandler(pointsController.listPoints));
pointsRouter.get("/:id", asyncHandler(pointsController.getPoint));

pointsRouter.post(
  "/:id/favorite",
  authenticate,
  authorize("student"),
  asyncHandler(pointsController.toggleFavorite),
);
