import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./screens/Login";
import SeedPhrase from "./screens/SeedPhrase";
import Home from "./screens/Home";
import SessionPin from "./screens/SessionPin";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/seed" element={<SeedPhrase />} />
        <Route path="/home" element={<Home />} />
        <Route path="/session-pin" element={<SessionPin />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
