import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/theme.css";
import App from "./App.jsx";

// Apply stored theme preference (or default to light) before React mounts
const storedTheme = typeof localStorage !== "undefined" ? localStorage.getItem("shliach-theme") : null;
document.documentElement.setAttribute("data-theme", storedTheme === "dark" || storedTheme === "light" ? storedTheme : "light");

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
