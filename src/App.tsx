import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Login from "./screens/Login";
import SeedPhrase from "./screens/SeedPhrase";
import Home from "./screens/Home";
import SessionPin from "./screens/SessionPin";
import MainNavigation from "./components/MainNavigation";
import Profile from "./screens/Profile";
import Wallet from "./screens/Wallet";
import Exchange from "./screens/Exchange";
import Ai from "./screens/Ai";
import Contracts from "./screens/Contracts";
import Docs from "./screens/Docs";
import GoodVPN from "./pages/GoodVPN";
import "./App.css";

function AppContent() {
  const location = useLocation();
  const hideMenu = location.pathname === "/" || location.pathname === "/seed";
  return (
    <>
      {!hideMenu && <MainNavigation />}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/seed" element={<SeedPhrase />} />
        <Route path="/home" element={<Home />} />
        <Route path="/session-pin" element={<SessionPin />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/goodvpn" element={<GoodVPN />} />
        <Route path="/exchange" element={<Exchange />} />
        <Route path="/ai" element={<Ai />} />
        <Route path="/contracts" element={<Contracts />} />
        <Route path="/docs" element={<Docs />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
