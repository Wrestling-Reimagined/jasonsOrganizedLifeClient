import fs from "node:fs/promises";
import path from "node:path";
import { pool } from "./pool";

const ensureMigrationsTable = async (): Promise<void> => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

const run = async (): Promise<void> => {
  await ensureMigrationsTable();

  const dir = path.resolve(__dirname, "migrations");
  const files = (await fs.readdir(dir)).filter((file) => file.endsWith(".sql")).sort();

  for (const file of files) {
    const [rows] = (await pool.query(
      "SELECT name FROM _migrations WHERE name = ? LIMIT 1",
      [file],
    )) as unknown as [{ name: string }[], unknown];
    if (rows.length > 0) {
      continue;
    }

    const sql = await fs.readFile(path.join(dir, file), "utf8");

    if (file === "005_meal_consumption_rating_nullable.sql") {
      const statements = sql
        .split(/;\s*\n/)
        .map((s) => s.replace(/--.*$/gm, "").trim())
        .filter((s) => s.length > 0);
      for (const statement of statements) {
        try {
          await pool.query(statement + ";");
        } catch (err: unknown) {
          const mysqlErr = err as { errno?: number; code?: string };
          if (mysqlErr.errno === 3821 || mysqlErr.code === "ER_CHECK_CONSTRAINT_NOT_FOUND") {
            // Constraint was never created (e.g. DB bootstrapped without 002's check)
            // eslint-disable-next-line no-console
            console.log("Skipping DROP CHECK (constraint not present)");
            continue;
          }
          throw err;
        }
      }
    } else {
      await pool.query(sql);
    }

    await pool.query("INSERT INTO _migrations (name) VALUES (?)", [file]);
    // eslint-disable-next-line no-console
    console.log(`Applied migration ${file}`);
  }
};

run()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
