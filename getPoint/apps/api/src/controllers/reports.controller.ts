import { z } from "zod";
import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import * as reportsService from "../services/reports.service.js";

const createReportSchema = z.object({
  pointId: z.string().uuid(),
  message: z.string().min(5),
});

export async function listMyReports(req: AuthenticatedRequest, res: Response) {
  const reports = await reportsService.listStudentReports(req.user!.id);
  res.json({ reports });
}

export async function createReport(req: AuthenticatedRequest, res: Response) {
  const { pointId, message } = createReportSchema.parse(req.body);
  const report = await reportsService.createReport(req.user!.id, pointId, message);
  res.status(201).json({ report });
}

export async function listAdminReports(_req: AuthenticatedRequest, res: Response) {
  const reports = await reportsService.listAdminReports();
  res.json({ reports });
}

export async function resolveReport(req: AuthenticatedRequest, res: Response) {
  const report = await reportsService.resolveReport(req.params.id);
  res.json({ report });
}
