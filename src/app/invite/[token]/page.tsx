import { Suspense } from "react";

import { InviteAcceptForm } from "@/components/invites/invite-accept-form";

type Props = { params: Promise<{ token: string }> };

export default async function InvitePage({ params }: Props) {
  const { token } = await params;

  return (
    <div className="relative z-0 flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-rise">
        <div className="mb-8 text-center">
          <p className="font-display text-4xl font-bold tracking-tight text-foreground">
            Echelon
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Accept your coaching invite and set a password.
          </p>
        </div>
        <Suspense
          fallback={
            <p className="text-center text-sm text-muted-foreground">Loading invite…</p>
          }
        >
          <InviteAcceptForm token={token} />
        </Suspense>
      </div>
    </div>
  );
}
