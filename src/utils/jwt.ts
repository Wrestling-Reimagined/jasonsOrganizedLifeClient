import jwt from "jsonwebtoken";
import { env } from "../config/env";

type JwtPayload = {
  userId: number;
};

export const signAuthToken = (userId: number): string => {
  return jwt.sign({ userId }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });
};

export const verifyAuthToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
};
