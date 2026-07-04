import jwt from "jsonwebtoken";
import { config } from "../config";
import { Role } from "./enums";

export const generateAccessToken = (user: { id: string; email: string; role: string }) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtAccessExpiry as any }
  );
};

export const generateRefreshToken = (user: { id: string; email: string; role: string }) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwtRefreshSecret,
    { expiresIn: config.jwtRefreshExpiry as any }
  );
};
