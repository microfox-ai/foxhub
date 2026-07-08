/**
 * Visual treatment for a deployment status — a single source of truth so the
 * deployments list, detail panel, and badges all read the same colors/labels.
 *
 * Colors use Tailwind utility classes (theme-aware via CSS variables where
 * possible) rather than hard-coded hex, so dark mode keeps working.
 */

export type DeploymentStatusVisual = {
  /** Human label, Title Cased. */
  label: string
  /** Whether this status is still progressing (drives the pulsing dot + polling). */
  active: boolean
  /** Tailwind classes for a small status dot. */
  dotClass: string
  /** Tailwind classes for a pill/badge background + text + border. */
  badgeClass: string
}

const STATUS_MAP: Record<string, DeploymentStatusVisual> = {
  queued: {
    label: "Queued",
    active: true,
    dotClass: "bg-slate-400",
    badgeClass:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  },
  compiling: {
    label: "Compiling",
    active: true,
    dotClass: "bg-amber-500 animate-pulse",
    badgeClass:
      "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
  },
  deploying: {
    label: "Deploying",
    active: true,
    dotClass: "bg-blue-500 animate-pulse",
    badgeClass:
      "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
  },
  deployed: {
    label: "Deployed",
    active: true,
    dotClass: "bg-blue-500 animate-pulse",
    badgeClass:
      "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
  },
  post_deployment: {
    label: "Post-deployment",
    active: true,
    dotClass: "bg-indigo-500 animate-pulse",
    badgeClass:
      "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-900",
  },
  completed: {
    label: "Completed",
    active: false,
    dotClass: "bg-emerald-500",
    badgeClass:
      "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
  },
  failed: {
    label: "Failed",
    active: false,
    dotClass: "bg-red-500",
    badgeClass:
      "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
  },
  stopped: {
    label: "Stopped",
    active: false,
    dotClass: "bg-orange-500",
    badgeClass:
      "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-900",
  },
  blocked: {
    label: "Blocked",
    active: false,
    dotClass: "bg-rose-500",
    badgeClass:
      "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900",
  },
  archived: {
    label: "Archived",
    active: false,
    dotClass: "bg-muted-foreground/50",
    badgeClass: "bg-muted text-muted-foreground border-border",
  },
}

const FALLBACK: DeploymentStatusVisual = {
  label: "Unknown",
  active: false,
  dotClass: "bg-muted-foreground/50",
  badgeClass: "bg-muted text-muted-foreground border-border",
}

export function getDeploymentStatusVisual(
  status?: string | null,
): DeploymentStatusVisual {
  if (!status) return FALLBACK
  return STATUS_MAP[status] ?? { ...FALLBACK, label: status }
}
