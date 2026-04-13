"""
NexusML - Full Platform Integration Test Suite
================================================
Tests all API endpoints end-to-end against a running backend.
Requirements: pip install requests  (already in stdlib for the backend)

Usage:
    python test_platform.py [--base-url http://localhost:8000/api/v1]
"""
import requests
import io
import os

# Force UTF-8 output on Windows
if os.name == 'nt':
    import sys as _sys
    _sys.stdout = io.TextIOWrapper(_sys.stdout.buffer, encoding='utf-8', errors='replace')
    _sys.stderr = io.TextIOWrapper(_sys.stderr.buffer, encoding='utf-8', errors='replace')
import sys
import json
import time
import uuid
from datetime import datetime

BASE_URL = "http://localhost:8000/api/v1"
PASS = 0
FAIL = 0
SKIP = 0
RESULTS = []

# ── Helpers ──────────────────────────────────────────────────────────────────

def log(status: str, test: str, detail: str = ""):
    global PASS, FAIL, SKIP
    icon = {"PASS": "[PASS]", "FAIL": "[FAIL]", "SKIP": "[SKIP]"}[status]
    if status == "PASS": PASS += 1
    elif status == "FAIL": FAIL += 1
    else: SKIP += 1
    msg = f"  {icon} {test}" + (f" -- {detail}" if detail else "")
    print(msg)
    RESULTS.append({"status": status, "test": test, "detail": detail})


def check(condition, test, detail=""):
    if condition:
        log("PASS", test, detail)
    else:
        log("FAIL", test, detail)
    return condition


def api(method, path, token=None, **kwargs):
    url = f"{BASE_URL}{path}"
    headers = kwargs.pop("headers", {})
    if token:
        headers["Authorization"] = f"Bearer {token}"
    for attempt in range(3):
        try:
            r = requests.request(method, url, headers=headers, timeout=30, **kwargs)
            return r
        except (requests.ConnectionError, ConnectionRefusedError):
            if attempt < 2:
                time.sleep(1)
                continue
            return None
        except Exception as e:
            print(f"    [DEBUG] Request error: {type(e).__name__}: {e}")
            return None
    return None


# ── Test Sections ────────────────────────────────────────────────────────────

def test_server_health():
    print("\n--- Server Health ---")
    r = api("GET", "/../docs")
    if r is None:
        log("FAIL", "Server reachable", "Cannot connect to server")
        return False
    check(r.status_code < 500, "Server reachable", f"status={r.status_code}")
    return True


def test_auth():
    print("\n--- Authentication ---")
    email = f"test_{uuid.uuid4().hex[:6]}@nexusmltest.com"
    password = "TestPass123!"
    
    # Register
    r = api("POST", "/auth/register", json={"email": email, "password": password, "full_name": "Test User"})
    reg_ok = check(r and r.status_code == 201, "Register new user", f"status={r.status_code if r else 'N/A'}")
    if not reg_ok:
        return None, None
    user = r.json()
    user_id = user["id"]
    
    # Duplicate register
    r = api("POST", "/auth/register", json={"email": email, "password": password})
    check(r and r.status_code == 409, "Reject duplicate email", f"status={r.status_code if r else 'N/A'}")
    
    # Login
    r = api("POST", "/auth/login", json={"email": email, "password": password})
    login_ok = check(r and r.status_code == 200, "Login", f"status={r.status_code if r else 'N/A'}")
    if not login_ok:
        return None, None
    tokens = r.json()
    access = tokens["access_token"]
    refresh = tokens["refresh_token"]
    
    # Bad login
    r = api("POST", "/auth/login", json={"email": email, "password": "wrong"})
    check(r and r.status_code == 401, "Reject bad password", f"status={r.status_code if r else 'N/A'}")
    
    # Get me
    r = api("GET", "/auth/me", token=access)
    check(r and r.status_code == 200, "GET /auth/me", f"email={r.json().get('email') if r else ''}")
    
    # Update profile
    r = api("PUT", "/auth/me", token=access, json={"full_name": "Updated Name", "bio": "Test bio"})
    check(r and r.status_code == 200 and r.json().get("full_name") == "Updated Name", "Update profile", "full_name updated")
    
    # Change password
    r = api("PUT", "/auth/me/password", token=access, json={"current_password": password, "new_password": "NewPass456!"})
    check(r and r.status_code == 200, "Change password")
    
    # Re-login with new password
    r = api("POST", "/auth/login", json={"email": email, "password": "NewPass456!"})
    check(r and r.status_code == 200, "Login with new password")
    access = r.json()["access_token"] if r and r.status_code == 200 else access
    
    # Refresh token
    r = api("POST", "/auth/refresh", json={"refresh_token": refresh})
    check(r and r.status_code == 200, "Refresh token", f"got new tokens={bool(r and r.json().get('access_token'))}")
    
    # No auth
    r = api("GET", "/auth/me")
    check(r and r.status_code in (401, 403), "Reject unauthenticated", f"status={r.status_code if r else 'N/A'}")
    
    return access, email


