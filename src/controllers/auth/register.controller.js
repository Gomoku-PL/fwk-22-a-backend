import { validationResult } from "express-validator";
import crypto from "node:crypto";
import User from "../../models/user.model.js";
import { isUsingMongoDB } from "../../config/database.js";

/**
 * POST /auth/register
 * Minimal data collection per GDPR Articles 5,6,25 (email + password; username optional)
 * - Validates input (format, length)
 * - Ensures email (and username if provided) are unique
 * - Creates user with hashed password (handled by Mongoose pre-save)
 * - Generates an email verification token (simulated send for now)
 */
export const register = async (req, res) => {
    // Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        if (!isUsingMongoDB()) {
            // For this MVP, we only enable registration when MongoDB is active
            return res.status(503).json({
                success: false,
                message: "Registration unavailable: persistent storage (MongoDB) is disabled",
            });
        }

        const { email, password } = req.body;
        let { username } = req.body;

        const normalizedEmail = String(email).trim().toLowerCase();

        // Derive a username if not provided (data minimization + usability)
        if (!username || !String(username).trim()) {
            username = normalizedEmail.split("@")[0].slice(0, 30) ||
                `user_${crypto.randomBytes(3).toString("hex")}`;
        }
        username = String(username).trim();

        // Uniqueness checks
        const existingByEmail = await User.findOne({ email: normalizedEmail }).lean();
        if (existingByEmail) {
            return res.status(409).json({ success: false, message: "Email already in use" });
        }
        const existingByUsername = await User.findOne({ username }).lean();
        if (existingByUsername) {
            // Minimal guidance without leaking sensitive info
            return res.status(409).json({ success: false, message: "Username unavailable" });
        }

        // Create user; password is hashed by user.model pre-save hook (bcryptjs)
        const user = new User({
            email: normalizedEmail,
            username,
            password,
            emailVerified: false,
        });

        await user.save();

        // Generate a verification token (to be sent via email). For now, we log it.
        const verificationToken = crypto.randomBytes(32).toString("hex");
        const tokenTTLMinutes = 60; // e.g., valid for 60 minutes

        // TODO: Persist token (e.g., VerificationToken collection) and implement /auth/verify endpoint
        // For now, simulate email delivery via server log to avoid storing personal data unnecessarily.
        console.log(
            `Email verification token for ${normalizedEmail}: ${verificationToken} (valid ${tokenTTLMinutes}m)`,
        );

        // Response: do not include raw password or sensitive internals
        return res.status(201).json({
            success: true,
            message: "Registration successful. Please check your email to verify your account.",
            // In non-production you may return the token to help QA; omit in production.
            verification: process.env.NODE_ENV === "production" ? undefined : {
                token: verificationToken,
                expiresInMinutes: tokenTTLMinutes,
            },
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                emailVerified: user.emailVerified,
                createdAt: user.createdAt,
            },
        });
    } catch (err) {
        // Handle duplicate key race or other DB errors safely
        if (err?.code === 11000) {
            const field = Object.keys(err.keyPattern || {})[0] || "field";
            return res.status(409).json({ success: false, message: `${field} already in use` });
        }
        console.error("register error:", err);
        return res.status(500).json({ success: false, message: "Registration failed" });
    }
};
