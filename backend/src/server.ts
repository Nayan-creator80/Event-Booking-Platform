import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { config } from "./config";
import { errorHandler } from "./middlewares/errorHandler";
import { logger } from "./utils/logger";
import { setupSwagger } from "./utils/swagger";
import authRoutes from "./routes/authRoutes";
import eventRoutes from "./routes/eventRoutes";
import bookingRoutes from "./routes/bookingRoutes";
import adminRoutes from "./routes/adminRoutes";

export const app = express();

// Security Headers
app.use(helmet());

// CORS Setup
const allowedOrigins = [config.clientOrigin, "http://localhost:3000", "http://localhost:5173"];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
        return callback(null, true);
      }
      return callback(null, false); // Let CORS middleware fail it safely
    },
    credentials: true,
  })
);

// Body and Cookie Parsers
app.use(express.json());
app.use(cookieParser());

// Simple HTTP request logger middleware
app.use((req, res, next) => {
  logger.http(`${req.method} ${req.originalUrl}`);
  next();
});

// Rate limiting for Auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: {
    status: "fail",
    error: {
      message: "Too many authentication requests from this IP. Please try again in 15 minutes.",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Swagger UI Setup
setupSwagger(app);

// Routes
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: config.nodeEnv,
  });
});

app.use("/api/v1/auth", authLimiter, authRoutes);
app.use("/api/v1/events", eventRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/admin", adminRoutes);

// Error Handling (Must be last)
app.use(errorHandler);

// Only listen if not imported in tests or Vercel
if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  const PORT = config.port;
  app.listen(PORT, () => {
    logger.info(`Server is running in ${config.nodeEnv} mode on port ${PORT}`);
    logger.info(`Swagger API docs available at http://localhost:${PORT}/api-docs`);
  });
}
