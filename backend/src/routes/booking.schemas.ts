import { z } from "zod";

export const createBookingSchema = z.object({
  body: z.object({
    eventId: z.string().uuid("Invalid event ID"),
    seats: z.number().int().min(1, "Must book at least 1 seat").default(1),
  }),
});
