import type { NextFunction, Request, Response } from "express";
import { pool } from "../db/pool";
import { verifyAuthToken } from "../utils/jwt";

const loadAuthUser = async (userId: number) => {
  const [rows] = (await pool.query(
    `
    SELECT
      u.id,
      u.email,
      r.name AS role_name,
      p.name AS permission_name
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    LEFT JOIN role_permissions rp ON rp.role_id = r.id
    LEFT JOIN permissions p ON p.id = rp.permission_id
    WHERE u.id = ?
    `,
    [userId],
  )) as unknown as [
    {
      id: number;
      email: string;
      role_name: string | null;
      permission_name: string | null;
    }[],
    unknown,
  ];

  if (rows.length === 0) {
    return null;
  }

  const roleNames = [...new Set(rows.map((row) => row.role_name).filter(Boolean))] as string[];
  const permissionNames = [...new Set(rows.map((row) => row.permission_name).filter(Boolean))] as string[];

  return {
    id: rows[0].id,
    email: rows[0].email,
    roleNames,
    permissionNames,
  };
};

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Authentication required." });
  }

  try {
    const payload = verifyAuthToken(token);
    const authUser = await loadAuthUser(payload.userId);
    if (!authUser) {
      return res.status(401).json({ message: "Invalid token." });
    }
    req.authUser = authUser;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token." });
  }
};
