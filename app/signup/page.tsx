"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup, type SignupState } from "./actions";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState<SignupState, FormData>(
    signup,
    null,
  );

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-sm p-6 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-brand-dark">Mealplan</h1>
          <p className="mt-1 text-sm text-muted">Create your account.</p>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="label" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              className="input"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="input"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              className="input"
              placeholder="••••••••"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-danger" role="alert">
              {state.error}
            </p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={pending}>
            {pending ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-brand-dark hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
