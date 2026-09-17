const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export async function analyze({ massBalanceFile, designCriteriaFile, revisedFile }) {
  const form = new FormData();
  form.append("mass_balance_file", massBalanceFile);
  form.append("design_criteria_file", designCriteriaFile);
  if (revisedFile) form.append("design_criteria_revised_file", revisedFile);

  const res = await fetch(`${BASE_URL}/api/analyze`, { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Analysis failed");
  }
  return res.json();
}

export async function analyzeDemo() {
  const res = await fetch(`${BASE_URL}/api/analyze-demo`, { method: "POST" });
  if (!res.ok) throw new Error("Demo analysis failed");
  return res.json();
}

export function dxfDownloadUrl(analysisId, revision) {
  return `${BASE_URL}/api/dxf/${analysisId}/${revision}`;
}
