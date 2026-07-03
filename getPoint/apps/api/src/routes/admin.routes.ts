import { Router } from "express";
import * as adminController from "../controllers/admin.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/rbac.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const adminRouter = Router();

adminRouter.use(authenticate, authorize("admin"));

adminRouter.get("/stats", asyncHandler(adminController.getDashboardStats));
adminRouter.get("/drivers/pending", asyncHandler(adminController.listPendingDrivers));
adminRouter.post("/drivers/:userId/approve", asyncHandler(adminController.approveDriver));
adminRouter.post("/drivers/:userId/reject", asyncHandler(adminController.rejectDriver));
