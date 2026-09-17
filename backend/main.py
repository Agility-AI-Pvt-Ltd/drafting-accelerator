import os
import tempfile
import uuid

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from parser import (build_equipment_list, diff_equipment, extract_mass_balance,
                     parse_design_criteria)
from dxf_export import build_dxf

app = FastAPI(title="Design Drafting Accelerator API")

# Comma-separated origins, e.g. "https://your-app.vercel.app,http://localhost:5173"
_cors = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
)
allow_origins = [o.strip() for o in _cors.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
DEMO_MASS_BALANCE = os.path.join(DATA_DIR, "Mass_Balance_Dummy_Data.xlsx")
DEMO_DESIGN_CRITERIA = os.path.join(DATA_DIR, "Dairy_Plant_Estimation_Dummy_Data.xlsx")

# In-memory store of analysis results, keyed by analysis id, so the DXF
# endpoint can regenerate a file without needing the client to re-upload.
ANALYSES = {}


def _save_upload(upload: UploadFile) -> str:
    suffix = os.path.splitext(upload.filename or "")[1] or ".xlsx"
    fd, path = tempfile.mkstemp(suffix=suffix)
    with os.fdopen(fd, "wb") as f:
        f.write(upload.file.read())
    return path


def _run_analysis(mass_balance_path, design_criteria_path, design_criteria_revised_path=None):
    mass_balance = extract_mass_balance(mass_balance_path)
    dc = parse_design_criteria(design_criteria_path)

    rev_a_equipment = build_equipment_list(dc["counts"], dc["specs"])

    if design_criteria_revised_path:
        dc2 = parse_design_criteria(design_criteria_revised_path)
        rev_b_raw = build_equipment_list(dc2["counts"], dc2["specs"])
        capacity_b_label = dc2["title"]
    else:
        rev_b_raw = build_equipment_list(dc["counts_expanded"], dc["specs"])
        capacity_b_label = dc["title"]

    rev_b_equipment = diff_equipment(rev_a_equipment, rev_b_raw)
    has_changes = any(e["changed"] for e in rev_b_equipment)

    analysis_id = str(uuid.uuid4())
    ANALYSES[analysis_id] = {
        "title": dc["title"],
        "source_note": dc["source_note"],
        "mass_balance": mass_balance,
        "rev_a": {"equipment": rev_a_equipment, "capacity_label": dc["title"]},
        "rev_b": {"equipment": rev_b_equipment, "capacity_label": capacity_b_label} if has_changes else None,
    }
    return analysis_id, ANALYSES[analysis_id]


@app.post("/api/analyze")
async def analyze(
    mass_balance_file: UploadFile = File(...),
    design_criteria_file: UploadFile = File(...),
    design_criteria_revised_file: UploadFile = File(None),
):
    try:
        mb_path = _save_upload(mass_balance_file)
        dc_path = _save_upload(design_criteria_file)
        dc2_path = _save_upload(design_criteria_revised_file) if design_criteria_revised_file else None
        analysis_id, result = _run_analysis(mb_path, dc_path, dc2_path)
        return {"analysis_id": analysis_id, **result}
    except Exception as e:
        raise HTTPException(400, f"Couldn't analyze the uploaded file(s): {e}")
    finally:
        for p in [locals().get("mb_path"), locals().get("dc_path"), locals().get("dc2_path")]:
            if p and os.path.exists(p):
                os.remove(p)


@app.post("/api/analyze-demo")
def analyze_demo():
    """Runs the same analysis using the bundled demo files (no upload needed)."""
    analysis_id, result = _run_analysis(DEMO_MASS_BALANCE, DEMO_DESIGN_CRITERIA)
    return {"analysis_id": analysis_id, **result}


@app.get("/api/dxf/{analysis_id}/{revision}")
def dxf(analysis_id: str, revision: str):
    revision = revision.upper()
    analysis = ANALYSES.get(analysis_id)
    if not analysis:
        raise HTTPException(404, "Analysis not found -- run /api/analyze again")
    rev = analysis["rev_a"] if revision == "A" else analysis["rev_b"]
    if not rev:
        raise HTTPException(404, f"Revision {revision} not available for this analysis")

    out_path = os.path.join(tempfile.gettempdir(), f"pid_{analysis_id}_{revision}.dxf")
    build_dxf(rev["equipment"], rev["capacity_label"], revision, out_path)
    return FileResponse(out_path, filename=f"reception_pid_rev_{revision}.dxf", media_type="application/dxf")


@app.get("/api/health")
def health():
    return {"status": "ok"}
