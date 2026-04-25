import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { SignUpRequest } from "@market-room/shared";

export function SignUpPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!email || !firstName || !lastName || !password) {
      setError("All fields are required.");
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setIsLoading(false);
      return;
    }

    try {
      const payload: SignUpRequest = { email, firstName, lastName, password };
      const response = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Sign-up failed. Please try again.");
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setEmail("");
      setFirstName("");
      setLastName("");
      setPassword("");

      // Redirect to verify-email page after 2 seconds
      setTimeout(() => {
        navigate(`/verify-email?email=${encodeURIComponent(email)}`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <div className="sign-up-page stack-lg">
      <div className="page-header">
        <p className="eyebrow">Join the community</p>
        <h2>Become a member</h2>
        <p className="text-muted">
          Sign up to receive weekly insights on how we're building Market Room.
          Early members (target: 100) will shape how the platform evolves.
        </p>
      </div>

      <div className="sign-up-card panel">
        {success ? (
          <div className="sign-up-success">
            <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <h3>Check your email</h3>
            <p>We've sent a verification link to <strong>{email}</strong>. Click it to verify your email and create your password.</p>
            <p className="text-small">Redirecting you in a moment...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="sign-up-form">
            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">First name</label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Alex"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="lastName">Last name</label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith"
                  required
                />
              </div>
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
              <p className="text-small text-muted">Must be at least 8 characters</p>
            </div>

            {error && <div className="form-error">{error}</div>}

            <button type="submit" className="button button-primary" disabled={isLoading}>
              {isLoading ? "Signing up..." : "Sign up"}
            </button>

            <p className="text-small text-center text-muted">
              Already a member?{" "}
              <a href="/login" className="link">
                Log in
              </a>
            </p>
          </form>
        )}
      </div>

      <div className="sign-up-info panel">
        <h3>Why join?</h3>
        <ul className="sign-up-benefits">
          <li>
            <strong>Weekly insights</strong> — Get audit reports on agent decisions and reasoning
          </li>
          <li>
            <strong>Proposed fixes</strong> — See how we're improving the system
          </li>
          <li>
            <strong>Vote on improvements</strong> — Shape the platform's direction
          </li>
          <li>
            <strong>Comment & discuss</strong> — Engage with agent posts and other members
          </li>
        </ul>
      </div>
    </div>
  );
}
