"use client";
import { useEffect, useState } from "react";
import {
  Link2,
  RefreshCw,
  Unplug,
  ExternalLink,
  Heart,
  Eye,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import {
  providerLabels,
  safeUrl,
  type SocialPost,
  type SocialProvider,
} from "@/lib/social/types";
import { workspaces, type WorkspaceId } from "@/lib/workspaces";
type Account = {
  id: string;
  provider: SocialProvider;
  name: string;
  status: string;
  lastSyncedAt: string | null;
  lastError: string | null;
  posts?: SocialPost[];
};
type Candidate = {
  index: number;
  name: string;
  accountId: string;
  provider: SocialProvider;
};
type Provider = { id: SocialProvider; issue: string | null };
async function api(url: string, method = "GET") {
  const r = await fetch(url, { method, cache: "no-store" });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Request failed. Please try again.");
  return data;
}
const stamp = (date: string | null) =>
  date
    ? new Date(date).toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not refreshed yet";
const count = (n: number | null) =>
  n === null
    ? "—"
    : new Intl.NumberFormat("en-GB", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(n);
export function SocialAccounts({
  site,
  demo,
  highlights = false,
}: {
  site: WorkspaceId;
  demo: boolean;
  highlights?: boolean;
}) {
  const [accounts, setAccounts] = useState<Account[]>([]),
    [providers, setProviders] = useState<Provider[]>([]),
    [candidates, setCandidates] = useState<Candidate[]>([]),
    [pending, setPending] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [reload, setReload] = useState(0),
    [filter, setFilter] = useState("all");
  const root = `/api/social`,
    scope = `workspace=${site}`;
  useEffect(() => {
    let active = true;
    setLoading(true);
    setAccounts([]);
    setCandidates([]);
    if (demo) {
      setLoading(false);
      return;
    }
    const query = new URLSearchParams(window.location.search),
      selection = query.get("pending");
    if (query.get("connection") === "failed")
      setError(
        "Connection was not completed. Check app credentials, approved permissions and account eligibility, then try again.",
      );
    async function load() {
      try {
        const data = await api(
          `${root}/${highlights ? "highlights" : "accounts"}?${scope}`,
        );
        if (!active) return;
        setAccounts(data.accounts);
        setProviders(data.providers || []);
        if (selection && !highlights && query.get("workspace") === site) {
          const p = await api(`${root}/pending?${scope}&id=${selection}`);
          if (active) {
            setCandidates(p.candidates);
            setPending(selection);
          }
        }
      } catch (e) {
        if (active)
          setError(
            e instanceof Error ? e.message : "Could not load connections.",
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [site, demo, highlights, reload, root, scope]);
  async function act(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setError("");
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy("");
    }
  }
  function refresh(account: Account) {
    void act(account.id, async () => {
      try {
        await api(`${root}/sync?${scope}&id=${account.id}`, "POST");
        setMessage(`${account.name} refreshed.`);
      } finally {
        setReload((x) => x + 1);
      }
    });
  }
  function connect(id: SocialProvider) {
    void act(id, async () => {
      const data = await api(`${root}/connect?${scope}&provider=${id}`, "POST");
      window.location.assign(data.url);
    });
  }
  function select(candidate: Candidate) {
    void act("select", async () => {
      const saved = await api(
        `${root}/pending?${scope}&id=${pending}&index=${candidate.index}`,
        "POST",
      );
      setCandidates([]);
      setPending("");
      window.history.replaceState({}, "", window.location.pathname);
      setMessage(`${candidate.name} connected to ${workspaces[site].name}.`);
      try {
        await api(`${root}/sync?${scope}&id=${saved.id}`, "POST");
        setMessage(
          `${candidate.name} connected. The latest posts are ready in Highlights.`,
        );
      } finally {
        setReload((x) => x + 1);
      }
    });
  }
  function disconnect(account: Account) {
    if (
      !window.confirm(
        `Remove ${account.name} from ${workspaces[site].name}? Saved credentials and cached posts for this connection will be deleted. Provider permissions can be revoked in the platform's settings.`,
      )
    )
      return;
    void act(account.id, async () => {
      await api(`${root}/accounts?${scope}&id=${account.id}`, "DELETE");
      setMessage("Connection removed from this workspace.");
      setReload((x) => x + 1);
    });
  }
  if (demo)
    return (
      <section className="card social-empty">
        <Link2 />
        <h3>
          {highlights
            ? "Your best moments, in one place"
            : "Connect your social accounts"}
        </h3>
        <p>
          Sign in to connect accounts and see real post performance. The demo
          does not access social accounts.
        </p>
        <Link className="button primary" href="/sign-in">
          Sign in
        </Link>
      </section>
    );
  return (
    <div className="social-module">
      <div className="section-top">
        <div>
          <h3>
            {highlights
              ? "Latest posts. Real performance."
              : "Social connections"}
          </h3>
          <p className="social-subtitle">
            {workspaces[site].name} ·{" "}
            {highlights
              ? "Latest five accessible published posts per account"
              : "Choose the accounts that belong to this website"}
          </p>
        </div>
        <Link
          className="button secondary"
          href={`/dashboard/${highlights ? "settings" : "highlights"}`}
        >
          {highlights ? <Link2 size={15} /> : <Sparkles size={15} />}{" "}
          {highlights ? "Manage connections" : "View Highlights"}
        </Link>
      </div>
      {error && (
        <div className="notice error-notice" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="notice" role="status">
          {message}
        </div>
      )}
      {loading ? (
        <div className="card social-empty" role="status">
          Loading social accounts…
        </div>
      ) : (
        <>
          {candidates.length > 0 && (
            <section className="card social-selection">
              <h3>Choose an account for {workspaces[site].name}</h3>
              <p>
                Only the selected account will be saved. Connect again to add
                another.
              </p>
              {candidates.map((c) => (
                <div className="social-account-row" key={c.index}>
                  <div>
                    <strong>{c.name}</strong>
                    <small>
                      {providerLabels[c.provider]} · {c.accountId}
                    </small>
                  </div>
                  <button
                    className="button primary"
                    disabled={!!busy}
                    onClick={() => select(c)}
                  >
                    Use this account
                  </button>
                </div>
              ))}
            </section>
          )}
          {!highlights && (
            <div className="integration-grid">
              {providers.map((p) => (
                <article className="card integration" key={p.id}>
                  <div className="integration-top">
                    <span className={`social-badge ${p.id}`}>
                      {providerLabels[p.id].slice(0, 1)}
                    </span>
                    <span className="muted-badge">
                      {p.issue ? "SETUP REQUIRED" : "READY TO CONNECT"}
                    </span>
                  </div>
                  <h3>{providerLabels[p.id]}</h3>
                  <p>
                    {p.id === "instagram"
                      ? "Business or Creator account linked to a Facebook Page."
                      : p.id === "facebook"
                        ? "Pages you manage, with post reactions, comments and shares."
                        : p.id === "tiktok"
                          ? "Your published videos, views, likes, comments and shares."
                          : "Your channel uploads with views, likes and comments."}
                  </p>
                  {p.issue && <p className="social-config">{p.issue}</p>}
                  <button
                    className="button primary"
                    disabled={!!busy || !!p.issue}
                    onClick={() => connect(p.id)}
                  >
                    <Link2 size={15} />
                    {busy === p.id ? "Opening…" : "Connect account"}
                  </button>
                </article>
              ))}
            </div>
          )}
          {highlights && accounts.length > 0 && (
            <div className="social-filter">
              <label htmlFor="social-filter">Platform</label>
              <select
                id="social-filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All platforms</option>
                {Object.entries(providerLabels).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
              <span>
                — means unavailable, never zero. Counts are lifetime totals as
                of the last refresh.
              </span>
            </div>
          )}
          {accounts.length === 0 && (
            <section className="card social-empty">
              <Sparkles />
              <h3>No social accounts connected yet</h3>
              <p>
                {highlights
                  ? "Connect an account in Settings, then refresh here to import its latest five posts."
                  : "Once connected, your accounts will be saved securely and available on every visit."}
              </p>
              {highlights && (
                <Link href="/dashboard/settings" className="button primary">
                  Connect your first account
                </Link>
              )}
            </section>
          )}
          {accounts
            .filter(
              (a) => !highlights || filter === "all" || a.provider === filter,
            )
            .map((a) => (
              <section className="card social-account" key={a.id}>
                <div className="social-account-header">
                  <span className={`social-badge ${a.provider}`}>
                    {providerLabels[a.provider].slice(0, 1)}
                  </span>
                  <div className="social-account-title">
                    <h3>{a.name}</h3>
                    <p>
                      {providerLabels[a.provider]} · Last refreshed:{" "}
                      {stamp(a.lastSyncedAt)}
                    </p>
                  </div>
                  <span
                    className={`status ${a.status === "connected" ? "planned" : "draft"}`}
                  >
                    {a.status === "connected"
                      ? "Connected"
                      : a.status === "reconnect"
                        ? "Reconnect needed"
                        : "Refresh failed"}
                  </span>
                  <div className="social-account-actions">
                    <button
                      className="button secondary"
                      disabled={!!busy}
                      onClick={() => refresh(a)}
                    >
                      <RefreshCw
                        size={14}
                        className={busy === a.id ? "spin" : ""}
                      />
                      {busy === a.id ? "Refreshing…" : "Refresh"}
                    </button>
                    {!highlights && (
                      <>
                        <button
                          className="button secondary"
                          disabled={!!busy}
                          onClick={() => connect(a.provider)}
                        >
                          Reconnect
                        </button>
                        <button
                          className="icon-button"
                          disabled={!!busy}
                          aria-label={`Disconnect ${a.name}`}
                          onClick={() => disconnect(a)}
                        >
                          <Unplug size={17} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {a.lastError && (
                  <div className="notice error-notice">
                    {a.lastError}{" "}
                    {a.lastSyncedAt ? "Showing previously saved results." : ""}
                  </div>
                )}
                {highlights && (
                  <>
                    {a.posts?.length ? (
                      <div className="highlight-posts">
                        {a.posts.map((post) => (
                          <article className="highlight-post" key={post.id}>
                            <div className="highlight-media">
                              {safeUrl(post.thumbnail) ? (
                                <img
                                  src={safeUrl(post.thumbnail)!}
                                  alt=""
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              ) : (
                                <Sparkles size={28} />
                              )}
                            </div>
                            <div className="highlight-content">
                              <time dateTime={post.publishedAt}>
                                {stamp(post.publishedAt)}
                              </time>
                              <h4>{post.title}</h4>
                              <div className="post-metrics">
                                {(
                                  [
                                    ["Views", post.metrics.views, Eye],
                                    ["Reach", post.metrics.reach, Eye],
                                    [
                                      a.provider === "facebook"
                                        ? "Reactions"
                                        : "Likes",
                                      post.metrics.likes,
                                      Heart,
                                    ],
                                    [
                                      "Comments",
                                      post.metrics.comments,
                                      MessageCircle,
                                    ],
                                    [
                                      "Shares",
                                      post.metrics.shares,
                                      ExternalLink,
                                    ],
                                    ["Saves", post.metrics.saves, Link2],
                                  ] as const
                                ).map(([label, value, Icon]) => (
                                  <div key={label}>
                                    <span>
                                      <Icon size={12} />
                                      {label}
                                    </span>
                                    <strong>{count(value)}</strong>
                                  </div>
                                ))}
                              </div>
                              {post.warning && (
                                <p className="metric-warning">{post.warning}</p>
                              )}
                              {safeUrl(post.url) && (
                                <a
                                  className="post-link"
                                  href={safeUrl(post.url)!}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  View original post <ExternalLink size={13} />
                                </a>
                              )}
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="social-empty">
                        <p>
                          {a.lastSyncedAt
                            ? "No accessible published posts were returned for this account."
                            : "Refresh this account to load its latest posts and performance."}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </section>
            ))}
          {highlights &&
            accounts.length > 0 &&
            filter !== "all" &&
            !accounts.some((a) => a.provider === filter) && (
              <p className="notice">No connected accounts for this platform.</p>
            )}
        </>
      )}
    </div>
  );
}
