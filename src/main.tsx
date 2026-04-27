
import { createRoot } from "react-dom/client";
import posthog from "posthog-js";
import App from "./app/App.tsx";
import { AuthProvider } from "./app/context/AuthContext";
import { KromeProvider } from "./app/hooks/useKrome.tsx";
import "./styles/index.css";

posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_KEY, {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  person_profiles: "identified_only",
});

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <KromeProvider>
      <App />
    </KromeProvider>
  </AuthProvider>
);
