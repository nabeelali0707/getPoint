import { Router } from "express";
import * as notificationsController from "../controllers/notifications.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

notificationsRouter.get("/", asyncHandler(notificationsController.listNotifications));
notificationsRouter.patch("/read-all", asyncHandler(notificationsController.markAllRead));
notificationsRouter.patch("/:id/read", asyncHandler(notificationsController.markRead));
