"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="access-denied">
      <h1>Something interrupted your workspace.</h1>
      <p>Please try again. Your saved content is safe.</p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
