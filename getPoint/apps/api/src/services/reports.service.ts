import type { ReportStatus } from "@point/shared-types";
import { prisma } from "../db/prisma.js";
import { HttpError } from "../utils/http-error.js";

function serializeReport(report: {
  id: string;
  message: string;
  status: ReportStatus;
  createdAt: Date;
  resolvedAt: Date | null;
  point: { code: string; name: string };
  student?: { email: string };
}) {
  return {
    id: report.id,
    pointCode: report.point.code,
    pointName: report.point.name,
    message: report.message,
    status: report.status,
    createdAt: report.createdAt.toISOString(),
    resolvedAt: report.resolvedAt?.toISOString() ?? null,
    studentEmail: report.student?.email,
  };
}

export async function listStudentReports(userId: string) {
  const reports = await prisma.report.findMany({
    where: { studentId: userId },
    include: { point: true },
    orderBy: { createdAt: "desc" },
  });

  return reports.map((report) => serializeReport(report));
}

export async function createReport(userId: string, pointId: string, message: string) {
  const trimmed = message.trim();
  if (trimmed.length < 5) {
    throw new HttpError(400, "Report message must be at least 5 characters.");
  }

  const point = await prisma.point.findUnique({ where: { id: pointId } });
  if (!point) throw new HttpError(404, "Point not found.");

  const report = await prisma.report.create({
    data: {
      studentId: userId,
      pointId,
      message: trimmed,
    },
    include: { point: true },
  });

  return serializeReport(report);
}

export async function listAdminReports() {
  const reports = await prisma.report.findMany({
    where: { status: "open" },
    include: { point: true, student: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return reports.map((report) => serializeReport(report));
}

export async function resolveReport(reportId: string) {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) throw new HttpError(404, "Report not found.");
  if (report.status === "resolved") {
    throw new HttpError(409, "Report is already resolved.");
  }

  const updated = await prisma.report.update({
    where: { id: reportId },
    data: { status: "resolved", resolvedAt: new Date() },
    include: { point: true, student: true },
  });

  await prisma.notification.create({
    data: {
      userId: updated.studentId,
      type: "update",
      message: `Your report about ${updated.point.name} has been resolved by the admin.`,
    },
  });

  return serializeReport(updated);
}