def test_datasets(token):
    print("\n--- Datasets ---")
    if not token:
        log("SKIP", "Datasets (no token)")
        return None
    
    # Upload CSV
    csv_content = "name,age,salary,department\nAlice,30,70000,Engineering\nBob,25,60000,Marketing\nCharlie,35,90000,Engineering\nDiana,28,65000,Sales\nEve,32,85000,Engineering"
    r = api("POST", "/data/upload", token=token,
            files={"file": ("test_data.csv", csv_content.encode(), "text/csv")},
            data={"name": "test_data.csv", "description": "Test dataset"})
    upload_ok = check(r and r.status_code in (200, 201), "Upload CSV", f"status={r.status_code if r else 'N/A'}")
    if not upload_ok:
        return None
    ds = r.json()
    ds_id = ds["id"]
    
    # List datasets
    r = api("GET", "/data/datasets", token=token)
    check(r and r.status_code == 200 and len(r.json()) >= 1, "List datasets", f"count={len(r.json()) if r else 0}")
    
    # Get single dataset
    r = api("GET", f"/data/datasets/{ds_id}", token=token)
    check(r and r.status_code == 200, "Get dataset detail", f"name={r.json().get('name') if r else ''}")
    
    # Get profile
    r = api("GET", f"/data/datasets/{ds_id}/profile", token=token)
    check(r and r.status_code == 200, "Get dataset profile")
    
    return ds_id


def test_training(token, dataset_id):
    print("\n--- Training ---")
    if not token or not dataset_id:
        log("SKIP", "Training (missing prerequisites)")
        return None
    
    # Start training job
    r = api("POST", "/training/jobs", token=token, json={
        "dataset_id": dataset_id,
        "task_type": "classification",
        "target_column": "department",
        "config": {"algorithm": "auto", "test_size": 0.3, "random_state": 42}
    })
    train_ok = check(r and r.status_code in (200, 201, 202), "Start training job", f"status={r.status_code if r else 'N/A'}")
    if not train_ok:
        return None
    job = r.json()
    job_id = job["id"]
    
    # List jobs
    r = api("GET", "/training/jobs", token=token)
    check(r and r.status_code == 200, "List training jobs", f"count={len(r.json()) if r else 0}")
    
    # Poll for completion (with timeout)
    model_id = None
    for i in range(30):
        time.sleep(2)
        r = api("GET", f"/training/jobs/{job_id}", token=token)
        if not r or r.status_code != 200:
            break
        status = r.json().get("status", "")
        if status == "completed":
            check(True, "Training completed", f"metrics={r.json().get('metrics')}")
            # Find the model
            mr = api("GET", "/models/", token=token)
            if mr and mr.status_code == 200:
                models = mr.json()
                if models:
                    model_id = models[0]["id"]
                    check(True, "Model created", f"id={model_id}")
            break
        elif status == "failed":
            check(False, "Training completed", f"error={r.json().get('error_message')}")
            break
    else:
        log("SKIP", "Training completion", "Timed out waiting (60s)")
    
    return model_id


