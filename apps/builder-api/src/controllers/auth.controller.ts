import { LoginSchema, SignupSchema } from "@surveychamp/common";
import type { Request, Response } from "express";
import { AuthService } from "../services/auth.service";

export const AuthController = {
    signup: async (req: Request, res: Response) => {
        try {
            const { success, data, error } = SignupSchema.safeParse(req.body);
            if (!success) {
                return res.status(400).json({ message: "Invalid request input", error: error.message });
            }

            const newUser = await AuthService.signup(data);
            return res.status(201).json({ message: "User created successfully", user: newUser });
        } catch (error: any) {
            return res.status(400).json({ message: error.message || "An error occurred during signup" });
        }
    },

    login: async (req: Request, res: Response) => {
        try {
            const { success, data, error } = LoginSchema.safeParse(req.body);
            if (!success) {
                return res.status(400).json({ message: "Invalid request input", error: error.message });
            }

            const { user, accessToken, refreshToken } = await AuthService.login(data);

            // Set refresh token as a cookie
            res.cookie("refreshToken", refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            return res.status(200).json({ 
                message: "User logged in successfully", 
                user, 
                token: accessToken 
            });
        } catch (error: any) {
            console.log(error);
            const status = error.message === "User not found" ? 404 : error.message === "Invalid password" ? 401 : 400;
            return res.status(status).json({ message: error.message || "An error occurred during login" });
        }
    },

    refresh: async (req: Request, res: Response) => {
        try {
            const refreshToken = req.cookies.refreshToken;
            if (!refreshToken) {
                return res.status(401).json({ message: "Refresh token missing" });
            }

            const { accessToken, refreshToken: newRefreshToken } = await AuthService.refresh(refreshToken);

            // Set new refresh token as a cookie (rotation)
            res.cookie("refreshToken", newRefreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            return res.status(200).json({ token: accessToken });
        } catch (error: any) {
            return res.status(401).json({ message: error.message || "Invalid refresh token" });
        }
    },

    logout: async (req: Request, res: Response) => {
        try {
            const refreshToken = req.cookies.refreshToken;
            if (refreshToken) {
                await AuthService.logout(refreshToken);
            }
            res.clearCookie("refreshToken");
            return res.status(200).json({ message: "Logged out successfully" });
        } catch (error: any) {
            return res.status(400).json({ message: "An error occurred during logout" });
        }
    },

    me: async (req: Request, res: Response) => {
        try {
            const user = await AuthService.getUserById(req.user as string);
            return res.status(200).json({ user });
        } catch (error: any) {
            return res.status(401).json({ message: "Invalid or expired token" });
        }
    }
};
