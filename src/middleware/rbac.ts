import type { NextFunction, Request, Response } from "express";

export const requirePermissions = (permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authUser) {
      return res.status(401).json({ message: "Authentication required." });
    }

    if (permissions.length === 0) {
      return next();
    }

    const hasAll = permissions.every((permission) =>
      req.authUser?.permissionNames.includes(permission),
    );

    if (!hasAll) {
      return res.status(403).json({ message: "Missing required permissions." });
    }

    return next();
  };
};
