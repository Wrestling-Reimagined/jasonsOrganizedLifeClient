import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { comparePassword, hashPassword } from "../utils/password";
import { signAuthToken } from "../utils/jwt";
import { createResetToken } from "../utils/crypto";
import { env } from "../config/env";
import { requireAuth } from "../middleware/auth";

const router = Router();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8),
});

router.post("/signup", async (req, res, next) => {
  try {
    const payload = signupSchema.parse(req.body);
    const passwordHash = await hashPassword(payload.password);

    const [existingRows] = (await pool.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [payload.email],
    )) as unknown as [{ id: number }[], unknown];
    if (existingRows.length > 0) {
      return res.status(409).json({ message: "Email already registered." });
    }

    const [result] = await pool.query(
      "INSERT INTO users (email, password_hash) VALUES (?, ?)",
      [payload.email, passwordHash],
    );
    const userId = (result as { insertId: number }).insertId;

    const [roleRows] = (await pool.query(
      "SELECT id FROM roles WHERE name = 'user' LIMIT 1",
    )) as unknown as [{ id: number }[], unknown];
    if (roleRows.length > 0) {
      await pool.query("INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)", [
        userId,
        roleRows[0].id,
      ]);
    }

    const token = signAuthToken(userId);
    return res.status(201).json({
      token,
      user: { id: userId, email: payload.email },
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);
    const [rows] = (await pool.query(
      "SELECT id, email, password_hash FROM users WHERE email = ? LIMIT 1",
      [payload.email],
    )) as unknown as [{ id: number; email: string; password_hash: string }[], unknown];
    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const user = rows[0];
    const matches = await comparePassword(payload.password, user.password_hash);
    if (!matches) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = signAuthToken(user.id);
    return res.json({
      token,
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", (_req, res) => {
  return res.json({ message: "Logged out." });
});

router.post("/forgot-password", async (req, res, next) => {
  try {
    const payload = forgotPasswordSchema.parse(req.body);
    const [rows] = (await pool.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [payload.email],
    )) as unknown as [{ id: number }[], unknown];
    if (rows.length === 0) {
      return res.json({ message: "If account exists, reset instructions were generated." });
    }

    const userId = rows[0].id;
    const { token, tokenHash } = createResetToken();
    const expiresAt = new Date(Date.now() + env.resetTokenTtlMinutes * 60_000);

    await pool.query("DELETE FROM password_reset_tokens WHERE user_id = ?", [userId]);
    await pool.query(
      "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
      [userId, tokenHash, expiresAt],
    );

    return res.json({
      message: "Reset token generated.",
      // v1 includes token in response for simple setup with no email provider yet.
      resetToken: token,
      expiresAt,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const payload = resetPasswordSchema.parse(req.body);
    const tokenHash = await (async () => {
      const { createHash } = await import("node:crypto");
      return createHash("sha256").update(payload.token).digest("hex");
    })();

    const [rows] = (await pool.query(
      `
      SELECT id, user_id, expires_at, consumed_at
      FROM password_reset_tokens
      WHERE token_hash = ?
      LIMIT 1
      `,
      [tokenHash],
    )) as unknown as [
      { id: number; user_id: number; expires_at: string; consumed_at: string | null }[],
      unknown,
    ];

    if (rows.length === 0) {
      return res.status(400).json({ message: "Invalid reset token." });
    }

    const tokenRow = rows[0];
    if (tokenRow.consumed_at) {
      return res.status(400).json({ message: "Reset token already used." });
    }
    if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ message: "Reset token expired." });
    }

    const newHash = await hashPassword(payload.password);
    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, tokenRow.user_id]);
    await pool.query("UPDATE password_reset_tokens SET consumed_at = NOW() WHERE id = ?", [tokenRow.id]);

    return res.json({ message: "Password updated." });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", requireAuth, async (req, res) => {
  return res.json({ user: req.authUser });
});

export default router;
