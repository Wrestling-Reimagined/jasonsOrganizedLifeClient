import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { requireAuth } from "../middleware/auth";
import { requirePermissions } from "../middleware/rbac";

const router = Router();

const mealSchema = z.object({
  recipeId: z.number().int().positive().nullable().optional(),
  title: z.string().min(1).max(255),
  madeAt: z.string().datetime(),
  expiresAt: z.string().datetime().nullable().optional(),
  notes: z.string().optional(),
});

const consumeSchema = z.object({
  mealEventId: z.number().int().positive(),
  consumerName: z.string().min(1).max(255),
  consumedAt: z.string().datetime(),
  rating: z.number().int().min(1).max(10),
});

router.use(requireAuth);

router.post("/", requirePermissions(["meals:create"]), async (req, res, next) => {
  try {
    const payload = mealSchema.parse(req.body);
    const [result] = await pool.query(
      `
      INSERT INTO meal_events (created_by_user_id, recipe_id, title, made_at, expires_at, notes)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        req.authUser!.id,
        payload.recipeId ?? null,
        payload.title,
        new Date(payload.madeAt),
        payload.expiresAt ? new Date(payload.expiresAt) : null,
        payload.notes ?? null,
      ],
    );
    return res.status(201).json({ id: (result as { insertId: number }).insertId });
  } catch (error) {
    return next(error);
  }
});

router.get("/", requirePermissions(["meals:read"]), async (_req, res, next) => {
  try {
    const [rows] = (await pool.query(
      "SELECT id, recipe_id, title, made_at, expires_at, notes FROM meal_events ORDER BY made_at DESC",
    )) as unknown as [
      {
        id: number;
        recipe_id: number | null;
        title: string;
        made_at: string;
        expires_at: string | null;
        notes: string | null;
      }[],
      unknown,
    ];
    return res.json(
      rows.map((row) => ({
        id: row.id,
        recipeId: row.recipe_id,
        title: row.title,
        madeAt: row.made_at,
        expiresAt: row.expires_at,
        notes: row.notes,
      })),
    );
  } catch (error) {
    return next(error);
  }
});

router.post("/consume", requirePermissions(["meals:consume"]), async (req, res, next) => {
  try {
    const payload = consumeSchema.parse(req.body);

    const [existingRows] = (await pool.query(
      "SELECT id FROM meal_consumptions WHERE meal_event_id = ? LIMIT 1",
      [payload.mealEventId],
    )) as unknown as [{ id: number }[], unknown];

    if (existingRows.length > 0) {
      return res.status(409).json({ message: "This prepped meal is already marked as consumed." });
    }

    const [result] = await pool.query(
      `
      INSERT INTO meal_consumptions (meal_event_id, consumer_name, consumed_at, created_by_user_id, rating)
      VALUES (?, ?, ?, ?, ?)
      `,
      [payload.mealEventId, payload.consumerName, new Date(payload.consumedAt), req.authUser!.id, payload.rating],
    );
    return res.status(201).json({ id: (result as { insertId: number }).insertId });
  } catch (error) {
    return next(error);
  }
});

router.get("/consumptions", requirePermissions(["meals:read"]), async (_req, res, next) => {
  try {
    const [rows] = (await pool.query(
      `
      SELECT id, meal_event_id, consumer_name, consumed_at, rating
      FROM meal_consumptions
      ORDER BY consumed_at DESC
      `,
    )) as unknown as [
      {
        id: number;
        meal_event_id: number;
        consumer_name: string;
        consumed_at: string;
        rating: number;
      }[],
      unknown,
    ];

    return res.json(
      rows.map((row) => ({
        id: row.id,
        mealEventId: row.meal_event_id,
        consumerName: row.consumer_name,
        consumedAt: row.consumed_at,
        rating: row.rating,
      })),
    );
  } catch (error) {
    return next(error);
  }
});

export default router;
