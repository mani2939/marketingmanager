"use client";
import { useState } from "react";
import { LogOut } from "lucide-react";
export function LogoutButton() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function logout() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw Error("Sign-out failed. Try again.");
      window.location.assign("/sign-in");
    } catch {
      setError("Sign-out failed. Try again.");
      setBusy(false);
    }
  }
  return (
    <div>
      <button
        className="icon-button"
        aria-label="Sign out"
        title="Sign out"
        disabled={busy}
        onClick={logout}
      >
        <LogOut size={17} />
      </button>
      {error && (
        <small className="form-error" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
