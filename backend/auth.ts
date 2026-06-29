/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// --------------------------------------------------------
// JWT_SECRET : doit être fort en production
// --------------------------------------------------------
const JWT_SECRET = process.env.JWT_SECRET || 'pieces-auto-expert-secret-key-2026';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@piecesauto.com';
// ADMIN_PASSWORD_HASH : si fourni, utilisé comme hash bcrypt.
// Sinon, on tombe sur ADMIN_PASSWORD (plaintext) pour la compatibilité dev.
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

export function signToken(payload: { email: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export interface AuthenticatedRequest extends Request {
  admin?: {
    email: string;
    role: string;
  };
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Authentification requise. En-tête Authorization manquant." });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: "Format du jeton invalide (doit être 'Bearer <token>')." });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { email: string; role: string };
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Session expirée ou jeton d'authentification invalide." });
  }
}

export async function handleLogin(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Veuillez fournir un e-mail et un mot de passe." });
  }

  if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return res.status(401).json({ error: "Identifiants ou mot de passe incorrects." });
  }

  // Vérification du mot de passe :
  // En production, utiliser ADMIN_PASSWORD_HASH (bcrypt).
  // En développement, comparer en plaintext si le hash n'est pas fourni.
  let passwordValid = false;
  if (ADMIN_PASSWORD_HASH) {
    passwordValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
  } else {
    passwordValid = password === ADMIN_PASSWORD;
  }

  if (!passwordValid) {
    return res.status(401).json({ error: "Identifiants ou mot de passe incorrects." });
  }

  const token = signToken({ email: ADMIN_EMAIL, role: 'admin' });
  return res.json({
    token,
    admin: {
      email: ADMIN_EMAIL,
      name: "Administrateur Pièces Auto"
    }
  });
}
