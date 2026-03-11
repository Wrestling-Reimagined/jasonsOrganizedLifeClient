import dotenv from "dotenv";

dotenv.config();

const must = (value: string | undefined, name: string, fallback: string): string => {
  if (value) {
    return value;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  mysqlUrl: process.env.RAILWAY_SERVICE_MYSQL_URL ?? process.env.MYSQL_URL,
  mysqlHost: must(process.env.MYSQL_HOST, "MYSQL_HOST", "localhost"),
  mysqlPort: Number(process.env.MYSQL_PORT ?? 3306),
  mysqlUser: must(process.env.MYSQL_USER, "MYSQL_USER", "root"),
  mysqlPassword: must(process.env.MYSQL_PASSWORD, "MYSQL_PASSWORD", "password"),
  mysqlDatabase: must(process.env.MYSQL_DATABASE, "MYSQL_DATABASE", "personal_life_manager"),
  jwtSecret: must(process.env.JWT_SECRET, "JWT_SECRET", "dev-only-secret"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  resetTokenTtlMinutes: Number(process.env.RESET_TOKEN_TTL_MINUTES ?? 30),
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
};
