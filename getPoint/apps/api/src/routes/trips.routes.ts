import { Router } from "express";
import * as tripsController from "../controllers/trips.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/rbac.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const tripsRouter = Router();

tripsRouter.use(authenticate, authorize("driver"));

tripsRouter.get("/current", asyncHandler(tripsController.getCurrentTrip));
tripsRouter.post("/start", asyncHandler(tripsController.startTrip));
tripsRouter.post("/:id/end", asyncHandler(tripsController.endTrip));
tripsRouter.post("/:id/ping", asyncHandler(tripsController.recordPing));
