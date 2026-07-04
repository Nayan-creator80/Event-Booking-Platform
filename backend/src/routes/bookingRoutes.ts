import { Router } from "express";
import { createBooking, getBookings, cancelBooking, createRazorpayOrder, verifyRazorpayPayment } from "../controllers/bookingController";
import { authenticate } from "../middlewares/authMiddleware";
import { validateRequest } from "../middlewares/validateRequest";
import { createBookingSchema } from "./booking.schemas";

const router = Router();

router.use(authenticate); // Require authentication for all booking routes

router.post("/", validateRequest(createBookingSchema), createBooking);
router.post("/order", validateRequest(createBookingSchema), createRazorpayOrder);
router.post("/verify", verifyRazorpayPayment);
router.get("/", getBookings);
router.put("/:id/cancel", cancelBooking);

export default router;