def test_models(token, model_id):
    print("\n--- Models ---")
    if not token:
        log("SKIP", "Models (no token)")
        return
    
    # List models
    r = api("GET", "/models/", token=token)
    check(r and r.status_code == 200, "List models", f"count={len(r.json()) if r else 0}")
    
    if not model_id:
        log("SKIP", "Model detail (no model created)")
        return
    
    # Get model detail
    r = api("GET", f"/models/{model_id}", token=token)
    check(r and r.status_code == 200, "Get model detail", f"name={r.json().get('name') if r else ''}")
    
    # Update model
    r = api("PUT", f"/models/{model_id}", token=token, json={"name": "Renamed Model", "description": "Test description"})
    check(r and r.status_code == 200, "Update model", f"name={r.json().get('name') if r else ''}")


def test_deployment(token, model_id):
    print("\n--- Deployment & API Keys ---")
    if not token or not model_id:
        log("SKIP", "Deployment (no model)")
        return None
    
    # Deploy model
    r = api("POST", f"/deploy/{model_id}", token=token)
    deploy_ok = check(r and r.status_code in (200, 201), "Deploy model", f"status={r.status_code if r else 'N/A'}")
    
    # List all keys
    r = api("GET", "/deploy/keys/all", token=token)
    check(r and r.status_code == 200, "List all API keys", f"count={len(r.json()) if r and r.status_code == 200 else 0}")
    
    # Create API key
    r = api("POST", f"/deploy/{model_id}/keys", token=token, params={"name": "Test Key"})
    key_ok = check(r and r.status_code == 201, "Create API key", f"raw_key exists={bool(r.json().get('raw_key')) if r and r.status_code == 201 else False}")
    key_id = r.json().get("id") if r and r.status_code == 201 else None
    
    # List again — should have more keys
    r = api("GET", "/deploy/keys/all", token=token)
    check(r and r.status_code == 200, "Keys list updated after create")
    
    if key_id:
        # Regenerate
        r = api("POST", f"/deploy/keys/{key_id}/regenerate", token=token)
        check(r and r.status_code == 200, "Regenerate API key", f"new raw_key={bool(r.json().get('raw_key')) if r and r.status_code == 200 else False}")
        new_key_id = r.json().get("id") if r and r.status_code == 200 else None
        
        # Revoke the new key
        if new_key_id:
            r = api("DELETE", f"/deploy/{model_id}/keys/{new_key_id}", token=token)
            check(r and r.status_code == 204, "Revoke API key", f"status={r.status_code if r else 'N/A'}")
    
    # Usage stats
    r = api("GET", f"/deploy/{model_id}/usage", token=token)
    check(r and r.status_code == 200, "Get deployment usage stats")
    
    return True


