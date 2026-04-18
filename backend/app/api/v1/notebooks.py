"""Notebook routes — /api/v1/notebooks/ (Colab-style with system Python + optional venvs)"""
import uuid
import subprocess
import tempfile
import os
import sys
import shutil
from pathlib import Path
from typing import Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from datetime import datetime

from app.models.models import User, Notebook, Activity, Dataset
from app.api.v1.auth import get_current_user
from app.core.config import settings

router = APIRouter(prefix="/notebooks", tags=["Notebooks"])

# Base directory for notebook workspaces
NOTEBOOKS_DIR = Path(os.environ.get("NOTEBOOKS_DIR", "./notebook_workspaces")).resolve()
NOTEBOOKS_DIR.mkdir(parents=True, exist_ok=True)

# These packages are available from the system/backend Python environment
# No per-notebook venv is created for them — they're globally available.
GLOBAL_PACKAGES = [
    "numpy", "pandas", "scikit-learn", "matplotlib", "seaborn",
    "scipy", "statsmodels", "pillow", "requests",
]

# Per-notebook venvs are only created when user explicitly installs extra packages
# via the "Install Packages" dialog. Until then, system Python is used.


class NotebookCreate(BaseModel):
    title: str = "Untitled Notebook"
    description: Optional[str] = None

class NotebookUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    cells: Optional[List[dict]] = None
    is_public: Optional[bool] = None
    tags: Optional[List[str]] = None

