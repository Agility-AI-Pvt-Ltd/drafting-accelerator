import { useState } from "react";
import { analyze, analyzeDemo, dxfDownloadUrl } from "./api";
import UploadForm from "./components/UploadForm";
import DiagramView from "./components/DiagramView";
import EquipmentTable from "./components/EquipmentTable";

export default function App() {
  const [status, setStatus] = useState("idle"); // idle | loading | results | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [revision, setRevision] = useState("A");

  async function runAnalyze(files) {
    setStatus("loading");
    setError(null);
    try {
      const data = await analyze(files);
      setResult(data);
      setRevision("A");
      setStatus("results");
    } catch (e) {
      setError(e.message);
      setStatus("error");
    }
  }

  async function runDemo() {
    setStatus("loading");
    setError(null);
    try {
      const data = await analyzeDemo();
      setResult(data);
      setRevision("A");
      setStatus("results");
    } catch (e) {
      setError(e.message);
      setStatus("error");
    }
  }

  function reset() {
    setStatus("idle");
    setResult(null);
    setError(null);
  }

  const activeRevision = result ? (revision === "A" ? result.rev_a : result.rev_b) : null;

  return (
    <div className="wrap">
      <h1>Design Drafting Accelerator</h1>
      <div className="subtitle">Upload your data → the tool analyzes it → see the auto-drafted P&amp;ID</div>

      {(status === "idle" || status === "loading" || status === "error") && (
        <UploadForm onAnalyze={runAnalyze} onUseDemo={runDemo} loading={status === "loading"} />
      )}

      {status === "error" && <div className="error-note">{error}</div>}

      {status === "results" && result && (
        <>
          <div className="results-header">
            <div>
              <div className="result-title">{result.title}</div>
              <div className="source-note">
                Reception-line source: <i>&quot;{result.source_note}&quot;</i>
              </div>
            </div>
            <button className="secondary" onClick={reset}>Analyze different data</button>
          </div>

          <div className="stats">
            <div className="stat">
              <div className="num">{result.mass_balance.milk_in_l.toLocaleString()}</div>
              <div className="label">Litres milk in (mass balance)</div>
            </div>
            <div className="stat">
              <div className="num">
                {(result.mass_balance.fat_pct * 100).toFixed(1)}% / {(result.mass_balance.snf_pct * 100).toFixed(1)}%
              </div>
              <div className="label">Fat / SNF content</div>
            </div>
            <div className="stat">
              <div className="num">{result.mass_balance.products.length}</div>
              <div className="label">Product streams split out</div>
            </div>
            <div className="stat">
              <div className="num">{activeRevision.equipment.length}</div>
              <div className="label">Equipment units drawn (Rev {revision})</div>
            </div>
          </div>

          {result.rev_b && (
            <div className="toggle-row">
              <button className={revision === "A" ? "active" : ""} onClick={() => setRevision("A")}>
                Rev A — current
              </button>
              <button className={revision === "B" ? "active" : ""} onClick={() => setRevision("B")}>
                Rev B — {result.rev_b.capacity_label !== result.rev_a.capacity_label ? "revised" : "expanded"}
              </button>
              <a className="download-btn" href={dxfDownloadUrl(result.analysis_id, revision)}>
                Download DXF (Rev {revision})
              </a>
            </div>
          )}
          {!result.rev_b && (
            <div className="toggle-row">
              <a className="download-btn" href={dxfDownloadUrl(result.analysis_id, "A")}>
                Download DXF
              </a>
            </div>
          )}

          <div className="results-stack">
            <div className="card diagram-card">
              <div className="card-label">P&amp;ID diagram</div>
              <DiagramView equipment={activeRevision.equipment} />
            </div>
            <div className="card table-card">
              <div className="card-label">Equipment list</div>
              <EquipmentTable equipment={activeRevision.equipment} />
            </div>
          </div>

          <div className="footer-note">
            Layout is hand-placed for this process (reception → separation → processing) —
            not yet a general arrangement algorithm. Equipment counts, specs and the
            revision diff above are all computed live from your uploaded data.
          </div>
        </>
      )}
    </div>
  );
}
