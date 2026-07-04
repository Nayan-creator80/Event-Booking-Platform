import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../../src/server";
import { prisma } from "../../src/config/db";
import { config } from "../../src/config";
import { Role } from "../../src/utils/enums";

// Mock the Prisma client
jest.mock("../../src/config/db", () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    event: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
    },
    booking: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  return { prisma: mockPrisma };
});

const mockAdminToken = jwt.sign(
  { id: "admin-123", email: "admin@example.com", role: Role.ADMIN },
  config.jwtSecret
);
const mockUserToken = jwt.sign(
  { id: "user-123", email: "user@example.com", role: Role.USER },
  config.jwtSecret
);

describe("API Integration Tests", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /health", () => {
    it("should return 200 and healthy status", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
    });
  });

  describe("Authentication API", () => {
    it("POST /api/v1/auth/register - should register a new user", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: "user-123",
        name: "Jane Doe",
        email: "jane@example.com",
        role: Role.USER,
      });

      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          name: "Jane Doe",
          email: "jane@example.com",
          password: "Password123!",
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("success");
      expect(res.body.data.user.email).toBe("jane@example.com");
      expect(res.body.data).toHaveProperty("accessToken");
    });

    it("POST /api/v1/auth/login - should fail with invalid credentials", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "nonexistent@example.com",
          password: "Password123!",
        });

      expect(res.status).toBe(401);
      expect(res.body.status).toBe("error");
    });
  });

  describe("Events API", () => {
    it("GET /api/v1/events - should list events", async () => {
      const mockEvents = [
        {
          id: "event-1",
          title: "Tech Summit",
          description: "A great tech summit",
          date: new Date(),
          location: "San Francisco",
          price: 50.0,
          capacity: 100,
          ticketsSold: 10,
        },
      ];
      (prisma.event.findMany as jest.Mock).mockResolvedValue(mockEvents);
      (prisma.event.count as jest.Mock).mockResolvedValue(1);

      const res = await request(app).get("/api/v1/events");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data.events).toHaveLength(1);
    });

    it("POST /api/v1/events - should block non-admin users", async () => {
      const res = await request(app)
        .post("/api/v1/events")
        .set("Authorization", `Bearer ${mockUserToken}`)
        .send({
          title: "New Workshop",
          description: "TypeScript masterclass for juniors",
          date: new Date(Date.now() + 86400000).toISOString(),
          location: "Online",
          price: 0,
          capacity: 30,
        });

      expect(res.status).toBe(403);
    });

    it("POST /api/v1/events - should allow admins to create events", async () => {
      const mockEvent = {
        id: "event-2",
        title: "Admin Meetup",
        description: "An exclusive admin gathering",
        date: new Date(Date.now() + 86400000),
        location: "New York",
        price: 0,
        capacity: 10,
        creatorId: "admin-123",
      };
      (prisma.event.create as jest.Mock).mockResolvedValue(mockEvent);

      const res = await request(app)
        .post("/api/v1/events")
        .set("Authorization", `Bearer ${mockAdminToken}`)
        .send({
          title: "Admin Meetup",
          description: "An exclusive admin gathering",
          date: new Date(Date.now() + 86400000).toISOString(),
          location: "New York",
          price: 0,
          capacity: 10,
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("success");
      expect(res.body.data.event.title).toBe("Admin Meetup");
    });
  });

  describe("Bookings API", () => {
    it("POST /api/v1/bookings - should complete booking inside a transaction", async () => {
      const mockEvent = {
        id: "event-1",
        title: "Tech Summit",
        date: new Date(Date.now() + 86400000),
        capacity: 100,
        ticketsSold: 10,
        price: 50.0,
      };
      const mockBooking = {
        id: "booking-123",
        userId: "user-123",
        eventId: "event-1",
        seats: 2,
        event: mockEvent,
      };

      // Mock $transaction to run the callback passing a mock transaction context
      const mockTx = {
        event: {
          findUnique: jest.fn().mockResolvedValue(mockEvent),
          update: jest.fn().mockResolvedValue(mockEvent),
        },
        booking: {
          create: jest.fn().mockResolvedValue(mockBooking),
        },
      };
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
        return cb(mockTx);
      });

      const res = await request(app)
        .post("/api/v1/bookings")
        .set("Authorization", `Bearer ${mockUserToken}`)
        .send({
          eventId: "70db2bdf-32e6-42eb-8de2-8e1cb19cc5b1", // Random UUID
          seats: 2,
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("success");
      expect(res.body.data.booking.seats).toBe(2);
    });

    it("POST /api/v1/bookings - should fail if seats are not available", async () => {
      const mockEvent = {
        id: "event-1",
        title: "Tech Summit",
        date: new Date(Date.now() + 86400000),
        capacity: 10,
        ticketsSold: 9,
        price: 50.0,
      };

      const mockTx = {
        event: {
          findUnique: jest.fn().mockResolvedValue(mockEvent),
        },
      };
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
        return cb(mockTx);
      });

      const res = await request(app)
        .post("/api/v1/bookings")
        .set("Authorization", `Bearer ${mockUserToken}`)
        .send({
          eventId: "70db2bdf-32e6-42eb-8de2-8e1cb19cc5b1",
          seats: 2, // Requesting 2 seats but only 1 remains
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain("Not enough seats available");
    });
  });
});
