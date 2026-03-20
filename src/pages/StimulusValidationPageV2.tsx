import { useMemo } from "react";
import {
  runStimulusValidationHarnessV2,
  type StimulusValidationReportV2,
} from "../data/stimulusValidationHarnessV2";

function SectionTitle({ children }: { children: string }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.2, color: "var(--text-strong)" }}>{children}</div>
  );
}

function renderFamilyOutputs(report: StimulusValidationReportV2) {
  if (report.result.familyOutputs.length === 0) {
    return <div style={{ color: "var(--muted)", fontSize: 13 }}>None</div>;
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {report.result.familyOutputs.map((family) => (
        <div key={family.familyKey} style={{ display: "grid", gap: 4 }}>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>{family.familyKey}</div>
          {family.rows.length > 0 ? (
            family.rows.map((row) => (
              <div
                key={`${family.familyKey}-${row.analysisKey}`}
                style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}
              >
                <span>{row.analysisKey}</span>
                <span>{row.value.toFixed(1)}</span>
              </div>
            ))
          ) : (
            <div style={{ color: "var(--muted)", fontSize: 13 }}>Empty</div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function StimulusValidationPageV2() {
  const reports = useMemo(() => runStimulusValidationHarnessV2(), []);

  return (
    <div className="forgePage" style={{ padding: "24px 16px 120px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: 16 }}>
        <header style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1.2 }}>
            Developer Tool
          </div>
          <h1 style={{ margin: 0, fontSize: 28, color: "var(--text-strong)" }}>Stimulus Validation Harness V2</h1>
          <p style={{ margin: 0, color: "var(--muted)", maxWidth: 760 }}>
            Runs representative validation sessions through <code>stimulusEngineV2</code> so we can inspect
            analysis totals, family outputs, redistribution behavior, and obvious mismatches before deeper tuning.
          </p>
        </header>

        <div style={{ display: "grid", gap: 16 }}>
          {reports.map((report) => (
            <section
              key={report.testCase.id}
              style={{
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
                padding: 16,
                background: "rgba(255,255,255,0.02)",
                display: "grid",
                gap: 14,
              }}
            >
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1 }}>
                  {report.testCase.id}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-strong)" }}>{report.testCase.label}</div>
                <div style={{ color: "var(--muted)", fontSize: 14 }}>{report.testCase.description}</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                <div style={{ display: "grid", gap: 8 }}>
                  <SectionTitle>Input Sets</SectionTitle>
                  {report.testCase.sets.map((set, index) => (
                    <div
                      key={`${report.testCase.id}-set-${index}`}
                      style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}
                    >
                      <span>{set.exerciseId}</span>
                      <span>{`${set.reps ?? 0} x ${set.load ?? 0}`}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <SectionTitle>Top Analysis Totals</SectionTitle>
                  {report.topAnalysisTotals.length > 0 ? (
                    report.topAnalysisTotals.slice(0, 8).map((row) => (
                      <div
                        key={`${report.testCase.id}-analysis-${row.analysisKey}`}
                        style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}
                      >
                        <span>{row.analysisKey}</span>
                        <span>{row.value.toFixed(1)}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: "var(--muted)", fontSize: 13 }}>None</div>
                  )}
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <SectionTitle>Confidence Summary</SectionTitle>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span>high</span>
                    <span>{report.result.confidenceSummary.high.toFixed(1)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span>medium</span>
                    <span>{report.result.confidenceSummary.medium.toFixed(1)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span>low</span>
                    <span>{report.result.confidenceSummary.low.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <SectionTitle>Family Outputs</SectionTitle>
                {renderFamilyOutputs(report)}
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <SectionTitle>Expected Behavior</SectionTitle>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  Dominant outputs: {report.testCase.expectations.dominantAnalysisKeys.join(", ")}
                </div>
                {(report.testCase.expectations.expectedFamilyKeys ?? []).length > 0 ? (
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>
                    Expected families: {report.testCase.expectations.expectedFamilyKeys?.join(", ")}
                  </div>
                ) : null}
                {(report.testCase.expectations.helperBucketsShouldBeRedistributed ?? []).length > 0 ? (
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>
                    Helper buckets to redistribute: {report.testCase.expectations.helperBucketsShouldBeRedistributed?.join(", ")}
                  </div>
                ) : null}
                <ul style={{ margin: 0, paddingLeft: 18, color: "var(--text)", fontSize: 13, display: "grid", gap: 4 }}>
                  {report.testCase.expectations.notes.map((note, index) => (
                    <li key={`${report.testCase.id}-note-${index}`}>{note}</li>
                  ))}
                </ul>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <SectionTitle>Warnings</SectionTitle>
                {report.warnings.length > 0 ? (
                  report.warnings.map((warning) => (
                    <div
                      key={warning.id}
                      style={{
                        fontSize: 13,
                        color: "#ffd8a8",
                        background: "rgba(255, 168, 0, 0.08)",
                        border: "1px solid rgba(255, 168, 0, 0.18)",
                        borderRadius: 10,
                        padding: "8px 10px",
                      }}
                    >
                      {warning.message}
                    </div>
                  ))
                ) : (
                  <div style={{ color: "var(--muted)", fontSize: 13 }}>None</div>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