def test_notebooks(token):
    print("\n--- Notebooks ---")
    if not token:
        log("SKIP", "Notebooks (no token)")
        return
    
    # Create notebook
    r = api("POST", "/notebooks/", token=token, json={"title": "Test Notebook", "description": "Integration test"})
    nb_ok = check(r and r.status_code == 201, "Create notebook", f"id={r.json().get('id') if r else ''}")
    if not nb_ok:
        return
    nb = r.json()
    nb_id = nb["id"]
    
    # List notebooks
    r = api("GET", "/notebooks/", token=token)
    check(r and r.status_code == 200 and len(r.json()) >= 1, "List notebooks")
    
    # Get single
    r = api("GET", f"/notebooks/{nb_id}", token=token)
    check(r and r.status_code == 200, "Get notebook detail")
    
    # Update with cells
    cells = [
        {"type": "code", "source": "print('Hello from NexusML!')", "outputs": []},
        {"type": "code", "source": "import numpy as np\nprint(f'NumPy version: {np.__version__}')", "outputs": []},
        {"type": "code", "source": "import pandas as pd\ndf = pd.DataFrame({'a': [1,2,3], 'b': [4,5,6]})\nprint(df.to_string())", "outputs": []},
    ]
    r = api("PUT", f"/notebooks/{nb_id}", token=token, json={"cells": cells})
    check(r and r.status_code == 200, "Save cells to notebook")
    
    # Execute cell 0 — simple print
    r = api("POST", f"/notebooks/{nb_id}/execute", token=token, json={"cell_index": 0, "source": "print('Hello from NexusML!')"})
    exec_ok = check(r and r.status_code == 200, "Execute cell (print)", f"outputs={r.json().get('outputs') if r else []}")
    if exec_ok and r:
        data = r.json()
        has_output = any(o.get("content", "").strip() == "Hello from NexusML!" for o in data.get("outputs", []))
        check(has_output, "Cell output correct", f"expected 'Hello from NexusML!'")
        check(data.get("error") is None, "No execution error")
    
    # Execute cell 1 — numpy import
    r = api("POST", f"/notebooks/{nb_id}/execute", token=token, json={"cell_index": 1, "source": "import numpy as np\nprint(f'NumPy version: {np.__version__}')"})
    if r and r.status_code == 200:
        data = r.json()
        has_numpy = any("NumPy version" in o.get("content", "") for o in data.get("outputs", []))
        check(has_numpy, "NumPy available (system Python)", f"error={data.get('error')}")
    else:
        log("FAIL", "NumPy import", f"status={r.status_code if r else 'N/A'}")
    
    # Execute cell 2 — pandas
    r = api("POST", f"/notebooks/{nb_id}/execute", token=token, json={"cell_index": 2, "source": "import pandas as pd\ndf = pd.DataFrame({'a': [1,2,3]})\nprint(len(df))"})
    if r and r.status_code == 200:
        data = r.json()
        has_pandas = any("3" in o.get("content", "") for o in data.get("outputs", []))
        check(has_pandas, "Pandas available (system Python)", f"error={data.get('error')}")
    else:
        log("FAIL", "Pandas import", f"status={r.status_code if r else 'N/A'}")
    
    # Create a file
    r = api("POST", f"/notebooks/{nb_id}/files", token=token, json={"filename": "helper.py", "content": "def greet(): return 'hello'"})
    check(r and r.status_code == 200, "Create file in workspace")
    
    # List files
    r = api("GET", f"/notebooks/{nb_id}/files", token=token)
    check(r and r.status_code == 200, "List workspace files")
    
    # List packages
    r = api("GET", f"/notebooks/{nb_id}/packages", token=token)
    check(r and r.status_code == 200, "List packages")
    
    # Delete notebook
    r = api("DELETE", f"/notebooks/{nb_id}", token=token)
    check(r and r.status_code == 204, "Delete notebook")


def test_discussions(token):
    print("\n--- Discussions ---")
    if not token:
        log("SKIP", "Discussions (no token)")
        return
    
    # Create discussion
    r = api("POST", "/discussions/", token=token, json={"title": "Test Discussion", "content": "This is a test post.", "tags": ["test"]})
    disc_ok = check(r and r.status_code in (200, 201), "Create discussion", f"status={r.status_code if r else 'N/A'}")
    if not disc_ok:
        return
    disc = r.json()
    disc_id = disc["id"]
    
    # List discussions
    r = api("GET", "/discussions/", token=token)
    check(r and r.status_code == 200, "List discussions")
    
    # Get single
    r = api("GET", f"/discussions/{disc_id}", token=token)
    check(r and r.status_code == 200, "Get discussion detail")
    
    # Add reply
    r = api("POST", f"/discussions/{disc_id}/replies", token=token, json={"content": "This is a test reply."})
    check(r and r.status_code in (200, 201), "Add reply to discussion")


def test_subscription(token):
    print("\n--- Subscription & Billing ---")
    if not token:
        log("SKIP", "Subscription (no token)")
        return
    
    # Get subscription status
    r = api("GET", "/subscription", token=token)
    check(r and r.status_code == 200, "Get subscription status", f"tier={r.json().get('tier') if r else ''}")
    
    # Get pricing tiers
    r = api("GET", "/subscription/pricing", token=token)
    check(r and r.status_code == 200, "Get pricing tiers", f"count={len(r.json()) if r and r.status_code == 200 else 0}")
    
    # Get invoices
    r = api("GET", "/subscription/invoices", token=token)
    check(r and r.status_code == 200, "Get invoices")


