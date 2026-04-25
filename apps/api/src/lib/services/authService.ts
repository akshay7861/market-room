import type { Env } from "../../index";
import type { User, AuthResponse } from "@market-room/shared";
import { createRepositories } from "../repositories";
import { sendVerificationEmail, subscribeToNewsletter } from "./emailService";

/**
 * Hash a plaintext password using PBKDF2 (available in Cloudflare Workers).
 * Format: sha256:iterations:salt:hash (base64-encoded for storage)
 */
export async function hashPassword(plaintext: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // Use a random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 100000;

  // PBKDF2 with SHA-256
  const key = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations,
      hash: "SHA-256",
    },
    await crypto.subtle.importKey("raw", data, "PBKDF2", false, ["deriveBits"]),
    256
  );

  const hashBuffer = new Uint8Array(key);
  const saltBase64 = btoa(String.fromCharCode(...salt));
  const hashBase64 = btoa(String.fromCharCode(...hashBuffer));

  return `sha256:${iterations}:${saltBase64}:${hashBase64}`;
}

/**
 * Verify a plaintext password against a stored hash.
 */
export async function verifyPassword(plaintext: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(":");
  if (parts.length !== 4 || parts[0] !== "sha256") {
    return false;
  }

  const [, iterationsStr, saltBase64, expectedHashBase64] = parts;
  const iterations = parseInt(iterationsStr, 10);

  if (isNaN(iterations) || iterations < 1000) {
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    const salt = Uint8Array.from(atob(saltBase64), (c) => c.charCodeAt(0));

    const key = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations,
        hash: "SHA-256",
      },
      await crypto.subtle.importKey("raw", data, "PBKDF2", false, ["deriveBits"]),
      256
    );

    const hashBuffer = new Uint8Array(key);
    const hashBase64 = btoa(String.fromCharCode(...hashBuffer));

    return hashBase64 === expectedHashBase64;
  } catch {
    return false;
  }
}

/**
 * Generate a random email verification token (32 bytes hex).
 */
export function generateEmailVerificationToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generate a random session token (64 bytes hex).
 */
export function generateSessionToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(64));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Sign up a new user with email, first name, last name, and password.
 * Returns the user object (without password hash) or an error.
 */
export async function signUp(
  env: Env,
  email: string,
  firstName: string,
  lastName: string,
  password: string
): Promise<AuthResponse> {
  // Validate inputs
  if (!email || !email.includes("@")) {
    return { ok: false, message: "Invalid email address." };
  }
  if (!firstName || firstName.trim().length === 0) {
    return { ok: false, message: "First name is required." };
  }
  if (!lastName || lastName.trim().length === 0) {
    return { ok: false, message: "Last name is required." };
  }
  if (!password || password.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters." };
  }

  const repos = createRepositories(env);

  // Check if email already registered
  const existing = await repos.users.getUserByEmail(email);
  if (existing) {
    return { ok: false, message: "This email is already registered." };
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Generate verification token (valid 24 hours)
  const token = generateEmailVerificationToken();
  const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // Create user
  try {
    const user = await repos.users.createUser({
      email,
      firstName,
      lastName,
      passwordHash,
      emailVerified: false,
      emailVerificationToken: token,
      emailVerificationExpiry: expiryTime,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any);

    // Create member status record
    await repos.users.createMemberStatus(user.id, "pending");

    // Send verification email
    const emailResult = await sendVerificationEmail(env, email, firstName, token);
    if (!emailResult.ok) {
      console.warn(`[AUTH] Email send failed for ${email}, but user was created. Token: ${token}`);
    }

    return { ok: true, user };
  } catch (error) {
    console.error("[AUTH] Sign-up error:", error);
    return { ok: false, message: "Could not create account. Please try again." };
  }
}

/**
 * Verify an email address using the provided token.
 * Marks the user as verified and sets membership status to 'active'.
 */
export async function verifyEmail(
  env: Env,
  email: string,
  token: string
): Promise<AuthResponse> {
  if (!email || !token) {
    return { ok: false, message: "Email and token are required." };
  }

  const repos = createRepositories(env);
  const user = await repos.users.getUserByEmail(email);

  if (!user) {
    return { ok: false, message: "User not found." };
  }

  if (user.emailVerified) {
    return { ok: false, message: "This email is already verified." };
  }

  // Get verification token and expiry from DB
  const tokenData = await repos.users.getVerificationToken(email);
  if (!tokenData || tokenData.token !== token) {
    return { ok: false, message: "Invalid or expired verification token." };
  }

  if (tokenData.expiry && new Date(tokenData.expiry) < new Date()) {
    return { ok: false, message: "Verification token has expired." };
  }

  try {
    // Mark email as verified
    await repos.users.updateUser(user.id, {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpiry: null,
    });

    // Update member status to active
    await repos.users.updateMemberStatus(user.id, "active", new Date().toISOString());

    // Subscribe to newsletter
    const loopsResult = await subscribeToNewsletter(env, email, user.firstName, user.lastName);
    if (!loopsResult.ok) {
      console.warn(`[AUTH] Newsletter subscription failed for ${email}, but email was verified.`);
    }

    return { ok: true, message: "Email verified successfully." };
  } catch (error) {
    console.error("[AUTH] Email verification error:", error);
    return { ok: false, message: "Could not verify email. Please try again." };
  }
}

/**
 * Log in a user with email and password.
 * Returns a session token and user object, or an error.
 */
export async function login(
  env: Env,
  email: string,
  password: string
): Promise<AuthResponse & { sessionToken?: string }> {
  if (!email || !password) {
    return { ok: false, message: "Email and password are required." };
  }

  const repos = createRepositories(env);
  const user = await repos.users.getUserByEmail(email);

  if (!user) {
    return { ok: false, message: "User not found." };
  }

  // Verify password
  const passwordData = await repos.users.getPasswordHash(user.id);
  if (!passwordData) {
    return { ok: false, message: "Invalid credentials." };
  }

  const isValid = await verifyPassword(password, passwordData.hash);
  if (!isValid) {
    return { ok: false, message: "Invalid credentials." };
  }

  // Create session
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

  try {
    await repos.users.createSession(user.id, sessionToken, expiresAt);
    return { ok: true, user, sessionToken };
  } catch (error) {
    console.error("[AUTH] Login error:", error);
    return { ok: false, message: "Could not create session. Please try again." };
  }
}

/**
 * Validate a session token and return the associated user, or null if invalid.
 */
export async function validateSession(env: Env, sessionToken: string): Promise<User | null> {
  if (!sessionToken) {
    return null;
  }

  const repos = createRepositories(env);

  try {
    const session = await repos.users.getSessionByToken(sessionToken);
    if (!session) {
      return null;
    }

    // Check expiry
    if (new Date(session.expiresAt) < new Date()) {
      await repos.users.deleteSession(sessionToken);
      return null;
    }

    // Return the user
    const user = await repos.users.getUserById(session.userId);
    return user ?? null;
  } catch {
    return null;
  }
}

/**
 * Log out a user by deleting their session.
 */
export async function logout(env: Env, sessionToken: string): Promise<{ ok: boolean }> {
  const repos = createRepositories(env);
  try {
    await repos.users.deleteSession(sessionToken);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
