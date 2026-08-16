import React, { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { App } from "@/App";
import "@/styles/globals.css";

// Suppress browser console warnings and noisy extension / library notifications
const originalWarn = console.warn;
const originalError = console.error;
const originalInfo = console.info;

console.warn = () => {
  // Do not console log warnings in console as requested
};

console.error = (...args: any[]) => {
  const msg = args.map((a) => (typeof a === "string" ? a : a?.message || "")).join(" ");
  if (
    msg.includes("MaxListenersExceededWarning") ||
    msg.includes("EventEmitter memory leak") ||
    msg.includes("ObjectMultiplex") ||
    msg.includes("Clerk has been loaded with development keys") ||
    msg.includes("Download the Apollo DevTools") ||
    msg.includes("ERR_CONNECTION_REFUSED") ||
    msg.includes("Failed to fetch") ||
    msg.includes("NetworkError")
  ) {
    return;
  }
  originalError.apply(console, args);
};

console.info = (...args: any[]) => {
  const msg = args.map((a) => (typeof a === "string" ? a : a?.message || "")).join(" ");
  if (msg.includes("Download the Apollo DevTools") || msg.includes("Clerk")) {
    return;
  }
  originalInfo.apply(console, args);
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);