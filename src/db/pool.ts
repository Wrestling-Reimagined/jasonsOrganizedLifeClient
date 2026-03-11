import mysql from "mysql2/promise";
import { env } from "../config/env";

const basePoolConfig = {
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
  multipleStatements: true,
};

const connectionConfig = (() => {
  if (env.mysqlUrl && env.mysqlUrl.includes("://")) {
    const url = new URL(env.mysqlUrl);
    return {
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, "") || env.mysqlDatabase,
    };
  }

  return {
    host: env.mysqlHost,
    port: env.mysqlPort,
    user: env.mysqlUser,
    password: env.mysqlPassword,
    database: env.mysqlDatabase,
  };
})();

export const pool = mysql.createPool({
  ...connectionConfig,
  ...basePoolConfig,
});
