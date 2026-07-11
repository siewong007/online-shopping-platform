import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import { LanguageProvider } from "./i18n/LanguageContext";
import { AppErrorBoundary, NotificationProvider } from "./shared/notifications";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <NotificationProvider>
      <AppErrorBoundary>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </AppErrorBoundary>
    </NotificationProvider>
  </React.StrictMode>
);
