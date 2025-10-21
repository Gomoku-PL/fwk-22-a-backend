import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import RefreshToken from "../../models/refreshToken.model.js";

export function createAccessToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role || "user",
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "15m" });
}

function generateRefreshTokenValue() {
  return crypto.randomBytes(48).toString("hex");
}

export async function createRefreshToken(user, prevTokenValue = null) {
  if (prevTokenValue) {
    await RefreshToken.updateOne(
      { token: prevTokenValue, userId: user.id, revoked: false },
      { $set: { revoked: true, revokedAt: new Date() } }
    );
  }
  const tokenValue = generateRefreshTokenValue();
  const token = new RefreshToken({
    userId: user.id,
    token: tokenValue,
    revoked: false,
    createdAt: new Date(),
  });
  await token.save();
  return tokenValue;
}

export async function revokeAllRefreshTokens(userId) {
  await RefreshToken.updateMany(
    { userId, revoked: false },
    { $set: { revoked: true, revokedAt: new Date() } }
  );
}

export async function isRefreshTokenValid(tokenValue, userId) {
  const token = await RefreshToken.findOne({ token: tokenValue, userId });
  return token && !token.revoked;
}

// Enforce rotation with reuse detection
export async function rotateRefreshToken({ userId, presentedToken, userForNewToken }) {
  const token = await RefreshToken.findOne({ token: presentedToken, userId });
  if (!token || token.revoked) {
    // Reuse or invalid — revoke entire family and deny
    await revokeAllRefreshTokens(userId);
    const err = new Error("REFRESH_TOKEN_REUSED_OR_INVALID");
    err.code = "REFRESH_REUSE";
    throw err;
  }
  // Valid path: revoke current and issue new pair
  await RefreshToken.updateOne(
    { token: presentedToken, userId, revoked: false },
    { $set: { revoked: true, revokedAt: new Date() } }
  );
  const refreshToken = await createRefreshToken(userForNewToken || { id: userId });
  const accessToken = createAccessToken(userForNewToken || { id: userId });
  return { accessToken, refreshToken };
}
