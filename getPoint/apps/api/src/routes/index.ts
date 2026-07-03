import { Router } from "express";
import { adminRouter } from "./admin.routes.js";
import { authRouter } from "./auth.routes.js";
import { notificationsRouter } from "./notifications.routes.js";
import { pointsRouter } from "./points.routes.js";
import { reportsRouter } from "./reports.routes.js";
import { tripsRouter } from "./trips.routes.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/points", pointsRouter);
apiRouter.use("/reports", reportsRouter);
apiRouter.use("/notifications", notificationsRouter);
apiRouter.use("/trips", tripsRouter);
apiRouter.use("/admin", adminRouter);
