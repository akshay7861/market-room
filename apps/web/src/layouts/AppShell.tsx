import { NavLink } from "react-router-dom";
import type { PropsWithChildren } from "react";

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
        </nav>
      </header>
      <main className="page">{children}</main>
    </div>
  );
}
