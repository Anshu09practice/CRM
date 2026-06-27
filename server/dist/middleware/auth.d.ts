import { Request, Response, NextFunction } from 'express';
declare const JWT_SECRET: string;
export declare function blacklistToken(token: string): void;
export declare function isTokenBlacklisted(token: string): boolean;
export declare function recordFailedLogin(username: string): void;
export declare function isAccountLocked(username: string): boolean;
export declare function clearLoginAttempts(username: string): void;
export declare function auditLog(event: string, details: Record<string, any>): void;
export interface AuthPayload {
    userId: number;
    username: string;
    role: 'owner' | 'manager';
    iat?: number;
    exp?: number;
}
/**
 * Generate an access token for a user
 */
export declare function generateToken(userId: number, username: string, role: string): string;
/**
 * Generate a refresh token for a user
 */
export declare function generateRefreshToken(userId: number, username: string, role: string): string;
/**
 * Verify and decode a JWT token
 */
export declare function verifyToken(token: string): AuthPayload | null;
/**
 * Express middleware to protect routes.
 * Checks for Bearer token in Authorization header.
 * PCI DSS 8.1.5: Validates token is not revoked.
 */
export declare function authMiddleware(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
/**
 * Middleware factory to require specific roles.
 * Usage: requireRole('owner') or requireRole('owner', 'manager')
 */
export declare function requireRole(...roles: string[]): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export { JWT_SECRET };
//# sourceMappingURL=auth.d.ts.map