import { Router } from "express";
import * as reportsController from "../controllers/reports.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/rbac.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const reportsRouter = Router();

reportsRouter.use(authenticate);

reportsRouter.get("/", authorize("student"), asyncHandler(reportsController.listMyReports));
reportsRouter.post("/", authorize("student", "driver"), asyncHandler(reportsController.createReport));

reportsRouter.get("/admin", authorize("admin"), asyncHandler(reportsController.listAdminReports));
reportsRouter.patch("/:id/resolve", authorize("admin"), asyncHandler(reportsController.resolveReport));
