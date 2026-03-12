import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { requireAuth } from "../middleware/auth";
import { requirePermissions } from "../middleware/rbac";

const router = Router();

const paymentSchema = z.object({
  amount: z.number().positive(),
  paidAt: z.string().datetime(),
  category: z.string().min(1).max(128),
  notes: z.string().optional(),
});

router.use(requireAuth);

/** Convert ISO 8601 datetime to MySQL format (YYYY-MM-DD HH:MM:SS). MySQL rejects ISO format in strict mode. */
function toMysqlDatetime(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().slice(0, 19).replace("T", " ");
}

router.post("/", requirePermissions(["payments:create"]), async (req, res, next) => {
  try {
    const payload = paymentSchema.parse(req.body);
    const mysqlDatetime = toMysqlDatetime(payload.paidAt);
    const mysqlDate = mysqlDatetime.slice(0, 10);
    const [result] = await pool.query(
      `
      INSERT INTO payments (created_by_user_id, amount, paid_on, paid_at, category, notes)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        req.authUser!.id,
        payload.amount,
        mysqlDate,
        mysqlDatetime,
        payload.category,
        payload.notes ?? null,
      ],
    );
    return res.status(201).json({ id: (result as { insertId: number }).insertId });
  } catch (error) {
    return next(error);
  }
});

router.get("/", requirePermissions(["payments:read"]), async (_req, res, next) => {
  try {
    const [rows] = (await pool.query(
      `
      SELECT id, amount, paid_at, category, notes
      FROM payments
      ORDER BY paid_at DESC, id DESC
      `,
    )) as unknown as [
      {
        id: number;
        amount: string;
        paid_at: string;
        category: string;
        notes: string | null;
      }[],
      unknown,
    ];
    return res.json(
      rows.map((row) => ({
        id: row.id,
        amount: Number(row.amount),
        paidAt: row.paid_at,
        category: row.category,
        notes: row.notes,
      })),
    );
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", requirePermissions(["payments:delete"]), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await pool.query("DELETE FROM payments WHERE id = ?", [id]);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
