import { prisma } from "@surveychamp/db";
import bcrypt from "bcrypt";
import { sign } from "jsonwebtoken";
import { SYSTEM_CONFIG, type SignupData, type LoginData } from "@surveychamp/common";
import { v4 as uuidv4 } from "uuid";

export const AuthService = {
    signup: async (data: SignupData) => {
        const { name, email, password } = data;
        
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new Error("User already exists");
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
            data: { name, email, password: hashedPassword }
        });

        // Use a common helper to sanitize user object if possible, or just return needed fields
        const { password: _, ...userWithoutPassword } = newUser;
        return userWithoutPassword;
    },

    login: async (data: LoginData) => {
        const { email, password } = data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new Error("User not found");
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new Error("Invalid password");
        }

        const tokens = await AuthService.generateTokens(user.id, user.email);
        
        const { password: _, ...userWithoutPassword } = user;
        return { user: userWithoutPassword, ...tokens };
    },

    generateTokens: async (userId: string, email: string) => {
        const accessToken = sign({ id: userId, email }, SYSTEM_CONFIG.JWT_SECRET, { expiresIn: "15m" });
        const refreshTokenString = uuidv4();
        
        // Save refresh token to DB (7 days expiration)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await prisma.refreshToken.create({
            data: {
                token: refreshTokenString,
                userId,
                expiresAt
            }
        });

        return { accessToken, refreshToken: refreshTokenString };
    },

    refresh: async (token: string) => {
        const storedToken = await prisma.refreshToken.findUnique({
            where: { token },
            include: { user: true }
        });

        if (!storedToken || storedToken.expiresAt < new Date()) {
            if (storedToken) {
                await prisma.refreshToken.delete({ where: { id: storedToken.id } });
            }
            throw new Error("Invalid or expired refresh token");
        }

        // Issue new tokens and invalidate old one (token rotation for security)
        await prisma.refreshToken.delete({ where: { id: storedToken.id } });
        return await AuthService.generateTokens(storedToken.user.id, storedToken.user.email);
    },

    logout: async (token: string) => {
        await prisma.refreshToken.deleteMany({
            where: { token }
        });
    },

    getUserById: async (id: string) => {
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) {
            throw new Error("User not found");
        }
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
};
