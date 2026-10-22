"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clapperboard,
  Clock3,
  ExternalLink,
  FileText,
  Globe2,
  Camera as Instagram,
  Layers3,
  LayoutDashboard,
  Link2,
  Mail,
  Menu,
  MoreHorizontal,
  MousePointer2,
  Plus,
  Search,
  Settings2,
  Sparkles,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  modules,
  workspaces,
  isWorkspace,
  type Module,
  type WorkspaceId,
} from "@/lib/workspaces";
import { type ContentItem, csvCell } from "@/lib/content";
import { sampleContent } from "@/lib/sample-data";
import { Editor } from "./editor";
const PerformanceChart = dynamic(
  () => import("./charts").then((m) => m.PerformanceChart),
  {
    ssr: false,
    loading: () => <div className="chart chart-loading">Loading chart…</div>,
  },
);
const nav = [
  { id: "overview", name: "Overview", icon: LayoutDashboard },
  { id: "social", name: "Social media", icon: Instagram },
  { id: "reels", name: "Reel studio", icon: Clapperboard, sub: true },
  { id: "schedule", name: "Content calendar", icon: CalendarDays, sub: true },
  { id: "email", name: "Email marketing", icon: Mail },
  { id: "seo", name: "SEO & insights", icon: Search },
  { id: "blogs", name: "Blogs", icon: FileText },
] as const;
const headings: Record<Module, [string, string]> = {
  overview: [
    "A little overview. A lot of potential.",
    "Your marketing, beautifully in sync.",
  ],
  social: [
    "Make every connection count.",
    "Your social presence, all in one place.",
  ],
  reels: [
    "Small stories. Lasting impressions.",
    "Turn a product into a story worth watching.",
  ],
  schedule: [
    "Good things, planned ahead.",
    "A little structure for your next big idea.",
  ],
  email: [
    "A more personal connection.",
    "Thoughtful campaigns, from inbox to inspiration.",
  ],
  seo: [
    "Be there when they search.",
    "Build a stronger foundation for organic growth.",
  ],
  blogs: [
    "Stories that bring people closer.",
    "Create useful content with your brand at its heart.",
  ],
  settings: [
    "A home for every connection.",
    "Manage your websites and marketing integrations.",
  ],
};
export function Workspace({ module, demo }: { module: Module; demo: boolean }) {
  const [site, setSite] = useState<WorkspaceId>("shapes-and-pieces"),
    [ready, setReady] = useState(false),
    [items, setItems] = useState<ContentItem[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [mobile, setMobile] = useState(false),
    [editor, setEditor] = useState<ContentItem | null>(null),
    [toast, setToast] = useState(""),
    [period, setPeriod] = useState("30"),
    [status, setStatus] = useState("all");
  const base = demo ? "/demo" : "/dashboard",
    brand = workspaces[site];
  useEffect(() => {
    const saved = localStorage.getItem("strozpy:workspace");
    if (saved && isWorkspace(saved)) setSite(saved);
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    localStorage.setItem("strozpy:workspace", site);
    setLoading(true);
    setError("");
    setItems([]);
    let active = true;
    if (demo) {
      try {
        const raw = localStorage.getItem(`strozpy:demo:v1:${site}`);
        setItems(raw ? JSON.parse(raw) : sampleContent(site));
      } catch {
        setItems(sampleContent(site));
      }
      setLoading(false);
      return;
    }
    fetch(`/api/content?workspace=${site}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw Error(data.error);
        return data;
      })
      .then((data) => {
        if (active) setItems(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [site, ready, demo]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  const href = (section: Module) => `${base}/${section}`;
  function create(kind: ContentItem["kind"] = "post", template?: string) {
    setEditor({
      id: crypto.randomUUID(),
      workspace: site,
      kind,
      title: template ?? "",
      body: template
        ? "Scene 1 · Hook (0–3s)\nIntroduce the piece with a close-up and a question.\n\nScene 2 · Detail (3–8s)\nShow the finish, shape and movement in natural light.\n\nScene 3 · Reveal (8–15s)\nShow the complete look and finish with your brand.\n\nCaption\nA little detail. A lasting impression."
        : "",
      channel:
        kind === "email" ? "Email" : kind === "blog" ? "Website" : "Instagram",
      status: "draft",
      scheduledAt: null,
      updatedAt: new Date().toISOString(),
    });
  }
  async function save(item: ContentItem) {
    const next = [item, ...items.filter((c) => c.id !== item.id)];
    if (demo)
      localStorage.setItem(`strozpy:demo:v1:${site}`, JSON.stringify(next));
    else {
      const r = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (!r.ok) throw Error((await r.json()).error);
    }
    setItems(next);
    setToast(
      item.status === "draft"
        ? "Draft saved. Your idea has a home."
        : "Added to your content plan.",
    );
  }
  function exportReport() {
    const rows = [
      ["Workspace", "Type", "Title", "Channel", "Status", "Planned at (UTC)"],
      ...items.map((x) => [
        brand.name,
        x.kind,
        x.title,
        x.channel,
        x.status,
        x.scheduledAt ?? "",
      ]),
    ];
    const blob = new Blob(
      [rows.map((row) => row.map(csvCell).join(",")).join("\r\n")],
      { type: "text/csv;charset=utf-8;" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${site}-content-plan.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setToast("Content plan exported.");
  }
  const filtered = items.filter(
    (x) =>
      (status === "all" || x.status === status) &&
      `${x.title} ${x.channel} ${x.kind}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const relevant = filtered.filter((x) =>
    module === "email"
      ? x.kind === "email"
      : module === "blogs"
        ? x.kind === "blog"
        : module === "reels"
          ? x.kind === "reel"
          : module === "social"
            ? ["reel", "post"].includes(x.kind)
            : true,
  );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {mobile && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <Link className="brand" href={base}>
          <span className="brand-symbol">
            <Layers3 size={23} />
          </span>
          <div>
            strozpy<span>MARKETING MANAGER</span>
          </div>
        </Link>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <div className="website-switch">
          <span
            className={`site-avatar ${site === "foxyavenue" ? "peach" : ""}`}
          >
            {brand.initials}
          </span>
          <label>
            <span className="sr-only">Active website</span>
            <select
              aria-label="Active website"
              value={site}
              onChange={(e) => {
                setSite(e.target.value as WorkspaceId);
                setQuery("");
                setStatus("all");
                setEditor(null);
              }}
            >
              {Object.entries(workspaces).map(([id, w]) => (
                <option key={id} value={id}>
                  {w.name}
                </option>
              ))}
            </select>
            <small>{brand.domain.replace("www.", "")}</small>
          </label>
        </div>
        <div className="nav-label">MANAGE & GROW</div>
        <nav aria-label="Main navigation">
          {nav.map(({ id, name, icon: Icon, ...rest }) => (
            <Link
              key={id}
              className={`nav-item ${"sub" in rest ? "sub" : ""} ${module === id ? "active" : ""}`}
              href={href(id)}
              aria-current={module === id ? "page" : undefined}
              onClick={() => setMobile(false)}
            >
              <Icon size={18} />
              <span>{name}</span>
              {id === "reels" && <span className="new-tag">NEW</span>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="brand-note">
            <span className="note-star">✳</span>
            <strong>Big ideas start small.</strong>
            <p>
              Your next great campaign
              <br />
              is one idea away.
            </p>
            <button onClick={() => create("post")}>
              Let’s create something <ArrowUpRight size={14} />
            </button>
          </div>
          <Link
            href={href("settings")}
            className={`nav-item ${module === "settings" ? "active" : ""}`}
          >
            <Settings2 size={18} />
            Settings & connections
          </Link>
          <button
            className="nav-item help"
            onClick={() =>
              setToast(
                "Start with a draft, plan a date, then connect your channels in Settings.",
              )
            }
          >
            <CircleHelp size={18} />
            Workspace guide
            <ArrowUpRight size={14} />
          </button>
          <div className="profile">
            {demo ? <span className="user-avatar">MA</span> : <UserButton />}
            <div>
              <strong>{demo ? "Manish Arora" : "Your account"}</strong>
              <small>{demo ? "Sample workspace" : "Strozpy Limited"}</small>
            </div>
            {demo ? (
              <Link href="/sign-in" aria-label="Go to sign in">
                <MoreHorizontal size={18} />
              </Link>
            ) : null}
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>
              {nav.find((n) => n.id === module)?.name ?? "Settings"}
            </strong>
          </div>
          <div className="top-actions">
            <span className="workspace-mode">
              <span />
              {demo ? "Sample workspace" : "Private workspace"}
            </span>
            <a
              className="site-link"
              href={`https://${brand.domain}`}
              target="_blank"
              rel="noreferrer"
            >
              Visit website <ArrowUpRight size={14} />
            </a>
          </div>
        </header>
        <main id="main">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {module === "overview"
                  ? "THE BIG PICTURE"
                  : module === "reels"
                    ? "YOUR CREATIVE SPACE"
                    : "YOUR MARKETING WORKSPACE"}
              </div>
              <h1>
                {module === "overview"
                  ? "Marketing overview"
                  : (nav.find((n) => n.id === module)?.name ??
                    "Settings & connections")}
              </h1>
              <p>{headings[module][1]}</p>
            </div>
            <div className="heading-actions">
              {module === "overview" ? (
                <>
                  <button className="button secondary" onClick={exportReport}>
                    <ArrowDownToLine size={15} />
                    Export plan
                  </button>
                  <button className="button primary" onClick={() => create()}>
                    <Plus size={17} />
                    Create content
                  </button>
                </>
              ) : (
                module !== "settings" && (
                  <button
                    className="button primary"
                    onClick={() =>
                      module === "seo"
                        ? window.location.assign(href("settings"))
                        : create(
                            module === "email"
                              ? "email"
                              : module === "blogs"
                                ? "blog"
                                : module === "reels"
                                  ? "reel"
                                  : "post",
                          )
                    }
                  >
                    <Plus size={17} />
                    {module === "email"
                      ? "New campaign"
                      : module === "blogs"
                        ? "Write an article"
                        : module === "reels"
                          ? "Create a reel"
                          : module === "seo"
                            ? "Connect a property"
                            : "Create content"}
                  </button>
                )
              )}
            </div>
          </div>
          {demo && (
            <div className="demo-banner">
              <Sparkles size={14} />
              <span>
                Sample data to explore the possibilities. Your edits stay in
                this browser.
              </span>
              <span className="pill">DEMO</span>
            </div>
          )}
          {error && (
            <div role="alert" className="notice error-notice">
              {error}
            </div>
          )}
          {module === "overview" && (
            <>
              <div className="welcome-banner">
                <div>
                  <span className="greeting">
                    A little overview. A lot of potential.
                  </span>
                  <h2>
                    Let’s make your brand shine<span> ✧</span>
                  </h2>
                  <p>
                    Everything you’re creating for <strong>{brand.name}</strong>
                    , in one place.
                  </p>
                </div>
                <div className="banner-mark">
                  <span>S</span>
                  <Sparkles size={27} />
                </div>
              </div>
              <div className="section-top">
                <h3>
                  At a glance{" "}
                  <span className="muted-badge">
                    {demo ? "Sample insights" : "Awaiting connections"}
                  </span>
                </h3>
                <label className="period">
                  <CalendarDays size={14} />
                  <select
                    aria-label="Reporting period"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                  >
                    <option value="30">Last 30 days</option>
                    <option value="7">Last 7 days</option>
                  </select>
                </label>
              </div>
              <div className="stats-grid">
                <Stat
                  title="Total reach"
                  value={
                    demo
                      ? site === "foxyavenue"
                        ? period === "7"
                          ? "9,420"
                          : "38,420"
                        : period === "7"
                          ? "31,215"
                          : "124,850"
                      : "—"
                  }
                  change="18.6%"
                  note="Across your channels"
                  icon={Users}
                  demo={demo}
                />
                <Stat
                  title="Engagement rate"
                  value={
                    demo ? (site === "foxyavenue" ? "3.82%" : "4.86%") : "—"
                  }
                  change="2.4%"
                  note="Meaningful interactions"
                  icon={MousePointer2}
                  demo={demo}
                />
                <Stat
                  title="Email open rate"
                  value={
                    demo ? (site === "foxyavenue" ? "32.4%" : "42.8%") : "—"
                  }
                  change="6.2%"
                  note="A connection that counts"
                  icon={Mail}
                  demo={demo}
                />
                <Stat
                  title="Organic visits"
                  value={demo ? (period === "7" ? "2,148" : "8,592") : "—"}
                  change="12.8%"
                  note="Discovered through search"
                  icon={Globe2}
                  demo={demo}
                />
              </div>
              <div className="overview-grid">
                <section className="card performance">
                  <div className="card-header">
                    <div>
                      <h3>Marketing performance</h3>
                      <p>Your reach across every touchpoint</p>
                    </div>
                    <span className="muted-badge">
                      {demo ? "SAMPLE" : "NO DATA"}
                    </span>
                  </div>
                  {demo ? (
                    <PerformanceChart
                      factor={
                        (site === "foxyavenue" ? 0.45 : 1) *
                        (period === "7" ? 0.25 : 1)
                      }
                    />
                  ) : (
                    <Empty
                      icon={BarChart3}
                      title="Your story in numbers"
                      text="Connect your analytics providers to see real marketing performance."
                    />
                  )}
                  <div className="chart-legend">
                    <span>
                      <i className="purple-dot" />
                      Social media
                    </span>
                    <span>
                      <i className="gold-dot" />
                      Email
                    </span>
                    <span>
                      <i className="sage-dot" />
                      Organic search
                    </span>
                  </div>
                </section>
                <section className="card channel-card">
                  <div className="card-header">
                    <div>
                      <h3>Your channels</h3>
                      <p>A connected brand experience</p>
                    </div>
                    <Link href={href("settings")} aria-label="Manage channels">
                      <Settings2 size={17} />
                    </Link>
                  </div>
                  {[
                    ["Instagram", "Share your visual story", "ig"],
                    ["TikTok", "Make a little movement", "tt"],
                    ["Email", "Create a personal connection", "em"],
                    ["Website", "Your brand’s home", "web"],
                  ].map(([name, desc, cls]) => (
                    <div className="channel-row" key={name}>
                      <span className={`channel-icon ${cls}`}>
                        {name === "Instagram" ? (
                          <Instagram size={19} />
                        ) : name === "TikTok" ? (
                          <span>♪</span>
                        ) : name === "Email" ? (
                          <Mail size={19} />
                        ) : (
                          <Globe2 size={19} />
                        )}
                      </span>
                      <div>
                        <strong>{name}</strong>
                        <small>{desc}</small>
                      </div>
                      <Link href={href("settings")} className="connect-link">
                        Connect
                        <Plus size={12} />
                      </Link>
                    </div>
                  ))}
                  <Link className="card-footer-link" href={href("settings")}>
                    Manage connections <ArrowRight size={15} />
                  </Link>
                </section>
              </div>
              <div className="overview-grid lower">
                <section className="card">
                  <div className="card-header">
                    <div>
                      <h3>
                        Coming up next{" "}
                        <span className="count">
                          {items.filter((x) => x.status === "planned").length}
                        </span>
                      </h3>
                      <p>A look at what’s on your content plan</p>
                    </div>
                    <Link className="text-link" href={href("schedule")}>
                      View calendar <ArrowRight size={14} />
                    </Link>
                  </div>
                  <ContentTable
                    items={items
                      .filter((x) => x.status === "planned")
                      .slice(0, 3)}
                    loading={loading}
                    onEdit={setEditor}
                  />
                </section>
                <section className="card focus-card">
                  <div className="card-header">
                    <h3>A little focus for today</h3>
                    <Sparkles size={18} />
                  </div>
                  <div className="focus-item">
                    <span className="focus-icon">
                      <Clapperboard size={17} />
                    </span>
                    <div>
                      <strong>Show the details that matter</strong>
                      <p>Create a close-up reel of your favourite piece.</p>
                      <button
                        className="text-link"
                        onClick={() => create("reel")}
                      >
                        Open reel studio <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="focus-item">
                    <span className="focus-icon sage">
                      <Search size={17} />
                    </span>
                    <div>
                      <strong>Help your next customer find you</strong>
                      <p>Connect Search Console to uncover opportunities.</p>
                      <Link className="text-link" href={href("seo")}>
                        Explore SEO <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                </section>
              </div>
            </>
          )}
          {["social", "reels", "email", "blogs"].includes(module) && (
            <>
              <div className="module-intro">
                <div>
                  <span className="eyebrow">{brand.name}</span>
                  <h2>{headings[module][0]}</h2>
                  <p>
                    {module === "reels"
                      ? "Start with a storyboard. Find your hook. Make every second count."
                      : module === "email"
                        ? "Plan something your customers will look forward to opening."
                        : module === "blogs"
                          ? "Inspire, inform and turn a first visit into a lasting connection."
                          : "A thoughtful content mix is the start of a stronger community."}
                  </p>
                </div>
                <span className="module-ornament">
                  {module === "reels" ? (
                    <Clapperboard size={52} />
                  ) : module === "email" ? (
                    <Mail size={52} />
                  ) : module === "blogs" ? (
                    <FileText size={52} />
                  ) : (
                    <Instagram size={52} />
                  )}
                </span>
              </div>
              {module === "reels" && (
                <div className="template-grid">
                  {[
                    [
                      "Product spotlight",
                      "Let the details do the talking.",
                      "15 seconds · 3 scenes",
                      "rose",
                    ],
                    [
                      "The styling edit",
                      "One piece. A whole new perspective.",
                      "30 seconds · 5 scenes",
                      "lilac",
                    ],
                    [
                      "Behind the pieces",
                      "A little story behind the sparkle.",
                      "20 seconds · 4 scenes",
                      "sand",
                    ],
                  ].map(([title, desc, time, color]) => (
                    <button
                      className={`template-card ${color}`}
                      key={title}
                      onClick={() => create("reel", title)}
                    >
                      <span className="template-tag">STORYBOARD TEMPLATE</span>
                      <div className="template-art">
                        <span>✧</span>
                        <span>◌</span>
                        <span>✧</span>
                      </div>
                      <h3>{title}</h3>
                      <p>{desc}</p>
                      <footer>
                        {time}
                        <ArrowUpRight size={18} />
                      </footer>
                    </button>
                  ))}
                </div>
              )}
              {module === "email" && (
                <div className="stats-grid three">
                  <Stat
                    title="Campaigns"
                    value={String(
                      items.filter((x) => x.kind === "email").length,
                    )}
                    note="In this workspace"
                    icon={Mail}
                  />
                  <Stat
                    title="Planned campaigns"
                    value={String(
                      items.filter(
                        (x) => x.kind === "email" && x.status === "planned",
                      ).length,
                    )}
                    note="Waiting for delivery integration"
                    icon={CalendarDays}
                  />
                  <Stat
                    title="Delivery provider"
                    value="Not connected"
                    note="Connect before sending"
                    icon={Link2}
                  />
                </div>
              )}
              {module === "social" && (
                <div className="quick-grid">
                  <Link className="quick-action" href={href("reels")}>
                    <Clapperboard />
                    <div>
                      <h3>Make a little magic</h3>
                      <p>Build your next reel storyboard</p>
                    </div>
                    <ArrowUpRight />
                  </Link>
                  <Link className="quick-action" href={href("schedule")}>
                    <CalendarDays />
                    <div>
                      <h3>Give your ideas a date</h3>
                      <p>See your content calendar</p>
                    </div>
                    <ArrowUpRight />
                  </Link>
                </div>
              )}
              <section className="card content-list">
                <div className="card-header">
                  <div>
                    <h3>
                      {module === "email"
                        ? "Your campaigns"
                        : module === "blogs"
                          ? "Your articles"
                          : module === "reels"
                            ? "Your reel storyboards"
                            : "Your social content"}
                    </h3>
                    <p>
                      {module === "blogs"
                        ? "Drafts and planned articles, ready for your next chapter."
                        : "A home for every idea, from first draft to content plan."}
                    </p>
                  </div>
                  <span className="count">{relevant.length}</span>
                </div>
                <div className="table-toolbar">
                  <div className="tabs">
                    {["all", "draft", "planned"].map((s) => (
                      <button
                        key={s}
                        className={s === status ? "selected" : ""}
                        onClick={() => setStatus(s)}
                      >
                        {s === "all"
                          ? "All content"
                          : s === "draft"
                            ? "Drafts"
                            : "Planned"}
                      </button>
                    ))}
                  </div>
                  <label className="search-field">
                    <Search size={16} />
                    <input
                      aria-label="Search content"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search content…"
                    />
                  </label>
                </div>
                <ContentTable
                  items={relevant}
                  loading={loading}
                  onEdit={setEditor}
                />
              </section>
            </>
          )}
          {module === "schedule" && (
            <Calendar
              items={filtered}
              onEdit={setEditor}
              onCreate={(date) => {
                const planned = new Date(date);
                planned.setHours(12, 0, 0, 0);
                setEditor({
                  id: crypto.randomUUID(),
                  workspace: site,
                  kind: "post",
                  title: "",
                  body: "",
                  channel: "Instagram",
                  status: "draft",
                  scheduledAt: planned.toISOString(),
                  updatedAt: new Date().toISOString(),
                });
              }}
            />
          )}
          {module === "seo" && (
            <SEO demo={demo} site={site} settingsUrl={href("settings")} />
          )}
          {module === "settings" && <Settings site={site} demo={demo} />}
          <footer className="page-footer">
            <span>Made for your next chapter.</span>
            <span>
              Strozpy Limited <span className="footer-dot">·</span> Marketing
              Manager
            </span>
          </footer>
        </main>
      </div>
      {editor && (
        <Editor
          key={editor.id}
          item={editor}
          onClose={() => setEditor(null)}
          onSave={save}
        />
      )}{" "}
      {toast && (
        <div role="status" className="toast">
          <Check size={17} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
function Stat({
  title,
  value,
  note,
  change,
  icon: Icon,
  demo = false,
}: {
  title: string;
  value: string;
  note: string;
  change?: string;
  icon: typeof Users;
  demo?: boolean;
}) {
  return (
    <section className="stat-card">
      <div className="stat-title">
        {title}
        <Icon size={17} />
      </div>
      <div className={`stat-number ${value.length > 10 ? "small" : ""}`}>
        {value}
        {demo && change && (
          <span className="trend">
            <TrendingUp size={12} />
            {change}
          </span>
        )}
      </div>
      <small>{note}</small>
      <div className="stat-accent" />
    </section>
  );
}
function Empty({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Users;
  title: string;
  text: string;
}) {
  return (
    <div className="empty">
      <span>
        <Icon size={23} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function ContentTable({
  items,
  loading,
  onEdit,
}: {
  items: ContentItem[];
  loading: boolean;
  onEdit: (item: ContentItem) => void;
}) {
  if (loading) return <div className="empty">Loading your content…</div>;
  if (!items.length)
    return (
      <Empty
        icon={FileText}
        title="A fresh page of possibilities"
        text="Create your first piece of content, or adjust your filters."
      />
    );
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>CONTENT</th>
            <th>CHANNEL</th>
            <th>PLANNED FOR</th>
            <th>STATUS</th>
            <th>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <button className="content-title" onClick={() => onEdit(item)}>
                  <span className={`content-thumb ${item.kind}`}>
                    {item.kind === "reel" ? (
                      <Clapperboard size={18} />
                    ) : item.kind === "email" ? (
                      <Mail size={18} />
                    ) : item.kind === "blog" ? (
                      <FileText size={18} />
                    ) : (
                      <Instagram size={18} />
                    )}
                  </span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>
                      {item.kind === "reel"
                        ? "Reel storyboard"
                        : item.kind === "email"
                          ? "Email campaign"
                          : item.kind === "blog"
                            ? "Blog article"
                            : "Social post"}
                    </small>
                  </span>
                </button>
              </td>
              <td>
                <span className="channel-label">{item.channel}</span>
              </td>
              <td className="date-cell">
                {item.scheduledAt
                  ? new Date(item.scheduledAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                    })
                  : "No date"}
                <small>
                  {item.scheduledAt
                    ? new Date(item.scheduledAt).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Ready when you are"}
                </small>
              </td>
              <td>
                <span className={`status ${item.status}`}>
                  <i />
                  {item.status === "planned" ? "Planned" : "Draft"}
                </span>
              </td>
              <td>
                <button
                  className="icon-button"
                  aria-label={`Edit ${item.title}`}
                  onClick={() => onEdit(item)}
                >
                  <MoreHorizontal size={17} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Calendar({
  items,
  onEdit,
  onCreate,
}: {
  items: ContentItem[];
  onEdit: (item: ContentItem) => void;
  onCreate: (date: Date) => void;
}) {
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const start = new Date(month);
  start.setDate(1 - ((month.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  return (
    <section className="card calendar-card">
      <div className="card-header">
        <div>
          <h3>
            {month.toLocaleDateString("en-GB", {
              month: "long",
              year: "numeric",
            })}
          </h3>
          <p>Planned content · shown in your browser’s local time</p>
        </div>
        <div className="calendar-controls">
          <button
            className="button secondary"
            onClick={() =>
              setMonth(
                new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              )
            }
          >
            Today
          </button>
          <button
            className="icon-button"
            aria-label="Previous month"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
            }
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="Next month"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
            }
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div className="calendar-scroll">
        <div className="calendar-grid">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="calendar-day-name">
              {d}
            </div>
          ))}
          {days.map((d) => (
            <div
              key={d.toISOString()}
              className={`calendar-day ${d.getMonth() !== month.getMonth() ? "outside" : ""}`}
            >
              <button
                className={`day-number ${d.toDateString() === new Date().toDateString() ? "today" : ""}`}
                aria-label={`Create content for ${d.toDateString()}`}
                onClick={() => onCreate(d)}
              >
                {d.getDate()}
              </button>
              {items
                .filter(
                  (x) =>
                    x.status === "planned" &&
                    x.scheduledAt &&
                    new Date(x.scheduledAt).toDateString() === d.toDateString(),
                )
                .map((x) => (
                  <button
                    key={x.id}
                    className={`calendar-event ${x.kind}`}
                    onClick={() => onEdit(x)}
                  >
                    <small>{x.channel}</small>
                    {x.title}
                  </button>
                ))}
            </div>
          ))}
        </div>
      </div>
      <div className="calendar-foot">
        <span>
          <i className="purple-dot" />
          Social & reels
        </span>
        <span>
          <i className="gold-dot" />
          Email
        </span>
        <span>
          <i className="sage-dot" />
          Blogs
        </span>
        <small>Planned content is not automatically published.</small>
      </div>
    </section>
  );
}
function SEO({
  demo,
  site,
  settingsUrl,
}: {
  demo: boolean;
  site: WorkspaceId;
  settingsUrl: string;
}) {
  const [tab, setTab] = useState("Overview");
  return (
    <>
      <div className="module-intro">
        <div>
          <span className="eyebrow">{workspaces[site].domain}</span>
          <h2>Small improvements. Greater discoverability.</h2>
          <p>
            Keep technical health, keywords and content opportunities in view.
          </p>
        </div>
        <Search className="module-ornament" size={52} />
      </div>
      <div className="tabs seo-tabs">
        {["Overview", "Keywords", "Technical SEO", "On-page SEO"].map((t) => (
          <button
            className={tab === t ? "selected" : ""}
            key={t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {demo ? (
        <>
          <div className="stats-grid three">
            <Stat
              title="Sample health score"
              value="86 / 100"
              note="Illustrative, not a website audit"
              icon={Activity}
            />
            <Stat
              title="Sample ranking keywords"
              value="248"
              note="Connect Search Console for real data"
              icon={Search}
            />
            <Stat
              title="Sample organic clicks"
              value="8,592"
              note="Illustrative last 30 days"
              icon={MousePointer2}
            />
          </div>
          <section className="card">
            <div className="card-header">
              <div>
                <h3>
                  {tab === "Keywords"
                    ? "Keyword opportunities"
                    : tab === "Technical SEO"
                      ? "Technical checklist"
                      : tab === "On-page SEO"
                        ? "Page optimisation"
                        : "Your SEO opportunities"}
                </h3>
                <p>
                  Illustrative recommendations · no live audit has been
                  performed
                </p>
              </div>
              <span className="muted-badge">SAMPLE</span>
            </div>
            {(tab === "Keywords"
              ? [
                  [
                    "Indian jewellery UK",
                    "Explore a collection page around this keyword.",
                  ],
                  [
                    "Statement earrings",
                    "Match page titles to the way customers search.",
                  ],
                  [
                    "Kundan necklace set",
                    "Create a useful buying and styling guide.",
                  ],
                ]
              : tab === "Technical SEO"
                ? [
                    [
                      "Sitemap & indexation",
                      "Check submitted sitemaps and indexing coverage.",
                    ],
                    [
                      "Core Web Vitals",
                      "Review loading speed, responsiveness and layout stability.",
                    ],
                    [
                      "Canonical URLs & redirects",
                      "Check duplicate pages and broken links.",
                    ],
                  ]
                : tab === "On-page SEO"
                  ? [
                      [
                        "Page titles & descriptions",
                        "Give every collection a unique, descriptive search snippet.",
                      ],
                      [
                        "Product structured data",
                        "Validate product, offer and availability markup.",
                      ],
                      [
                        "Images & accessibility",
                        "Add meaningful alt text and serve properly sized images.",
                      ],
                    ]
                  : [
                      [
                        "Give each collection its own story",
                        "Review missing or duplicate meta descriptions.",
                      ],
                      [
                        "Make your images work a little harder",
                        "Check descriptive alt text across product imagery.",
                      ],
                      [
                        "Build links between your ideas",
                        "Connect helpful articles to relevant collections.",
                      ],
                    ]
            ).map(([title, desc], i) => (
              <div className="seo-row" key={title}>
                <span className="seo-number">0{i + 1}</span>
                <div>
                  <strong>{title}</strong>
                  <p>{desc}</p>
                </div>
                <span className="status draft">To review</span>
              </div>
            ))}
          </section>
        </>
      ) : (
        <section className="card">
          <Empty
            icon={Search}
            title="Your search story starts with a connection"
            text="Connect Google Search Console and an SEO crawler to see indexing, keywords, page health and recommendations."
          />
          <div className="center-action">
            <Link className="button primary" href={settingsUrl}>
              View connections <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
function Settings({ site, demo }: { site: WorkspaceId; demo: boolean }) {
  return (
    <>
      <section className="card">
        <div className="card-header">
          <div>
            <h3>Your websites</h3>
            <p>Two brands. One thoughtful workspace.</p>
          </div>
          <span className="muted-badge">2 WORKSPACES</span>
        </div>
        {Object.entries(workspaces).map(([id, w]) => (
          <div className="website-row" key={id}>
            <span
              className={`site-avatar ${id === "foxyavenue" ? "peach" : ""}`}
            >
              {w.initials}
            </span>
            <div>
              <strong>{w.name}</strong>
              <p>{w.domain}</p>
            </div>
            <span className={`status ${id === site ? "planned" : "draft"}`}>
              {id === site ? "Active workspace" : "Available"}
            </span>
            <a
              aria-label={`Visit ${w.name}`}
              href={`https://${w.domain}`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={17} />
            </a>
          </div>
        ))}
      </section>
      <div className="section-top settings-heading">
        <h3>Make your connections</h3>
        <span className="muted-badge">
          FOR {workspaces[site].name.toUpperCase()}
        </span>
      </div>
      <div className="integration-grid">
        {[
          [
            "Instagram & Facebook",
            "Social publishing",
            "Meta Business permissions and OAuth are required.",
          ],
          [
            "TikTok",
            "Video publishing",
            "Connect a TikTok developer app with approved posting access.",
          ],
          [
            "Email provider",
            "Campaign delivery",
            "Configure sender verification, consent and unsubscribe handling.",
          ],
          [
            "Google Search Console",
            "Search performance",
            "Authorize property access to import clicks and keyword data.",
          ],
          [
            "Google Analytics",
            "Website analytics",
            "Connect a GA4 property for traffic and conversion reporting.",
          ],
          [
            "Shopify / CMS",
            "Blog publishing",
            "Connect your store or CMS to publish approved articles.",
          ],
        ].map(([name, category, detail]) => (
          <article className="card integration" key={name}>
            <div className="integration-top">
              <span className="focus-icon">
                <Link2 size={21} />
              </span>
              <span className="status draft">Not connected</span>
            </div>
            <h3>{name}</h3>
            <span className="integration-category">{category}</span>
            <p>{detail}</p>
            <details>
              <summary>
                Connection requirements <ChevronRight size={14} />
              </summary>
              <p>
                Provider integration is a next-phase extension. Add server-side
                credentials, OAuth callback, website-scoped token storage and
                delivery/webhook handlers. See <code>docs/architecture.md</code>{" "}
                in the repository.
              </p>
            </details>
          </article>
        ))}
      </div>
      <div className="notice settings-note">
        <ShieldLabel />{" "}
        {demo
          ? "You are exploring a public sample workspace. No accounts are connected."
          : "Workspace access is restricted to authorized Clerk user IDs. Provider credentials stay on the server."}
      </div>
    </>
  );
}
function ShieldLabel() {
  return <Check size={16} />;
}
