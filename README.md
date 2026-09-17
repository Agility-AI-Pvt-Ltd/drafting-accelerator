# Design Drafting Accelerator — Demo

A small full-stack demo: React frontend + Python (FastAPI) backend.

**The flow:** you upload a mass-balance file and a design-criteria file (same
template as the NDDB dummy data) → the backend parses real counts and specs out
of them → the frontend shows the auto-drafted P&ID, the equipment list, and a
downloadable real DXF file. If you also upload a second, revised design-criteria
file, it diffs the two and shows a revision cloud around whatever actually
changed. If you don't have files handy, click "Use demo data instead" to run
the same flow against the two bundled dummy files.

**What's still simplified (by design, for this demo):** box positions are
hand-placed per equipment type, not a general layout algorithm. The parser
expects the same sheet/row template as the dummy files — a genuinely different
spreadsheet layout would need `backend/parser.py` updated to match it.

## Project structure

```
drafting-accelerator/
├── backend/            FastAPI app
│   ├── main.py           API endpoints (upload, analyze, dxf export)
│   ├── parser.py         reads counts/specs out of uploaded xlsx files
│   ├── dxf_export.py     builds a real DXF from any equipment list
│   ├── requirements.txt
│   └── data/              the two demo xlsx files (used by "Use demo data")
└── frontend/            React app (Vite)
    └── src/
        ├── App.jsx
        ├── api.js
        └── components/
            ├── UploadForm.jsx
            ├── DiagramView.jsx
            └── EquipmentTable.jsx
```

## Run the backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate   # optional but recommended
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Check it's up: open http://127.0.0.1:8000/api/health — should return `{"status":"ok"}`.

## Run the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the URL it prints (usually http://localhost:5173).

The frontend expects the backend at `http://127.0.0.1:8000` (set in `src/api.js`
— change `BASE_URL` there if you run the backend elsewhere).

## API endpoints (backend)

| Endpoint | What it does |
|---|---|
| `POST /api/analyze` | multipart upload: `mass_balance_file`, `design_criteria_file`, optional `design_criteria_revised_file` → returns parsed mass balance + equipment (+ diff if a revised file was given) |
| `POST /api/analyze-demo` | same analysis, using the bundled demo files, no upload needed |
| `GET /api/dxf/{analysis_id}/{revision}` | downloads a real .dxf for revision `A` or `B` of a prior analysis |
| `GET /api/health` | `{"status": "ok"}` |

## Using your own real data

Any file that follows the same layout as the dummy files will parse correctly:
- Mass balance: a `Sheet1` with milk input in row 4 (`B4:G4`) and per-product
  rows in `H4:J16`.
- Design criteria: a `Design criteria` sheet with the title in `A1`, and
  reception/despatch/processing/separator descriptions in `B8`–`B11` (with the
  expandable-count note, if any, in `D8`).

For a genuinely different spreadsheet layout, `backend/parser.py` is the only
file that needs editing — it's the single place that knows which cells to read.
