import { Suspense } from "react";

import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="relative z-0 flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-rise">
        <div className="mb-8 text-center">
          <p className="font-display text-4xl font-bold tracking-tight text-foreground">
            Echelon
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to log training, nutrition, and check-ins.
          </p>
        </div>
        <Suspense fallback={<p className="text-center text-sm text-muted-foreground">Loading…</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
