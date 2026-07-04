import { Router } from "express";
import { register, login, refresh, logout } from "../controllers/authController";
import { validateRequest } from "../middlewares/validateRequest";
import { registerSchema, loginSchema } from "./auth.schemas";

const router = Router();

router.post("/register", validateRequest(registerSchema), register);
router.post("/login", validateRequest(loginSchema), login);
router.post("/refresh", refresh);
router.post("/logout", logout);

export default router;
