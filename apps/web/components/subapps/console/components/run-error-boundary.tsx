"use client"

import { Component, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCcw } from "lucide-react"

/**
 * Contains render-time throws inside the run views (graph/timeline/list, HITL panel, etc.) so a
 * single malformed node or an unexpected job-store shape shows a recoverable inline error instead
 * of white-screening the whole console page. There is no other error boundary in this subapp, so
 * without this an exception anywhere in the subtree unmounts everything above it too.
 */
type Props = { children: ReactNode; label?: string }
type State = { error: Error | null }

export class RunErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    // Surface it for debugging without taking down the page.
    console.error("[console/run] render error contained by boundary:", error)
  }

  reset = () => this.setState({ error: null })

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-6 text-center">
          <AlertTriangle className="size-6 text-destructive" />
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {this.props.label ?? "This view hit an unexpected error"}
            </p>
            <p className="max-w-md text-xs text-muted-foreground">
              The run data couldn&apos;t be rendered. The rest of the console is unaffected — retry,
              or switch views. Details are in the browser console.
            </p>
            {this.state.error.message && (
              <pre className="mx-auto mt-1 max-w-md overflow-auto rounded border bg-muted/40 p-2 text-left font-mono text-[10px]">
                {this.state.error.message}
              </pre>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={this.reset}>
            <RefreshCcw className="mr-2 size-4" /> Retry
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
