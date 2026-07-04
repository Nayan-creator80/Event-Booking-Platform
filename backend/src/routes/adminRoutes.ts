import { Router } from "express";
import { getAdminStats } from "../controllers/adminController";
import { authenticate, authorize } from "../middlewares/authMiddleware";
import { Role } from "../utils/enums";

const router = Router();

router.get("/stats", authenticate, authorize(Role.ADMIN), getAdminStats);

export default router;
