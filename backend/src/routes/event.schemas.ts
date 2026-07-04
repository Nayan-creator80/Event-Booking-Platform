import { z } from "zod";

export const createEventSchema = z.object({
  body: z.object({
    title: z.string().min(3, "Title must be at least 3 characters long"),
    description: z.string().min(10, "Description must be at least 10 characters long"),
    date: z.string().datetime({ message: "Invalid date format, must be ISO-8601" }),
    location: z.string().min(3, "Location must be at least 3 characters long"),
    price: z.number().min(0, "Price cannot be negative").default(0.0),
    capacity: z.number().int().positive("Capacity must be a positive integer"),
    imageUrl: z.string().url("Invalid image URL").optional().nullable(),
  }),
});

export const updateEventSchema = z.object({
  body: z.object({
    title: z.string().min(3).optional(),
    description: z.string().min(10).optional(),
    date: z.string().datetime().optional(),
    location: z.string().min(3).optional(),
    price: z.number().min(0).optional(),
    capacity: z.number().int().positive().optional(),
    imageUrl: z.string().url().optional().nullable(),
  }),
});
