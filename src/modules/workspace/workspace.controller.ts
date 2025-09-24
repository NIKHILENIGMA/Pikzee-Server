import { Request, Response } from "express";
import { getAuth } from '@clerk/express'

export async function createWorkspace(req: Request, res: Response): Promise<void> {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  res.json({ message: "Workspace created", userId });
}
