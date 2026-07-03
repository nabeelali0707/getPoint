import { prisma } from "../db/prisma.js";
import { HttpError } from "../utils/http-error.js";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export async function listPendingDrivers() {
  const drivers = await prisma.driverProfile.findMany({
    where: { approvalStatus: "pending" },
    include: { user: true },
    orderBy: { user: { createdAt: "desc" } },
  });

  return drivers.map((driver) => ({
    id: driver.userId,
    name: driver.fullName,
    license: driver.licenseNo,
    email: driver.user.email,
    phone: driver.phone,
    vehicleNo: driver.vehicleNo,
    avatarInitials: initials(driver.fullName),
  }));
}

export async function approveDriver(userId: string) {
  const driver = await prisma.driverProfile.findUnique({ where: { userId } });
  if (!driver || driver.approvalStatus !== "pending") {
    throw new HttpError(404, "Pending driver not found.");
  }

  await prisma.driverProfile.update({
    where: { userId },
    data: { approvalStatus: "approved", rejectionReason: null },
  });

  await prisma.notification.create({
    data: {
      userId,
      type: "update",
      message: "Your driver registration has been approved. You can now log in and start trips.",
    },
  });

  return { message: "Driver approved." };
}

export async function rejectDriver(userId: string, reason?: string) {
  const driver = await prisma.driverProfile.findUnique({ where: { userId } });
  if (!driver || driver.approvalStatus !== "pending") {
    throw new HttpError(404, "Pending driver not found.");
  }

  const rejectionReason = reason?.trim() || "Application rejected by admin.";

  await prisma.driverProfile.update({
    where: { userId },
    data: { approvalStatus: "rejected", rejectionReason },
  });

  await prisma.notification.create({
    data: {
      userId,
      type: "alert",
      message: `Your driver registration was rejected: ${rejectionReason}`,
    },
  });

  return { message: "Driver rejected." };
}

export async function getDashboardStats() {
  const [pointCount, activeDrivers, openReports, pendingApprovals] = await Promise.all([
    prisma.point.count(),
    prisma.trip.findMany({
      where: { status: { in: ["started", "paused"] } },
      distinct: ["driverId"],
      select: { driverId: true },
    }).then((trips) => trips.length),
    prisma.report.count({ where: { status: "open" } }),
    prisma.driverProfile.count({ where: { approvalStatus: "pending" } }),
  ]);

  return { pointCount, activeDrivers, openReports, pendingApprovals };
}
