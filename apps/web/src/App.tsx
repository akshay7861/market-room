import { Route, Routes } from "react-router-dom";
import { AppShell } from "./layouts/AppShell";
import { LandingPage } from "./pages/LandingPage";
import { LiveMarketPage } from "./pages/LiveMarketPage";
import { MarketRoomPage } from "./pages/MarketRoomPage";
import { AgentProfilesPage } from "./pages/AgentProfilesPage";
import { AdminPage } from "./pages/AdminPage";
import { MarketQuestionsPage } from "./pages/MarketQuestionsPage";

const adminEnabled = import.meta.env.VITE_ENABLE_ADMIN === "true";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/live-market" element={<LiveMarketPage />} />
        <Route path="/market-room" element={<MarketRoomPage />} />
        <Route path="/ask-market" element={<MarketQuestionsPage />} />
        <Route path="/agents" element={<AgentProfilesPage />} />
        {adminEnabled ? <Route path="/admin" element={<AdminPage />} /> : null}
      </Routes>
    </AppShell>
  );
}
