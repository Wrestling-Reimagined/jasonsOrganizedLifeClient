import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { requireAuth } from "../middleware/auth";
import { requirePermissions } from "../middleware/rbac";

const router = Router();

const recipeSchema = z.object({
  name: z.string().min(1).max(255),
  ingredientsText: z.string().min(1),
  instructionsText: z.string().min(1),
});

router.use(requireAuth);

router.post("/", requirePermissions(["recipes:create"]), async (req, res, next) => {
  try {
    const payload = recipeSchema.parse(req.body);
    const userId = req.authUser!.id;

    const [result] = await pool.query(
      `
      INSERT INTO recipes (created_by_user_id, name, ingredients_text, instructions_text)
      VALUES (?, ?, ?, ?)
      `,
      [userId, payload.name, payload.ingredientsText, payload.instructionsText],
    );

    return res.status(201).json({
      id: (result as { insertId: number }).insertId,
      ...payload,
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/", requirePermissions(["recipes:read"]), async (_req, res, next) => {
  try {
    const [rows] = (await pool.query(
      `
      SELECT
        r.id,
        r.name,
        r.ingredients_text,
        r.instructions_text,
        r.created_at,
        ROUND(AVG(mc.rating), 2) AS average_rating
      FROM recipes r
      LEFT JOIN meal_events me ON me.recipe_id = r.id
      LEFT JOIN meal_consumptions mc ON mc.meal_event_id = me.id
      GROUP BY r.id, r.name, r.ingredients_text, r.instructions_text, r.created_at
      ORDER BY r.created_at DESC
      `,
    )) as unknown as [
      {
        id: number;
        name: string;
        ingredients_text: string;
        instructions_text: string;
        created_at: string;
        average_rating: string | number | null;
      }[],
      unknown,
    ];

    return res.json(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        ingredientsText: row.ingredients_text,
        instructionsText: row.instructions_text,
        createdAt: row.created_at,
        averageRating:
          row.average_rating == null ? null : typeof row.average_rating === "number"
            ? row.average_rating
            : Number(row.average_rating),
      })),
    );
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", requirePermissions(["recipes:read"]), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [rows] = (await pool.query(
      "SELECT id, name, ingredients_text, instructions_text, created_at FROM recipes WHERE id = ? LIMIT 1",
      [id],
    )) as unknown as [
      {
        id: number;
        name: string;
        ingredients_text: string;
        instructions_text: string;
        created_at: string;
      }[],
      unknown,
    ];
    if (rows.length === 0) {
      return res.status(404).json({ message: "Recipe not found." });
    }
    const row = rows[0];
    return res.json({
      id: row.id,
      name: row.name,
      ingredientsText: row.ingredients_text,
      instructionsText: row.instructions_text,
      createdAt: row.created_at,
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id/ratings", requirePermissions(["recipes:read"]), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [rows] = (await pool.query(
      `
      SELECT
        mc.id,
        mc.consumer_name,
        mc.consumed_at,
        mc.rating,
        me.title AS meal_title
      FROM meal_consumptions mc
      INNER JOIN meal_events me ON me.id = mc.meal_event_id
      WHERE me.recipe_id = ?
      ORDER BY mc.consumed_at DESC
      `,
      [id],
    )) as unknown as [
      {
        id: number;
        consumer_name: string;
        consumed_at: string;
        rating: number;
        meal_title: string;
      }[],
      unknown,
    ];

    return res.json(
      rows.map((row) => ({
        id: row.id,
        consumerName: row.consumer_name,
        consumedAt: row.consumed_at,
        rating: row.rating,
        mealTitle: row.meal_title,
      })),
    );
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", requirePermissions(["recipes:delete"]), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await pool.query("DELETE FROM recipes WHERE id = ?", [id]);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
