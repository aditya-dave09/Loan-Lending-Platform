const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../../config');
const prisma = require('../../config/database');
const ApiError = require('../../utils/ApiError');
const { sha256 } = require('../../utils/helpers');

class AuthService {
  /**
   * Register a new user.
   */
  async register({ email, phone, password, firstName, lastName }) {
    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      throw ApiError.conflict('A user with this email already exists');
    }

    // Check if phone already exists
    const existingPhone = await prisma.user.findUnique({ where: { phone } });
    if (existingPhone) {
      throw ApiError.conflict('A user with this phone number already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, config.bcryptRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        phone,
        passwordHash,
        firstName,
        lastName,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        kycStatus: true,
        createdAt: true,
      },
    });

    return user;
  }

  /**
   * Login with email and password.
   * Returns access token + refresh token.
   */
  async login({ email, password }, { userAgent, ipAddress }) {
    // Find user
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!user.isActive) {
      throw ApiError.unauthorized('Account has been deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Generate tokens
    const accessToken = this._generateAccessToken(user);
    const refreshToken = this._generateRefreshToken();

    // Store refresh token (hashed) in database
    await prisma.refreshToken.create({
      data: {
        tokenHash: sha256(refreshToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + this._parseExpiry(config.jwt.refreshExpiry)),
        userAgent,
        ipAddress,
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token using a valid refresh token.
   * Implements token rotation — old token is revoked, new one is issued.
   */
  async refreshToken(token, { userAgent, ipAddress }) {
    const tokenHash = sha256(token);

    // Find the refresh token
    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!storedToken) {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    if (storedToken.revoked) {
      // Possible token reuse attack — revoke ALL tokens for this user
      await prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId },
        data: { revoked: true, revokedAt: new Date() },
      });
      throw ApiError.unauthorized('Refresh token has been revoked. All sessions invalidated.');
    }

    if (new Date() > storedToken.expiresAt) {
      throw ApiError.unauthorized('Refresh token has expired');
    }

    if (!storedToken.user.isActive) {
      throw ApiError.unauthorized('Account has been deactivated');
    }

    // Revoke old token (rotation)
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true, revokedAt: new Date() },
    });

    // Issue new tokens
    const newAccessToken = this._generateAccessToken(storedToken.user);
    const newRefreshToken = this._generateRefreshToken();

    // Store new refresh token
    await prisma.refreshToken.create({
      data: {
        tokenHash: sha256(newRefreshToken),
        userId: storedToken.userId,
        expiresAt: new Date(Date.now() + this._parseExpiry(config.jwt.refreshExpiry)),
        userAgent,
        ipAddress,
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Logout — revoke the specified refresh token.
   */
  async logout(token) {
    const tokenHash = sha256(token);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (storedToken && !storedToken.revoked) {
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revoked: true, revokedAt: new Date() },
      });
    }
  }

  // ── Private Helpers ──────────────────────────

  _generateAccessToken(user) {
    return jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwt.accessSecret,
      { expiresIn: config.jwt.accessExpiry },
    );
  }

  _generateRefreshToken() {
    return crypto.randomUUID();
  }

  _parseExpiry(expiry) {
    const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 7 * 86400000; // Default 7 days
    }
    return parseInt(match[1]) * units[match[2]];
  }
}

module.exports = new AuthService();
