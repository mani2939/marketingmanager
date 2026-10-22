"use client";
import { useEffect, useRef, useState } from "react";
import {
  X,
  Save,
  CalendarDays,
  Play,
  Mail,
  FileText,
  ImageIcon,
} from "lucide-react";
import type { ContentItem } from "@/lib/content";
import { contentSchema } from "@/lib/content";
import { workspaces } from "@/lib/workspaces";
export function Editor({
  item,
  onClose,
  onSave,
}: {
  item: ContentItem;
  onClose: () => void;
  onSave: (item: ContentItem) => Promise<void>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(item.title),
    [body, setBody] = useState(item.body),
    [channel, setChannel] = useState(item.channel),
    [date, setDate] = useState(
      item.scheduledAt ? localDate(item.scheduledAt) : "",
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  async function save(status: ContentItem["status"]) {
    setError("");
    const parsed = contentSchema.safeParse({
      ...item,
      title,
      body,
      channel,
      status,
      scheduledAt: date ? new Date(date).toISOString() : null,
      updatedAt: new Date().toISOString(),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      await onSave(parsed.data);
      onClose();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  const Icon = { post: ImageIcon, reel: Play, email: Mail, blog: FileText }[
    item.kind
  ];
  return (
    <dialog
      ref={ref}
      className="editor"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="editor-heading">
        <div>
          <span className="eyebrow">{workspaces[item.workspace].name}</span>
          <h2>
            <Icon size={20} /> {item.title ? "Edit" : "Create"} {item.kind}
          </h2>
        </div>
        <button
          aria-label="Close editor"
          className="icon-button"
          disabled={busy}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <div className="editor-body">
        <div className="editor-fields">
          <label>
            {item.kind === "email" ? "Subject line" : "Title"}
            <input
              autoFocus
              maxLength={160}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your next idea a name"
            />
          </label>
          <label>
            {item.kind === "reel"
              ? "Storyboard & caption"
              : item.kind === "blog"
                ? "Article content"
                : "Message"}
            <textarea
              rows={9}
              maxLength={20000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={
                item.kind === "reel"
                  ? "Scene 1 · The hook (0–3s)\nScene 2 · The close-up (3–8s)\nScene 3 · The reveal (8–15s)\n\nCaption…"
                  : "Tell your story…"
              }
            />
          </label>
          <div className="form-row">
            <label>
              Channel
              <select
                value={channel}
                onChange={(e) =>
                  setChannel(e.target.value as ContentItem["channel"])
                }
              >
                {(item.kind === "email"
                  ? ["Email"]
                  : item.kind === "blog"
                    ? ["Website"]
                    : ["Instagram", "TikTok", "Facebook"]
                ).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Planned date & time
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
          </div>
          <p className="field-note">
            Time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}. Saved
            in UTC.
          </p>
          <div className="notice">
            Planning saves a date to your calendar. For email, use the Resend
            controls on the Email marketing page to send or schedule delivery.
          </div>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
        </div>
        <aside className="editor-preview">
          <span className="eyebrow">CONTENT PREVIEW</span>
          <div className="preview-card">
            <div className="preview-brand">
              <span className="site-avatar">
                {workspaces[item.workspace].initials}
              </span>
              <strong>{workspaces[item.workspace].name}</strong>
            </div>
            {item.kind === "reel" && (
              <div className="reel-cover">
                <span>
                  YOUR NEXT
                  <br />
                  <em>beautiful idea.</em>
                </span>
                <Play size={32} />
                <small>9:16 · Storyboard preview</small>
              </div>
            )}
            <h3>{title || "Your story starts here"}</h3>
            <p>{body || "Your content preview will appear as you write."}</p>
          </div>
          <small>Text preview · no media rendered or published</small>
        </aside>
      </div>
      <footer className="editor-footer">
        <button
          className="button secondary"
          onClick={() => save("draft")}
          disabled={busy}
        >
          <Save size={16} />
          {busy ? "Saving…" : "Save draft"}
        </button>
        <button
          className="button primary"
          onClick={() => save("planned")}
          disabled={busy}
        >
          <CalendarDays size={16} />
          Add to plan
        </button>
      </footer>
    </dialog>
  );
}
function localDate(value: string) {
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