class NotebookOut(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    title: str
    description: Optional[str]
    is_public: bool
    cells: List[dict]
    tags: List[str]
    star_count: int
    fork_count: int
    created_at: datetime
    updated_at: datetime

class CellExecuteRequest(BaseModel):
    cell_index: int
    source: str

class CellExecuteResponse(BaseModel):
    cell_index: int
    outputs: List[dict]
    error: Optional[str]

class InstallRequest(BaseModel):
    packages: List[str]

class NotebookFileCreate(BaseModel):
    filename: str
    content: str = ""

class NotebookFileOut(BaseModel):
    filename: str
    size_bytes: int


def _get_workspace(notebook_id: uuid.UUID) -> Path:
    """Get or create the workspace directory for a notebook."""
    ws = NOTEBOOKS_DIR / str(notebook_id)
    ws.mkdir(parents=True, exist_ok=True)
    return ws


def _get_python_path(notebook_id: uuid.UUID) -> str:
    """Get the Python binary to use for this notebook.
    
    Uses system Python by default. If a per-notebook venv exists
    (created when user installs extra packages), use that instead.
    """
    ws = _get_workspace(notebook_id)
    venv_dir = ws / "venv"
    
    if venv_dir.exists():
        # Per-notebook venv exists — use it
        if os.name == "nt":
            venv_python = venv_dir / "Scripts" / "python.exe"
        else:
            venv_python = venv_dir / "bin" / "python"
        if venv_python.exists():
            return str(venv_python)
    
    # Use the same Python that's running the backend
    # This has numpy, pandas, scikit-learn, etc. already installed
    return sys.executable


def _create_venv_if_needed(notebook_id: uuid.UUID) -> str:
    """Create a per-notebook venv only when user wants to install extra packages.
    
    The venv inherits system site-packages so numpy/pandas/sklearn etc. are
    available without reinstalling. Only extra packages are installed per-notebook.
    """
    ws = _get_workspace(notebook_id)
    venv_dir = ws / "venv"
    
    if not venv_dir.exists():
        # Create venv WITH --system-site-packages so global packages are available
        subprocess.run(
            [sys.executable, "-m", "venv", "--system-site-packages", str(venv_dir)],
            capture_output=True, text=True, timeout=120,
        )
    
    if os.name == "nt":
        return str(venv_dir / "Scripts" / "python.exe")
    return str(venv_dir / "bin" / "python")


# ── CRUD ─────────────────────────────────────────────────────────────────────

@router.post("", response_model=NotebookOut, status_code=201)
async def create_notebook(body: NotebookCreate, current_user: User = Depends(get_current_user)):
    nb = Notebook(owner_id=current_user.id, title=body.title, description=body.description)
    await nb.insert()
    _get_workspace(nb.id)  # Create workspace dir
    await Activity(user_id=current_user.id, action="published", resource_type="notebook", resource_id=nb.id).insert()
    return nb


@router.get("", response_model=List[NotebookOut])
async def list_notebooks(current_user: User = Depends(get_current_user)):
    return await Notebook.find(Notebook.owner_id == current_user.id).sort(-Notebook.updated_at).to_list()


@router.get("/{notebook_id}", response_model=NotebookOut)
async def get_notebook(notebook_id: uuid.UUID, current_user: User = Depends(get_current_user)):
    nb = await Notebook.get(notebook_id)
    if not nb:
        raise HTTPException(404, "Notebook not found")
    if nb.owner_id != current_user.id and not nb.is_public:
        raise HTTPException(403, "Not authorized")
    return nb


@router.put("/{notebook_id}", response_model=NotebookOut)
async def update_notebook(notebook_id: uuid.UUID, body: NotebookUpdate, current_user: User = Depends(get_current_user)):
    nb = await Notebook.get(notebook_id)
    if not nb:
        raise HTTPException(404, "Notebook not found")
    if nb.owner_id != current_user.id:
        raise HTTPException(403, "Not authorized")

    if body.title is not None: nb.title = body.title
    if body.description is not None: nb.description = body.description
    if body.cells is not None: nb.cells = body.cells
    if body.is_public is not None: nb.is_public = body.is_public
    if body.tags is not None: nb.tags = body.tags
    from app.models.models import utcnow
    nb.updated_at = utcnow()
    await nb.save()
    return nb


@router.delete("/{notebook_id}", status_code=204)
async def delete_notebook(notebook_id: uuid.UUID, current_user: User = Depends(get_current_user)):
    nb = await Notebook.get(notebook_id)
    if not nb:
        raise HTTPException(404, "Notebook not found")
    if nb.owner_id != current_user.id:
        raise HTTPException(403, "Not authorized")
    # Clean up workspace
    ws = NOTEBOOKS_DIR / str(notebook_id)
    if ws.exists():
        shutil.rmtree(ws, ignore_errors=True)
    await nb.delete()


# ── Execution ────────────────────────────────────────────────────────────────

@router.post("/{notebook_id}/execute", response_model=CellExecuteResponse)
async def execute_cell(notebook_id: uuid.UUID, body: CellExecuteRequest, current_user: User = Depends(get_current_user)):
    """Execute a single code cell using system Python (or notebook venv if extra packages installed)."""
    nb = await Notebook.get(notebook_id)
    if not nb:
        raise HTTPException(404, "Notebook not found")
    if nb.owner_id != current_user.id:
        raise HTTPException(403, "Only the owner can execute cells")

    timeout = nb.runtime_config.get("timeout_seconds", 30)
    ws = _get_workspace(notebook_id)
    python_path = _get_python_path(notebook_id)

    # Write code to a temp file inside the workspace (so imports work)
    code_file = ws / f"_cell_{body.cell_index}.py"
    code_file.write_text(body.source, encoding="utf-8")

    try:
        result = subprocess.run(
            [python_path, str(code_file)],
            capture_output=True, text=True, timeout=timeout,
            cwd=str(ws),
            env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"},
        )
        outputs = []
        if result.stdout:
            outputs.append({"type": "text", "content": result.stdout})
        error = result.stderr if result.returncode != 0 else None
        if result.stderr and result.returncode == 0:
            # Warnings from libraries — show but don't treat as error
            outputs.append({"type": "stderr", "content": result.stderr})
            error = None
    except subprocess.TimeoutExpired:
        outputs = []
        error = f"Execution timed out after {timeout}s"
    except FileNotFoundError:
        outputs = []
        error = f"Python interpreter not found: {python_path}"
    finally:
        # Clean up temp cell file (keep user files)
        if code_file.exists():
            code_file.unlink()

    # Update cell outputs
    if 0 <= body.cell_index < len(nb.cells):
        nb.cells[body.cell_index]["outputs"] = outputs
        if error:
            nb.cells[body.cell_index]["outputs"].append({"type": "error", "content": error})
        from app.models.models import utcnow
        nb.updated_at = utcnow()
        await nb.save()

    return CellExecuteResponse(cell_index=body.cell_index, outputs=outputs, error=error)


# ── Package Management ───────────────────────────────────────────────────────

@router.post("/{notebook_id}/install")
async def install_packages(notebook_id: uuid.UUID, body: InstallRequest, current_user: User = Depends(get_current_user)):
    """Install Python packages into a per-notebook venv.
    
    Creates the venv on first call with --system-site-packages so that
    global packages (numpy, pandas, sklearn, etc.) are inherited.
    Only the extra packages are pip-installed into the venv.
    """
    nb = await Notebook.get(notebook_id)
    if not nb:
        raise HTTPException(404, "Notebook not found")
    if nb.owner_id != current_user.id:
        raise HTTPException(403, "Not authorized")

    # Create venv if it doesn't exist (only when user explicitly installs packages)
    python_path = _create_venv_if_needed(notebook_id)
    ws = _get_workspace(notebook_id)
    venv_dir = ws / "venv"
    pip_path = str(venv_dir / ("Scripts" if os.name == "nt" else "bin") / "pip")

    # Sanitize package names (basic safety)
    safe_pkgs = [p.strip() for p in body.packages if p.strip() and not p.strip().startswith("-")]
    if not safe_pkgs:
        raise HTTPException(400, "No valid package names provided")

    try:
        result = subprocess.run(
            [pip_path, "install"] + safe_pkgs,
            capture_output=True, text=True, timeout=120,
        )
        return {
            "success": result.returncode == 0,
            "output": result.stdout,
            "error": result.stderr if result.returncode != 0 else None,
            "packages": safe_pkgs,
        }
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Installation timed out", "packages": safe_pkgs}


@router.get("/{notebook_id}/packages")
async def list_installed_packages(notebook_id: uuid.UUID, current_user: User = Depends(get_current_user)):
    """List installed packages — global packages are always available."""
    nb = await Notebook.get(notebook_id)
    if not nb:
        raise HTTPException(404, "Notebook not found")
    if nb.owner_id != current_user.id and not nb.is_public:
        raise HTTPException(403, "Not authorized")

    ws = _get_workspace(notebook_id)
    venv_dir = ws / "venv"
    
    if not venv_dir.exists():
        return {
            "packages": GLOBAL_PACKAGES,
            "note": "Using system Python — global packages are available. Extra packages will create a per-notebook environment.",
        }

    pip_path = str(venv_dir / ("Scripts" if os.name == "nt" else "bin") / "pip")
    try:
        result = subprocess.run([pip_path, "list", "--format=columns"], capture_output=True, text=True, timeout=15)
        return {"output": result.stdout}
    except Exception:
        return {"packages": GLOBAL_PACKAGES, "error": "Could not list packages"}


# ── File Management ──────────────────────────────────────────────────────────

@router.post("/{notebook_id}/files", response_model=NotebookFileOut)
async def create_file(notebook_id: uuid.UUID, body: NotebookFileCreate, current_user: User = Depends(get_current_user)):
    """Create a Python/text file in the notebook workspace (for multi-file projects)."""
    nb = await Notebook.get(notebook_id)
    if not nb:
        raise HTTPException(404, "Notebook not found")
    if nb.owner_id != current_user.id:
        raise HTTPException(403, "Not authorized")

    # Safety: only allow safe filenames
    safe_name = body.filename.replace("..", "").replace("/", "").replace("\\", "")
    if not safe_name or safe_name.startswith("."):
        raise HTTPException(400, "Invalid filename")

    # Validate extension
    allowed_extensions = {
        ".py", ".csv", ".txt", ".json", ".md", ".yaml", ".yml", ".toml",
        ".tsv", ".xml", ".html", ".css", ".js", ".sh", ".sql", ".r",
    }
    file_ext = os.path.splitext(safe_name)[1].lower()
    if not file_ext:
        raise HTTPException(400, "Filename must include an extension (e.g., script.py)")
    if file_ext not in allowed_extensions:
        raise HTTPException(
            415,
            f"Unsupported extension '{file_ext}'. Allowed: {', '.join(sorted(allowed_extensions))}"
        )

    ws = _get_workspace(notebook_id)
    filepath = ws / safe_name
    filepath.write_text(body.content, encoding="utf-8")
    return NotebookFileOut(filename=safe_name, size_bytes=len(body.content.encode("utf-8")))


@router.get("/{notebook_id}/files", response_model=List[NotebookFileOut])
async def list_files(notebook_id: uuid.UUID, current_user: User = Depends(get_current_user)):
    """List all user-created files in the notebook workspace."""
    nb = await Notebook.get(notebook_id)
    if not nb:
        raise HTTPException(404, "Notebook not found")
    if nb.owner_id != current_user.id and not nb.is_public:
        raise HTTPException(403, "Not authorized")

    ws = _get_workspace(notebook_id)
    ignore = {"venv", "__pycache__", ".git"}
    files = []
    for f in ws.iterdir():
        if f.is_file() and f.name not in ignore and not f.name.startswith("_cell_"):
            files.append(NotebookFileOut(filename=f.name, size_bytes=f.stat().st_size))
    return files


@router.get("/{notebook_id}/files/{filename}")
async def get_file_content(notebook_id: uuid.UUID, filename: str, current_user: User = Depends(get_current_user)):
    """Get content of a file in the workspace."""
    nb = await Notebook.get(notebook_id)
    if not nb:
        raise HTTPException(404, "Notebook not found")
    if nb.owner_id != current_user.id and not nb.is_public:
        raise HTTPException(403, "Not authorized")

    ws = _get_workspace(notebook_id)
    filepath = ws / filename.replace("..", "").replace("/", "").replace("\\", "")
    if not filepath.exists():
        raise HTTPException(404, "File not found")
    return {"filename": filename, "content": filepath.read_text(encoding="utf-8")}


@router.put("/{notebook_id}/files/{filename}")
async def update_file(notebook_id: uuid.UUID, filename: str, body: NotebookFileCreate, current_user: User = Depends(get_current_user)):
    """Update content of a file in the workspace."""
    nb = await Notebook.get(notebook_id)
    if not nb:
        raise HTTPException(404, "Notebook not found")
    if nb.owner_id != current_user.id:
        raise HTTPException(403, "Not authorized")

    ws = _get_workspace(notebook_id)
    filepath = ws / filename.replace("..", "").replace("/", "").replace("\\", "")
    filepath.write_text(body.content, encoding="utf-8")
    return {"filename": filename, "size_bytes": len(body.content.encode("utf-8"))}


@router.delete("/{notebook_id}/files/{filename}", status_code=204)
async def delete_file(notebook_id: uuid.UUID, filename: str, current_user: User = Depends(get_current_user)):
    """Delete a file from the workspace."""
    nb = await Notebook.get(notebook_id)
    if not nb:
        raise HTTPException(404, "Notebook not found")
    if nb.owner_id != current_user.id:
        raise HTTPException(403, "Not authorized")

    ws = _get_workspace(notebook_id)
    filepath = ws / filename.replace("..", "").replace("/", "").replace("\\", "")
    if filepath.exists():
        filepath.unlink()


# ── Dataset Import ───────────────────────────────────────────────────────────

@router.post("/{notebook_id}/import-dataset/{dataset_id}")
async def import_dataset(notebook_id: uuid.UUID, dataset_id: uuid.UUID, current_user: User = Depends(get_current_user)):
    """Copy/link a dataset file into the notebook workspace so it can be loaded with pandas."""
    nb = await Notebook.get(notebook_id)
    if not nb:
        raise HTTPException(404, "Notebook not found")
    if nb.owner_id != current_user.id:
        raise HTTPException(403, "Not authorized")

    ds = await Dataset.get(dataset_id)
    if not ds:
        raise HTTPException(404, "Dataset not found")
    if ds.owner_id != current_user.id and not ds.is_public:
        raise HTTPException(403, "Not authorized to access this dataset")

    # Download from storage and write to workspace
    from app.services.storage_service import StorageService
    storage = await StorageService.get_instance()
    try:
        data = await storage.download_bytes(settings.R2_BUCKET_DATA, ds.minio_path)
    except Exception:
        raise HTTPException(500, "Failed to download dataset from storage")

    ws = _get_workspace(notebook_id)
    filename = ds.name if ds.name else f"dataset_{dataset_id}.csv"
    (ws / filename).write_bytes(data)

    return {"message": f"Dataset '{filename}' imported to notebook workspace", "filename": filename, "size_bytes": len(data)}


@router.post("/{notebook_id}/import-model/{model_id}")
async def import_model(notebook_id: uuid.UUID, model_id: uuid.UUID, current_user: User = Depends(get_current_user)):
    """Copy/link a model artifact file into the notebook workspace."""
    from app.models.models import MLModel
    nb = await Notebook.get(notebook_id)
    if not nb:
        raise HTTPException(404, "Notebook not found")
    if nb.owner_id != current_user.id:
        raise HTTPException(403, "Not authorized")

    model = await MLModel.get(model_id)
    if not model:
        raise HTTPException(404, "Model not found")
    if model.owner_id != current_user.id and not model.is_public:
        raise HTTPException(403, "Not authorized to access this model")

    from app.services.storage_service import StorageService
    storage = await StorageService.get_instance()
    try:
        data = await storage.download_bytes(settings.R2_BUCKET_MODELS, model.artifact_path)
    except Exception:
        raise HTTPException(500, "Failed to download model artifact from storage")

    ws = _get_workspace(notebook_id)
    # Give it a safe name
    filename = model.artifact_path.split("/")[-1] if "/" in model.artifact_path else "model.pkl"
    (ws / filename).write_bytes(data)

    return {"message": f"Model artifact '{filename}' imported to notebook workspace", "filename": filename, "size_bytes": len(data)}



@router.post("/{notebook_id}/upload-file")
async def upload_file_to_notebook(
    notebook_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload a file directly into the notebook workspace."""
    nb = await Notebook.get(notebook_id)
    if not nb:
        raise HTTPException(404, "Notebook not found")
    if nb.owner_id != current_user.id:
        raise HTTPException(403, "Not authorized")

    content = await file.read()
    if len(content) > 100 * 1024 * 1024:  # 100MB limit
        raise HTTPException(413, "File too large (max 100MB)")

    filename = file.filename or "uploaded_file"
    
    # Validate file extension
    allowed_extensions = {
        ".py", ".csv", ".txt", ".json", ".md", ".yaml", ".yml", ".toml",
        ".tsv", ".xml", ".html", ".css", ".js", ".sh", ".bat", ".sql",
        ".ipynb", ".pkl", ".joblib", ".npy", ".npz", ".parquet",
        ".xlsx", ".xls", ".zip", ".png", ".jpg", ".jpeg", ".gif", ".svg",
    }
    file_ext = os.path.splitext(filename)[1].lower()
    if file_ext and file_ext not in allowed_extensions:
        raise HTTPException(
            415,
            f"Unsupported file type '{file_ext}'. Allowed: {', '.join(sorted(allowed_extensions))}"
        )

    safe_name = filename.replace("..", "").replace("/", "").replace("\\", "")
    ws = _get_workspace(notebook_id)
    (ws / safe_name).write_bytes(content)

    return {"filename": safe_name, "size_bytes": len(content)}


@router.post("/{notebook_id}/import-ipynb", response_model=NotebookOut)
async def import_ipynb(
    notebook_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Import a .ipynb file: parse its cells into the notebook."""
    import json as json_module
    
    nb = await Notebook.get(notebook_id)
    if not nb:
        raise HTTPException(404, "Notebook not found")
    if nb.owner_id != current_user.id:
        raise HTTPException(403, "Not authorized")

    filename = file.filename or ""
    if not filename.lower().endswith(".ipynb"):
        raise HTTPException(415, "Only .ipynb files are supported for notebook import")

    content = await file.read()
    if len(content) > 50 * 1024 * 1024:  # 50MB limit
        raise HTTPException(413, "File too large (max 50MB)")

    try:
        ipynb_data = json_module.loads(content.decode("utf-8"))
    except (json_module.JSONDecodeError, UnicodeDecodeError):
        raise HTTPException(400, "Invalid .ipynb file — could not parse JSON")

    if "cells" not in ipynb_data:
        raise HTTPException(400, "Invalid .ipynb file — no cells found")

    # Convert ipynb cells to our internal cell format
    imported_cells = []
    for cell in ipynb_data.get("cells", []):
        cell_type = cell.get("cell_type", "code")
        if cell_type not in ("code", "markdown", "raw"):
            cell_type = "code"
        if cell_type == "raw":
            cell_type = "code"  # Treat raw cells as code

        # Source can be a string or list of strings
        source = cell.get("source", "")
        if isinstance(source, list):
            source = "".join(source)
        
        # Parse outputs
        outputs = []
        for out in cell.get("outputs", []):
            out_type = out.get("output_type", "")
            if out_type == "stream":
                text = out.get("text", "")
                if isinstance(text, list):
                    text = "".join(text)
                stream_name = out.get("name", "stdout")
                outputs.append({
                    "type": "stderr" if stream_name == "stderr" else "text",
                    "content": text,
                })
            elif out_type == "error":
                tb = out.get("traceback", [])
                if isinstance(tb, list):
                    tb = "\n".join(tb)
                outputs.append({"type": "error", "content": tb})
            elif out_type in ("display_data", "execute_result"):
                data = out.get("data", {})
                if "text/plain" in data:
                    text = data["text/plain"]
                    if isinstance(text, list):
                        text = "".join(text)
                    outputs.append({"type": "text", "content": text})

        imported_cells.append({
            "type": "markdown" if cell_type == "markdown" else "code",
            "source": source,
            "outputs": outputs,
        })

    if not imported_cells:
        imported_cells = [{"type": "code", "source": "", "outputs": []}]

    nb.cells = imported_cells
    nb.title = filename.rsplit(".", 1)[0] if not nb.title or nb.title == "Untitled Notebook" else nb.title
    from app.models.models import utcnow
    nb.updated_at = utcnow()
    await nb.save()
    return nb


# ── Fork ─────────────────────────────────────────────────────────────────────

@router.post("/{notebook_id}/fork", response_model=NotebookOut)
async def fork_notebook(notebook_id: uuid.UUID, current_user: User = Depends(get_current_user)):
    nb = await Notebook.get(notebook_id)
    if not nb:
        raise HTTPException(404, "Notebook not found")
    if not nb.is_public and nb.owner_id != current_user.id:
        raise HTTPException(403, "Cannot fork a private notebook")

    from app.models.models import Fork as ForkModel
    copy = Notebook(
        owner_id=current_user.id, title=f"{nb.title} (fork)",
        description=nb.description, cells=nb.cells, tags=nb.tags,
    )
    await copy.insert()

    # Copy workspace files (but not venv)
    src_ws = _get_workspace(notebook_id)
    dst_ws = _get_workspace(copy.id)
    for f in src_ws.iterdir():
        if f.is_file() and f.name != "venv" and not f.name.startswith("_cell_"):
            shutil.copy2(str(f), str(dst_ws / f.name))

    nb.fork_count += 1
    await nb.save()
    await ForkModel(original_id=nb.id, original_type="notebook", forked_id=copy.id, forked_by=current_user.id).insert()
    await Activity(user_id=current_user.id, action="forked", resource_type="notebook", resource_id=nb.id).insert()
    return copy


from fastapi.responses import Response

@router.get("/{notebook_id}/export")
async def export_notebook_ipynb(
    notebook_id: uuid.UUID,
    token: Optional[str] = None,
    current_user: User = Depends(get_current_user),
):
    """Export notebook to .ipynb JSON format.
    
    Supports auth via Authorization header OR ?token= query param
    (needed for browser download via window.location.href).
    """
    nb = await Notebook.get(notebook_id)
    if not nb:
        raise HTTPException(404, "Notebook not found")
    if nb.owner_id != current_user.id and not nb.is_public:
        raise HTTPException(403, "Not authorized")

    ipynb = {
        "cells": [],
        "metadata": {
            "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
            "language_info": {"codemirror_mode": {"name": "ipython", "version": 3}, "file_extension": ".py", "mimetype": "text/x-python", "name": "python", "nbconvert_exporter": "python", "pygments_lexer": "ipython3", "version": "3.11.0"}
        },
        "nbformat": 4,
        "nbformat_minor": 5
    }

    for cell in nb.cells:
        cell_type = "markdown" if cell.get("type") == "markdown" else "code"
        source = cell.get("source", "") or ""
        source_lines = [line + "\n" for line in source.split("\n")]
        if source_lines and source_lines[-1].endswith("\n"):
            source_lines[-1] = source_lines[-1][:-1]
            
        c = {"cell_type": cell_type, "metadata": {}, "source": source_lines}
        
        if cell_type == "code":
            c["execution_count"] = None
            c["outputs"] = []
            
            for out in cell.get("outputs", []):
                t = out.get("type", "text")
                content_str = out.get("content", "") or ""
                content = [line + "\n" for line in content_str.split("\n")]
                if content and content[-1].endswith("\n"):
                    content[-1] = content[-1][:-1]
                    
                if t == "error":
                    c["outputs"].append({"output_type": "error", "ename": "Error", "evalue": "", "traceback": content})
                elif t == "stderr":
                    c["outputs"].append({"output_type": "stream", "name": "stderr", "text": content})
                else:
                    c["outputs"].append({"output_type": "stream", "name": "stdout", "text": content})
                    
        ipynb["cells"].append(c)

    import json
    # Sanitize filename for Content-Disposition header
    safe_title = "".join(c for c in nb.title if c.isalnum() or c in " _-").strip() or "notebook"
    return Response(
        content=json.dumps(ipynb, indent=1),
        media_type="application/x-ipynb+json",
        headers={"Content-Disposition": f'attachment; filename="{safe_title}.ipynb"'}
    )

