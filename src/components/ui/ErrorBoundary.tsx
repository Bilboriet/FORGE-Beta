import React from "react";

type Props = {
  children: React.ReactNode;
  label?: string;
};

type State = { error: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", this.props.label ?? "boundary", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16, display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 950, color: "var(--red)" }}>
            Noe krasjet{this.props.label ? ` i ${this.props.label}` : ""}.
          </div>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>
            Åpne DevTools Console for full stacktrace.
          </div>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 12,
              background: "var(--surface2)",
              color: "var(--text)",
              fontSize: 12,
            }}
          >
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              justifySelf: "start",
              border: "1px solid rgba(var(--accentHot-rgb),0.35)",
              background: "rgba(var(--accentHot-rgb),0.14)",
              color: "var(--text)",
              borderRadius: 12,
              padding: "10px 12px",
              cursor: "pointer",
              fontWeight: 950,
            }}
          >
            Prøv igjen
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
