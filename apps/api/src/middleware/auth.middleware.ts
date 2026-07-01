import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@point/shared-types";
import { prisma } from "../db/prisma.js";
import { verifyAccessToken } from "../services/token.service.js";
import { HttpError } from "../utils/http-error.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
    email: string;
  };
}

export async function authenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  try {
    const header = req.header("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

    if (!token) {
      throw new HttpError(401, "Missing bearer token.");
    }

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { driverProfile: true }
    });

    if (!user || user.status !== "active") {
      throw new HttpError(401, "Token user is no longer active.");
    }

    if (user.role === "driver" && user.driverProfile?.approvalStatus !== "approved") {
      throw new HttpError(403, "Driver account is not approved.");
    }

    req.user = {
      id: user.id,
      role: user.role,
      email: user.email
    };

    next();
  } catch (error) {
    next(error instanceof HttpError ? error : new HttpError(401, "Invalid or expired token."));
  }
}
