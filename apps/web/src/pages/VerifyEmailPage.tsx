import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { VerifyEmailRequest } from "@market-room/shared";
import { API_BASE_URL } from "../lib/api";

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";

  useEffect(() => {
    if (!email || !token) {
      setError("Missing email or verification token.");
      setIsLoading(false);
      return;
    }

    async function verify() {
      try {
        const payload: VerifyEmailRequest = { email: email!, token: token! };
        const response = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || "Email verification failed.");
          setIsLoading(false);
          return;
        }

        setSuccess(true);
        setIsLoading(false);

        // Redirect to create profile after 2 seconds
        setTimeout(() => {
          navigate(`/create-profile?email=${encodeURIComponent(email)}`);
        }, 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
        setIsLoading(false);
      }
    }

    verify();
  }, [email, token, navigate]);

  return (
    <div className="verify-email-page stack-lg">
      <div className="page-header">
        <h2>Verify your email</h2>
      </div>

      <div className="verify-email-card panel">
        {isLoading && (
          <div className="verify-email-loading">
            <div className="spinner"></div>
            <p>Verifying your email...</p>
          </div>
        )}

        {success && (
          <div className="verify-email-success">
            <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <h3>Email verified!</h3>
            <p>Your email has been verified successfully.</p>
            <p className="text-small">Creating your account...</p>
          </div>
        )}

        {error && (
          <div className="verify-email-error">
            <svg className="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <h3>Verification failed</h3>
            <p>{error}</p>
            <a href="/sign-up" className="button button-secondary">
              Try signing up again
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
