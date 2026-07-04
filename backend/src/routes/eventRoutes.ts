import { Router } from "express";
import { getEvents, getEventById, createEvent, updateEvent, deleteEvent } from "../controllers/eventController";
import { authenticate, authorize } from "../middlewares/authMiddleware";
import { validateRequest } from "../middlewares/validateRequest";
import { createEventSchema, updateEventSchema } from "./event.schemas";
import { Role } from "../utils/enums";

const router = Router();

router.get("/", getEvents);
router.get("/:id", getEventById);

router.post("/", authenticate, authorize(Role.ADMIN), validateRequest(createEventSchema), createEvent);
router.put("/:id", authenticate, authorize(Role.ADMIN), validateRequest(updateEventSchema), updateEvent);
router.delete("/:id", authenticate, authorize(Role.ADMIN), deleteEvent);

export default router;
