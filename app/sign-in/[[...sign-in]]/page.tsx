import { LoginForm } from "@/components/login-form";
import Link from "next/link";
import { Sparkles, ArrowUpRight, Layers3, ShieldCheck } from "lucide-react";
import { authConfigured } from "@/lib/auth";
export default function Login() {
  return (
    <main className="login-layout">
      <section className="login-story">
        <div className="brand">
          <span className="brand-symbol">
            <Layers3 size={23} />
          </span>
          <div>
            strozpy<span>MARKETING MANAGER</span>
          </div>
        </div>
        <div className="login-pitch">
          <span className="eyebrow light">A LITTLE MORE CONNECTED</span>
          <h1>
            Two brands.
            <br />
            Endless possibilities.
            <br />
            <em>One workspace.</em>
          </h1>
          <p>
            Give your ideas a home. Bring your content, campaigns and growth
            together with Strozpy Limited.
          </p>
          <div className="login-mini">
            <Sparkles />
            <div>
              <strong>Good marketing starts here.</strong>
              <span>Create. Plan. Connect. Grow.</span>
            </div>
            <ArrowUpRight />
          </div>
        </div>
        <small>© {new Date().getFullYear()} Strozpy Limited</small>
      </section>
      <section className="login-form">
        <div>
          <span className="eyebrow">YOUR NEXT CHAPTER</span>
          <h2>Welcome back.</h2>
          <p>Sign in to your marketing workspace.</p>
          <LoginForm configured={authConfigured()} />
          {process.env.ENABLE_DEMO === "true" && (
            <Link className="button secondary demo-link" href="/demo">
              Explore the sample workspace <ArrowUpRight size={16} />
            </Link>
          )}
          <small className="login-foot">
            Private workspace · Authorized team members only
          </small>
        </div>
      </section>
    </main>
  );
}
