import type { NextFunction, Response } from "express";
import type { UserRole } from "@point/shared-types";
import type { AuthenticatedRequest } from "./auth.middleware.js";
import { HttpError } from "../utils/http-error.js";

export function authorize(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new HttpError(401, "Authentication required."));
    }

    if (!roles.includes(req.user.role)) {
      return next(new HttpError(403, "You do not have permission to access this resource."));
    }

    return next();
  };
}
