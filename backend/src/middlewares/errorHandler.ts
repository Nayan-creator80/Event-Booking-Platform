import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/appError";
import { logger } from "../utils/logger";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let details = err.details || null;

  // Handle Prisma unique constraint violation
  if (err.code === "P2002") {
    statusCode = 400;
    message = "Database unique constraint violation.";
    details = err.meta;
  }

  // Handle Prisma record not found
  if (err.code === "P2025") {
    statusCode = 404;
    message = "Record not found.";
    details = err.meta;
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token. Please log in again.";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token has expired. Please log in again.";
  }

  logger.error(`${req.method} ${req.originalUrl} - Status: ${statusCode} - Message: ${message}`);
  if (err.stack && process.env.NODE_ENV === "development") {
    logger.error(err.stack);
  }

  res.status(statusCode).json({
    status: "error",
    error: {
      message,
      ...(details && { details }),
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
};
