import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const BCRYPT_PREFIXES = ["$2a$", "$2b$", "$2y$"];

function getJwtSecret() {
    return process.env.JWT_SECRET || "dev-only-jwt-secret-change-me";
}

export function isHashedPassword(password = "") {
    return BCRYPT_PREFIXES.some((prefix) => password.startsWith(prefix));
}

export async function hashPassword(password) {
    return bcrypt.hash(password, 10);
}

export async function verifyPassword(candidatePassword, storedPassword) {
    if (!candidatePassword || !storedPassword) {
        return false;
    }

    if (isHashedPassword(storedPassword)) {
        return bcrypt.compare(candidatePassword, storedPassword);
    }

    return candidatePassword === storedPassword;
}

export function createAuthToken(user) {
    return jwt.sign(
        {
            userId: String(user._id),
            email: user.login?.email,
        },
        getJwtSecret(),
        { expiresIn: "7d" }
    );
}

export function verifyAuthToken(token) {
    return jwt.verify(token, getJwtSecret());
}

export function getBearerToken(req) {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
        return null;
    }

    return authHeader.slice("Bearer ".length).trim();
}

export function sanitizeUser(userDoc) {
    if (!userDoc) {
        return null;
    }

    const user = typeof userDoc.toObject === "function" ? userDoc.toObject() : { ...userDoc };

    if (user._id?.toString) {
        user._id = user._id.toString();
    }

    if (user.login) {
        delete user.login.password;
    }

    return user;
}
