import { Router } from "express";
import fs from "node:fs";
import multer from "multer";
import * as routesController from "../controllers/routes.controller.js";
import { optionalAuthenticate } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

const uploadDir = "./uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: uploadDir });

export const routesRouter = Router();

routesRouter.use(optionalAuthenticate);

// Student/General routes
routesRouter.get("/", asyncHandler(routesController.listRoutes));
routesRouter.get("/:id", asyncHandler(routesController.getRoute));

// Admin routes
routesRouter.post("/upload", upload.single("file"), asyncHandler(routesController.uploadRoute));
routesRouter.put("/:id", asyncHandler(routesController.updateRoute));
routesRouter.delete("/:id", asyncHandler(routesController.deleteRoute));
