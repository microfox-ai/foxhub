"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { approveCliAuth } from "./actions";

type Status = "idle" | "loading" | "done" | "error";

function CliAuthInner() {
  const code = (useSearchParams().get("code") || "").trim();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function onApprove() {
    setStatus("loading");
    setError("");
    const result = await approveCliAuth(code);
    if (result.ok) {
      setStatus("done");
    } else {
      setError(result.error || "Approval failed");
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-2xl font-semibold">Authorize the Microfox CLI</h1>

      {!code ? (
        <p className="text-sm text-red-500">
          No authorization code found. Re-run <code>microfox login</code> and open the link it prints.
        </p>
      ) : status === "done" ? (
        <p className="text-sm text-green-600">
          ✅ Approved. You can return to your terminal — the CLI is now signed in.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            A device is requesting access to your Microfox account. Confirm the code below matches the
            one shown in your terminal, then approve.
          </p>
          <div className="rounded-md border px-4 py-2 font-mono text-lg tracking-widest">{code}</div>
          {status === "error" && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="button"
            onClick={onApprove}
            disabled={status === "loading"}
            className="rounded-md bg-black px-6 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {status === "loading" ? "Approving…" : "Approve CLI access"}
          </button>
          <p className="text-xs text-muted-foreground">
            Only approve if you just started <code>microfox login</code> yourself.
          </p>
        </>
      )}
    </div>
  );
}

export default function CliAuthPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-sm">Loading…</div>}>
      <CliAuthInner />
    </Suspense>
  );
}
