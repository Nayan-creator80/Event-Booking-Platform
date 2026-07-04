import { Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { AppError } from "../utils/appError";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { Role } from "../utils/enums";
import Razorpay from "razorpay";
import crypto from "crypto";
import { config } from "../config";

export const createBooking = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return next(new AppError("User not found in request context", 401));
    }

    const { eventId, seats } = req.body;

    const booking = await prisma.$transaction(async (tx) => {
      // Find event
      const event = await tx.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        throw new AppError("Event not found", 404);
      }

      // Check if event is in the past
      if (new Date(event.date) < new Date()) {
        throw new AppError("Cannot book tickets for past events", 400);
      }

      // Check capacity
      if (event.ticketsSold + seats > event.capacity) {
        throw new AppError(`Not enough seats available. Remaining seats: ${event.capacity - event.ticketsSold}`, 400);
      }

      // Create booking
      const newBooking = await tx.booking.create({
        data: {
          userId,
          eventId,
          seats,
        },
        include: {
          event: true,
        },
      });

      // Update event ticketsSold
      await tx.event.update({
        where: { id: eventId },
        data: {
          ticketsSold: {
            increment: seats,
          },
        },
      });

      return newBooking;
    });

    res.status(201).json({
      status: "success",
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
};

export const getBookings = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    if (!userId) {
      return next(new AppError("User not found in request context", 401));
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Filter by user if not admin
    const where: any = {};
    if (role !== Role.ADMIN) {
      where.userId = userId;
    } else {
      // Admin can query specific user's bookings
      const queryUserId = req.query.userId as string;
      if (queryUserId) {
        where.userId = queryUserId;
      }
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          event: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    res.status(200).json({
      status: "success",
      results: bookings.length,
      data: {
        bookings,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const cancelBooking = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    const { id } = req.params;

    if (!userId) {
      return next(new AppError("User not found in request context", 401));
    }

    const booking = await prisma.$transaction(async (tx) => {
      // Find booking
      const existingBooking = await tx.booking.findUnique({
        where: { id },
        include: { event: true },
      });

      if (!existingBooking) {
        throw new AppError("Booking not found", 404);
      }

      // Check authorization (only owner of booking or admin can cancel)
      if (existingBooking.userId !== userId && role !== Role.ADMIN) {
        throw new AppError("You are not authorized to cancel this booking", 403);
      }

      if (existingBooking.status === "CANCELLED") {
        throw new AppError("Booking is already cancelled", 400);
      }

      // Update booking status
      const updatedBooking = await tx.booking.update({
        where: { id },
        data: { status: "CANCELLED" },
      });

      // Decrement event tickets sold
      await tx.event.update({
        where: { id: existingBooking.eventId },
        data: {
          ticketsSold: {
            decrement: existingBooking.seats,
          },
        },
      });

      return updatedBooking;
    });

    res.status(200).json({
      status: "success",
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
};

export const createRazorpayOrder = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return next(new AppError("User not found in request context", 401));
    }

    const { eventId, seats } = req.body;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return next(new AppError("Event not found", 404));
    }

    if (new Date(event.date) < new Date()) {
      return next(new AppError("Cannot book tickets for past events", 400));
    }

    if (event.ticketsSold + seats > event.capacity) {
      return next(new AppError(`Not enough seats available. Remaining seats: ${event.capacity - event.ticketsSold}`, 400));
    }

    const totalAmount = event.price * seats;

    if (totalAmount === 0) {
      return res.status(200).json({
        status: "success",
        data: {
          isFree: true,
          amount: 0,
        },
      });
    }

    const isMock = config.razorpayKeyId === "mock" || !config.razorpayKeyId;

    if (isMock) {
      const mockOrderId = `order_mock_${crypto.randomUUID().replace(/-/g, "")}`;
      return res.status(200).json({
        status: "success",
        data: {
          isFree: false,
          keyId: "mock",
          orderId: mockOrderId,
          amount: totalAmount * 100,
          currency: "INR",
          eventTitle: event.title,
        },
      });
    }

    const razorpay = new Razorpay({
      key_id: config.razorpayKeyId,
      key_secret: config.razorpayKeySecret,
    });

    const order = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100),
      currency: "INR",
      receipt: `receipt_booking_${crypto.randomUUID().slice(0, 10)}`,
    });

    res.status(200).json({
      status: "success",
      data: {
        isFree: false,
        keyId: config.razorpayKeyId,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        eventTitle: event.title,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyRazorpayPayment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return next(new AppError("User not found in request context", 401));
    }

    const {
      eventId,
      seats,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    if (!eventId || !seats || !razorpayOrderId || !razorpayPaymentId) {
      return next(new AppError("Missing required transaction details", 400));
    }

    const isMock = config.razorpayKeyId === "mock" || !config.razorpayKeyId || razorpayOrderId.startsWith("order_mock_");

    if (!isMock) {
      if (!razorpaySignature) {
        return next(new AppError("Missing signature for transaction verification", 400));
      }

      const body = razorpayOrderId + "|" + razorpayPaymentId;
      const expectedSignature = crypto
        .createHmac("sha256", config.razorpayKeySecret)
        .update(body.toString())
        .digest("hex");

      if (expectedSignature !== razorpaySignature) {
        return next(new AppError("Payment verification failed. Invalid signature.", 400));
      }
    }

    const booking = await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        throw new AppError("Event not found", 404);
      }

      if (event.ticketsSold + seats > event.capacity) {
        throw new AppError(`Not enough seats available. Remaining seats: ${event.capacity - event.ticketsSold}`, 400);
      }

      const newBooking = await tx.booking.create({
        data: {
          userId,
          eventId,
          seats,
          razorpayOrderId,
          razorpayPaymentId,
        },
        include: {
          event: true,
        },
      });

      await tx.event.update({
        where: { id: eventId },
        data: {
          ticketsSold: {
            increment: seats,
          },
        },
      });

      return newBooking;
    });

    res.status(201).json({
      status: "success",
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
};
