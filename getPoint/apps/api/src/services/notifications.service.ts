import { prisma } from "../db/prisma.js";
import { HttpError } from "../utils/http-error.js";

export async function listNotifications(userId: string) {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return notifications.map((n) => ({
    id: n.id,
    type: n.type,
    message: n.message,
    isRead: n.readStatus === "read",
    createdAt: n.createdAt.toISOString(),
  }));
}

export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, readStatus: "unread" },
    data: { readStatus: "read" },
  });

  return { message: "All notifications marked as read." };
}

export async function markRead(userId: string, notificationId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });

  if (!notification) throw new HttpError(404, "Notification not found.");

  await prisma.notification.update({
    where: { id: notificationId },
    data: { readStatus: "read" },
  });

  return { message: "Notification marked as read." };
}
