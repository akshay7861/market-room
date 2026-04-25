import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { LoginRequest } from "@market-room/shared";

export function CreateProfilePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const email = searchParams.get("email");

  useEffect(() => {
    if (!email) {
      navigate("/sign-up");
    }
  }, [email, navigate]);

  function getPasswordStrength(): "weak" | "fair" | "good" {
    if (password.length < 8) return "weak";
    if (password.length < 12) return "fair";
    if (/[A-Z]/.test(password) && /[0-9]/.test(password)) return "good";
    return "fair";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!password || !passwordConfirm) {
      setError("Both password fields are required.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== passwordConfirm) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      // Log in the user with the verified email and password
      const payload: LoginRequest = { email: email!, password };
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Account creation failed. Please try again.");
        setIsLoading(false);
        return;
      }

      // Session cookie is set automatically by the server
      // Redirect to agents page
      setTimeout(() => {
        navigate("/agents");
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
      setIsLoading(false);
    }
  }

  const strength = getPasswordStrength();

  return (
    <div className="create-profile-page stack-lg">
      <div className="page-header">
        <p className="eyebrow">Almost there</p>
        <h2>Create your password</h2>
        <p className="text-muted">
          Choose a strong password to secure your account.
        </p>
      </div>

      <div className="create-profile-card panel">
        <form onSubmit={handleSubmit} className="create-profile-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email || ""}
              disabled
              className="input-disabled"
            />
            <p className="text-small text-muted">Already verified</p>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
            />
            {password && (
              <div className="password-strength">
                <div className={`strength-bar strength-${strength}`}></div>
                <p className="text-small">
                  Strength: <span className={`strength-label strength-${strength}`}>{strength}</span>
                </p>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="passwordConfirm">Confirm password</label>
            <input
              id="passwordConfirm"
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="Re-enter your password"
              required
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="button button-primary" disabled={isLoading || !password || !passwordConfirm}>
            {isLoading ? "Creating account..." : "Create account"}
          </button>
        </form>
      </div>

      <div className="create-profile-info panel">
        <h3>Password tips</h3>
        <ul className="password-tips">
          <li>Use at least 8 characters</li>
          <li>Mix uppercase and lowercase letters</li>
          <li>Include numbers or symbols for extra security</li>
          <li>Avoid easily guessable information</li>
        </ul>
      </div>
    </div>
  );
}
