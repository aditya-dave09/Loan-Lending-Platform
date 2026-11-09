
import { useCallback, useEffect, useState } from "react";
import type { Session } from "./api";
import { refreshSession } from "./api";

const STORAGE_KEY = "loanforge_session";

// Read a session saved during a previous page load.
function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);

    if (!raw) return null;

    const saved = JSON.parse(raw) as Session;

    if (
      !saved.user?.id ||
      !saved.accessToken ||
      !saved.refreshToken
    ) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return saved;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

// Save or clear the current session.
function saveSession(session: Session | null) {
  if (session) {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(session)
    );
  } else {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

// Only one token refresh should run at a time.
// This also protects against duplicate React
// development effects rotating the same token twice.
let pendingRefresh: Promise<Session | null> | null = null;

async function renewSession(): Promise<Session | null> {
  if (pendingRefresh) return pendingRefresh;

  const saved = readSession();

  if (!saved) return null;

  pendingRefresh = (async () => {
    try {
      const tokens = await refreshSession(
        saved.refreshToken
      );

      const current = readSession();

      // Don't restore a session if the user logged out
      // or switched accounts while the request ran.
      if (
        !current ||
        current.refreshToken !== saved.refreshToken
      ) {
        return current;
      }

      const updated: Session = {
        ...current,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };

      saveSession(updated);
      return updated;
    } catch (error) {
      console.warn("Session refresh failed:", error);

      const current = readSession();

      // A temporary network error should not
      // immediately erase the saved login.
      // Invalid sessions will be handled by the
      // backend's authentication responses.
      return current;
    }
  })().finally(() => {
    pendingRefresh = null;
  });

  return pendingRefresh;
}

export function usePersistentSession() {
  // Restore saved login immediately when React starts.
  const [session, setSessionState] =
    useState<Session | null>(readSession);

  // Replacement for React's normal setSession.
  const setSession = useCallback(
    (next: Session | null) => {
      saveSession(next);
      setSessionState(next);
    },
    []
  );

  useEffect(() => {
    let active = true;

    async function refresh() {
      if (!readSession()) return;

      const updated = await renewSession();

      if (active) {
        setSessionState(updated);
      }
    }

    // Refresh the access token when the page opens.
    void refresh();

    // Refresh periodically while the app is open.
    const interval = window.setInterval(() => {
      void refresh();
    }, 8 * 60 * 1000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return [session, setSession] as const;
}
