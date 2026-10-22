"use client";
import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react";
export function LoginForm({ configured }: { configured: boolean }) {
  const [username, setUsername] = useState("StrozpyManager"),
    [password, setPassword] = useState(""),
    [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await result.json();
      if (!result.ok) throw new Error(data.error);
      window.location.assign("/dashboard");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to sign in. Please try again.",
      );
      setBusy(false);
    }
  }
  return (
    <form className="admin-login" onSubmit={submit}>
      <label htmlFor="username">Username</label>
      <input
        id="username"
        name="username"
        autoComplete="username"
        required
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        maxLength={100}
      />
      <label htmlFor="password">Password</label>
      <div className="password-field">
        <input
          id="password"
          name="password"
          autoComplete="current-password"
          required
          type={visible ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          maxLength={1024}
        />
        <button
          type="button"
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {!configured && (
        <p className="notice">
          Set the administrator password and session secret in Vercel to
          activate sign-in.
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="button primary"
        type="submit"
        disabled={busy || !configured}
      >
        {busy ? "Signing in…" : "Sign in to your workspace"}
        <ArrowRight size={17} />
      </button>
      <small>
        <LockKeyhole size={12} />
        Secure session · Strozpy Limited
      </small>
    </form>
  );
}
