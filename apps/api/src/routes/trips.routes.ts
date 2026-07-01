import { Router } from "express";
import * as tripsController from "../controllers/trips.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/rbac.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const tripsRouter = Router();

tripsRouter.post("/start", authenticate, authorize("driver"), asyncHandler(tripsController.startTrip));
tripsRouter.post("/:id/end", authenticate, authorize("driver"), asyncHandler(tripsController.endTrip));
