import type { NextFunction, Request, Response } from "express";
import { verify, type JwtPayload } from "jsonwebtoken";
import { SYSTEM_CONFIG } from "@surveychamp/common";

/**
 * Middleware that allows access if:
 * 1. A valid JWT is provided in the Authorization header (User access)
 * 2. A valid internal secret is provided in the X-Internal-Secret header (Runner-API access)
 */
export const internalOrUserAuth = (req: Request, res: Response, next: NextFunction) => {
    const internalSecret = req.headers["x-internal-secret"];
    const authHeader = req.headers["authorization"];

    // 1. Check for Internal Secret First (Fastest)
    if (internalSecret && internalSecret === (process.env.INTERNAL_API_SECRET || SYSTEM_CONFIG.INTERNAL_API_SECRET)) {
        return next();
    }

    // 2. Check for JWT if Internal Secret is missing or invalid
    if (authHeader) {
        try {
            const token = authHeader.split(" ")[1];
            if (token) {
                const decoded = verify(token, process.env.JWT_SECRET || SYSTEM_CONFIG.JWT_SECRET) as JwtPayload;
                req.user = decoded.id;
                req.email = decoded.email;
                return next();
            }
        } catch (error) {
            // Token verification failed, proceed to 401
        }
    }

    return res.status(401).json({ message: "Unauthorized: Invalid or missing authentication" });
};
