import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, "../../.env") });

const getDatabaseUrl = () => {
  if (process.env.VERCEL) {
    const tmpDbPath = "/tmp/dev.db";
    // Copy the dev.db file to /tmp on startup if not already copied
    if (!fs.existsSync(tmpDbPath)) {
      let srcDbPath = "/var/task/prisma/dev.db";
      if (fs.existsSync("/var/task/backend/prisma/dev.db")) {
        srcDbPath = "/var/task/backend/prisma/dev.db";
      } else if (fs.existsSync(path.join(__dirname, "../../prisma/dev.db"))) {
        srcDbPath = path.join(__dirname, "../../prisma/dev.db");
      }

      try {
        if (fs.existsSync(srcDbPath)) {
          fs.copyFileSync(srcDbPath, tmpDbPath);
          fs.chmodSync(tmpDbPath, 0o666); // Ensure read/write permissions
        } else {
          console.warn("Source database not found at " + srcDbPath);
        }
      } catch (err) {
        console.error("Failed to copy SQLite database to /tmp:", err);
      }
    }
    return `file:${tmpDbPath}`;
  }
  return process.env.DATABASE_URL || "file:./dev.db";
};

export const config = {
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: getDatabaseUrl(),
  jwtSecret: process.env.JWT_SECRET || "default-access-token-secret-change-in-production",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "default-refresh-token-secret-change-in-production",
  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || "15m",
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || "7d",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || "mock",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || "mock_secret",
};
