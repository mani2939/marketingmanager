import Link from "next/link";
export default function NotFound() {
  return (
    <main className="access-denied">
      <span className="eyebrow">404</span>
      <h1>A little off the path.</h1>
      <p>This page isn’t available.</p>
      <Link className="button primary" href="/dashboard">
        Back to your workspace
      </Link>
    </main>
  );
}
