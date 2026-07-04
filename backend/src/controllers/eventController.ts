import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { AppError } from "../utils/appError";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";

export const getEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search as string;
    const location = req.query.location as string;
    const isFree = req.query.isFree === "true";

    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (location) {
      where.location = { contains: location };
    }

    if (isFree) {
      where.price = 0.0;
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: "asc" },
      }),
      prisma.event.count({ where }),
    ]);

    res.status(200).json({
      status: "success",
      results: events.length,
      data: {
        events,
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

export const getEventById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!event) {
      return next(new AppError("Event not found", 404));
    }

    res.status(200).json({
      status: "success",
      data: { event },
    });
  } catch (error) {
    next(error);
  }
};

export const createEvent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const creatorId = req.user?.id;
    if (!creatorId) {
      return next(new AppError("User not found in request context", 401));
    }

    const { title, description, date, location, price, capacity, imageUrl } = req.body;

    const event = await prisma.event.create({
      data: {
        title,
        description,
        date: new Date(date),
        location,
        price,
        capacity,
        imageUrl,
        creatorId,
      },
    });

    res.status(201).json({
      status: "success",
      data: { event },
    });
  } catch (error) {
    next(error);
  }
};

export const updateEvent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, description, date, location, price, capacity, imageUrl } = req.body;

    // Verify event exists
    const existingEvent = await prisma.event.findUnique({ where: { id } });
    if (!existingEvent) {
      return next(new AppError("Event not found", 404));
    }

    // If changing capacity, ensure it's not less than tickets already sold
    if (capacity !== undefined && capacity < existingEvent.ticketsSold) {
      return next(new AppError(`Capacity cannot be reduced below the number of tickets already sold (${existingEvent.ticketsSold})`, 400));
    }

    const event = await prisma.event.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(location !== undefined && { location }),
        ...(price !== undefined && { price }),
        ...(capacity !== undefined && { capacity }),
        ...(imageUrl !== undefined && { imageUrl }),
      },
    });

    res.status(200).json({
      status: "success",
      data: { event },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteEvent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existingEvent = await prisma.event.findUnique({ where: { id } });
    if (!existingEvent) {
      return next(new AppError("Event not found", 404));
    }

    await prisma.event.delete({ where: { id } });

    res.status(200).json({
      status: "success",
      message: "Event deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
