import { NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import type { PropsWithChildren } from "react";
import type { User } from "@market-room/shared";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/live-market", label: "Live Market" },
  { to: "/market-room", label: "Market Room" },
  { to: "/ask-market", label: "Ask Market" },
  { to: "/agents", label: "Agent Profiles" }
];

const adminEnabled = import.meta.env.VITE_ENABLE_ADMIN === "true";

export function AppShell({ children }: PropsWithChildren) {
  const visibleNavItems = adminEnabled ? [...navItems, { to: "/admin", label: "Admin" }] : navItems;
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.ok && data.user) setUser(data.user as User);
      })
      .catch(() => null);
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      setUser(null);
      window.location.href = "/";
    } catch (err) {
      console.error("Logout failed:", err);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">AI Finance Workspace</p>
          <h1>Market Room</h1>
        </div>
        <nav className="nav">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              {item.label}
            </NavLink>
          ))}

          {user ? (
            <div className="nav-user">
              <button
                className="nav-link nav-link--user"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                {user.firstName}
              </button>
              {showUserMenu && (
                <div className="user-menu">
                  <button
                    onClick={handleLogout}
                    className="user-menu-item user-menu-logout"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <NavLink
              to="/sign-up"
              className={() => "nav-link nav-link--cta"}
            >
              Sign Up
            </NavLink>
          )}
        </nav>
      </header>
      <main className="page">{children}</main>
    </div>
  );
}
