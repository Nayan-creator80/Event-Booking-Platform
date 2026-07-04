import { Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";

export const getAdminStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const [eventsCount, bookingsCount, popularEvents, allConfirmedBookings] = await Promise.all([
      prisma.event.count(),
      prisma.booking.count({ where: { status: "CONFIRMED" } }),
      prisma.event.findMany({
        take: 5,
        orderBy: { ticketsSold: "desc" },
        select: {
          id: true,
          title: true,
          capacity: true,
          ticketsSold: true,
          price: true,
        },
      }),
      prisma.booking.findMany({
        where: { status: "CONFIRMED" },
        include: { event: true },
      }),
    ]);

    // Calculate total revenue from all active bookings
    const totalRevenue = allConfirmedBookings.reduce((sum, b) => {
      return sum + b.seats * (b.event?.price || 0);
    }, 0);

    // Sum of tickets sold across all events
    const ticketsSoldAggregate = await prisma.event.aggregate({
      _sum: {
        ticketsSold: true,
      },
    });
    const absoluteTicketsSold = ticketsSoldAggregate._sum.ticketsSold || 0;

    res.status(200).json({
      status: "success",
      data: {
        stats: {
          totalEvents: eventsCount,
          totalBookings: bookingsCount,
          totalTicketsSold: absoluteTicketsSold,
          totalRevenue,
        },
        popularEvents,
      },
    });
  } catch (error) {
    next(error);
  }
};
