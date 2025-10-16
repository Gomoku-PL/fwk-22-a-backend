import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "fallback-secret-key-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";

class JWTService {
  /**
   * Generate access token
   */
  generateAccessToken(payload) {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: "fwk-22-a-backend",
      audience: "fwk-22-a-frontend",
    });
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(payload) {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
      issuer: "fwk-22-a-backend",
      audience: "fwk-22-a-frontend",
    });
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET, {
        issuer: "fwk-22-a-backend",
        audience: "fwk-22-a-frontend",
      });
    } catch (error) {
      throw new Error("Invalid or expired token");
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET, {
        issuer: "fwk-22-a-backend",
        audience: "fwk-22-a-frontend",
      });
    } catch (error) {
      throw new Error("Invalid or expired refresh token");
    }
  }

  /**
   * Decode token without verification (for expired token info)
   */
  decodeToken(token) {
    return jwt.decode(token);
  }

  /**
   * Generate token pair (access + refresh)
   */
  generateTokenPair(payload) {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      expiresIn: JWT_EXPIRES_IN,
      tokenType: "Bearer",
    };
  }
}

export default new JWTService();