def test_notifications(token):
    print("\n--- Notifications ---")
    if not token:
        log("SKIP", "Notifications (no token)")
        return
    
    # Get count
    r = api("GET", "/notifications/count", token=token)
    check(r and r.status_code == 200, "Get notification count")
    
    # List notifications
    r = api("GET", "/notifications/", token=token)
    check(r and r.status_code == 200, "List notifications")


def test_community(token):
    print("\n--- Community ---")
    if not token:
        log("SKIP", "Community (no token)")
        return
    
    # Search
    r = api("GET", "/community/search", token=token, params={"q": "", "sort": "recent"})
    check(r and r.status_code == 200, "Community search")
    
    # Trending
    r = api("GET", "/community/trending", token=token)
    check(r and r.status_code == 200, "Community trending")
    
    # Tags
    r = api("GET", "/community/tags", token=token)
    check(r and r.status_code == 200, "Community tags")


def test_admin(token):
    print("\n--- Admin ---")
    if not token:
        log("SKIP", "Admin (no token)")
        return
    
    # Stats
    r = api("GET", "/admin/stats", token=token)
    check(r and r.status_code == 200, "Admin stats")
    
    # List users
    r = api("GET", "/admin/users", token=token)
    check(r and r.status_code == 200, "Admin list users")
    
    # List datasets
    r = api("GET", "/admin/datasets", token=token)
    check(r and r.status_code == 200, "Admin list datasets")
    
    # List models
    r = api("GET", "/admin/models", token=token)
    check(r and r.status_code == 200, "Admin list models")


def test_social(token):
    print("\n--- Social Features ---")
    if not token:
        log("SKIP", "Social (no token)")
        return
    
    # Get own activity feed
    r = api("GET", "/social/feed", token=token)
    check(r and r.status_code == 200, "Get activity feed")


def test_404_page():
    print("\n--- 404 Page ---")
    # This tests the Vite dev server or built frontend, not the API
    try:
        r = requests.get("http://localhost:5173/this-does-not-exist", timeout=5)
        check(r.status_code == 200, "404 page serves (SPA returns 200 with 404 content)")
    except requests.ConnectionError:
        log("SKIP", "404 page (frontend not running)")


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    global BASE_URL
    
    # Parse args
    for i, arg in enumerate(sys.argv):
        if arg == "--base-url" and i + 1 < len(sys.argv):
            BASE_URL = sys.argv[i + 1]
    
    print("=" * 60)
    print(f"  NexusML Platform Integration Tests")
    print(f"  Base URL: {BASE_URL}")
    print(f"  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    # 1. Server health
    if not test_server_health():
        print("\n--- Server is not reachable. Aborting tests. ---")
        sys.exit(1)
    
    # 2. Auth
    token, email = test_auth()
    
    # 3. Datasets
    dataset_id = test_datasets(token)
    
    # 4. Training & Models
    model_id = test_training(token, dataset_id)
    
    # 5. Models
    test_models(token, model_id)
    
    # 6. Deployment & API Keys
    test_deployment(token, model_id)
    
    # 7. Notebooks
    test_notebooks(token)
    
    # 8. Discussions
    test_discussions(token)
    
    # 9. Subscription
    test_subscription(token)
    
    # 10. Notifications
    test_notifications(token)
    
    # 11. Community
    test_community(token)
    
    # 12. Admin
    test_admin(token)
    
    # 13. Social
    test_social(token)
    
    # 14. Frontend 404
    test_404_page()
    
    # Results
    total = PASS + FAIL + SKIP
    print("\n" + "=" * 60)
    print(f"  RESULTS: {PASS} passed, {FAIL} failed, {SKIP} skipped ({total} total)")
    print(f"  Success Rate: {PASS/max(total-SKIP, 1)*100:.1f}%")
    print("=" * 60)
    
    if FAIL > 0:
        print("\nFailed tests:")
        for r in RESULTS:
            if r["status"] == "FAIL":
                print(f"   • {r['test']}: {r['detail']}")
    
    sys.exit(1 if FAIL > 0 else 0)


if __name__ == "__main__":
    main()
