import type { Env } from "../../index";

/**
 * Send verification email via Resend.
 * Requires RESEND_API_KEY in wrangler.jsonc vars.
 */
export async function sendVerificationEmail(
  env: Env,
  email: string,
  firstName: string,
  token: string,
  appUrl: string = "https://www.marketroom.uk"
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[EMAIL] RESEND_API_KEY not configured. Logging token for testing.");
    console.log(`[EMAIL] Verification token for ${email}: ${token}`);
    return { ok: true }; // Fail gracefully in dev
  }

  const verificationUrl = `${appUrl}/verify-email?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Market Room <onboarding@resend.dev>",
        to: email,
        subject: "Verify your email to join Market Room",
        html: `
          <h1>Welcome to Market Room, ${firstName}!</h1>
          <p>Click the link below to verify your email and complete your sign-up:</p>
          <p><a href="${verificationUrl}" style="padding: 12px 24px; background: #ffcc00; color: #111317; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Verify Email</a></p>
          <p style="color: #666; font-size: 0.9em;">Or copy this link: <code>${verificationUrl}</code></p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #999; font-size: 0.85em;">This link expires in 24 hours. If you didn't sign up for Market Room, you can safely ignore this email.</p>
        `
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[EMAIL] Resend error:", error);
      return { ok: false, error: "Failed to send verification email" };
    }

    const data = (await response.json()) as { id?: string };
    return { ok: true, messageId: data.id };
  } catch (error) {
    console.error("[EMAIL] Exception sending verification email:", error);
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Add a member to the Loops newsletter list.
 * Requires LOOPS_API_KEY in wrangler.jsonc vars.
 */
export async function subscribeToNewsletter(
  env: Env,
  email: string,
  firstName: string,
  lastName: string
): Promise<{ ok: boolean; contactId?: string; error?: string }> {
  const apiKey = env.LOOPS_API_KEY;
  if (!apiKey) {
    console.warn("[LOOPS] LOOPS_API_KEY not configured. Newsletter subscription skipped.");
    return { ok: true }; // Fail gracefully in dev
  }

  try {
    const response = await fetch("https://app.loops.so/api/v1/contacts/update", {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        firstName,
        lastName,
        // Subscribe to the default "Market Room Weekly" list
        subscribedTo: {
          "Market Room Weekly": true
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[LOOPS] Error adding contact:", error);
      return { ok: false, error: "Failed to subscribe to newsletter" };
    }

    const data = (await response.json()) as { id?: string };
    return { ok: true, contactId: data.id };
  } catch (error) {
    console.error("[LOOPS] Exception adding contact:", error);
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
