import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import EMDRApp from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <EMDRApp />
  </StrictMode>
);
