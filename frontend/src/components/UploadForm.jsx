import { useState } from "react";

export default function UploadForm({ onAnalyze, onUseDemo, loading }) {
  const [massBalanceFile, setMassBalanceFile] = useState(null);
  const [designCriteriaFile, setDesignCriteriaFile] = useState(null);
  const [revisedFile, setRevisedFile] = useState(null);

  const canSubmit = massBalanceFile && designCriteriaFile && !loading;

  return (
    <div className="upload-card">
      <h2>Provide your data</h2>
      <p className="upload-hint">
        Upload your mass-balance and design-criteria spreadsheets (same template as the
        NDDB demo files) to auto-draft the reception &amp; separation P&amp;ID from your
        real numbers.
      </p>

      <div className="upload-row">
        <label>
          Mass balance file (.xlsx)
          <input type="file" accept=".xlsx"
                 onChange={(e) => setMassBalanceFile(e.target.files[0] || null)} />
        </label>
        <label>
          Design criteria file (.xlsx)
          <input type="file" accept=".xlsx"
                 onChange={(e) => setDesignCriteriaFile(e.target.files[0] || null)} />
        </label>
        <label>
          Revised design criteria (optional — to compare two versions)
          <input type="file" accept=".xlsx"
                 onChange={(e) => setRevisedFile(e.target.files[0] || null)} />
        </label>
      </div>

      <div className="upload-actions">
        <button
          className="primary"
          disabled={!canSubmit}
          onClick={() => onAnalyze({ massBalanceFile, designCriteriaFile, revisedFile })}
        >
          {loading ? "Analyzing…" : "Analyze"}
        </button>
        <button className="secondary" disabled={loading} onClick={onUseDemo}>
          Use demo data instead
        </button>
      </div>
    </div>
  );
}
