"""
NexusML - Rigorous Platform Validation & Stress Suite
======================================================
Tests edge cases, authentication isolation, negative bounds, and concurrency.
Runs alongside standard integration tests.
Requirements: standard library only.
"""

import requests
import io
import os
import sys
import uuid
import time
import concurrent.futures
from datetime import datetime

# Force UTF-8 output on Windows
if os.name == 'nt':
    # Changed wrapper to line-buffered so output isn't hidden
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace', line_buffering=True)
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace', line_buffering=True)

BASE_URL = "http://localhost:8000/api/v1"

# Metrics
PASS = 0
FAIL = 0
RESULTS = []

# ── Logging ──────────────────────────────────────────────────────────────────

def log(status: str, test: str, detail: str = ""):
    global PASS, FAIL
    icon = {"PASS": "\033[92m[PASS]\033[0m", "FAIL": "\033[91m[FAIL]\033[0m"}.get(status, f"[{status}]")
    if status == "PASS": PASS += 1
    elif status == "FAIL": FAIL += 1
    
    # Strip ansi codes for windows standard terminals if needed, but modern windows terminal supports them.
    msg = f"  {icon} {test}" + (f" -- {detail}" if detail else "")
    print(msg)
    RESULTS.append({"status": status, "test": test, "detail": detail})

def alert(msg):
    print(f"\n\033[93m>>> {msg}\033[0m")

# ── API Helpers ──────────────────────────────────────────────────────────────

def api(method, path, token=None, **kwargs):
    url = f"{BASE_URL}{path}"
    headers = kwargs.pop("headers", {})
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        return requests.request(method, url, headers=headers, timeout=10, **kwargs)
    except Exception as e:
        return type('FakeResponse', (object,), {'status_code': 0, 'text': str(e), 'json': lambda: {}})()

def create_user():
    email = f"test_{uuid.uuid4().hex[:8]}@nexusmltest.com"
    password = "Str0ngPassword123!"
    r = api("POST", "/auth/register", json={"email": email, "password": password, "full_name": "Test User"})
    if r.status_code == 201:
        r2 = api("POST", "/auth/login", json={"email": email, "password": password})
        if r2.status_code == 200:
            return email, password, r2.json().get("access_token")
    return None, None, None

# ── Tests ────────────────────────────────────────────────────────────────────

def test_security_isolation():
    alert("Phase 1: Security & Cross-Account Isolation")
    
    # Setup users
    userA_email, _, tokenA = create_user()
    userB_email, _, tokenB = create_user()
    
    if not tokenA or not tokenB:
        log("FAIL", "Setup Users", "Could not create isolation users.")
        return
        
    # User A creates a dataset
    csv_data = "a,b\n1,2\n3,4"
    rA = api("POST", "/data/upload", token=tokenA, 
             files={"file": ("test_iso.csv", csv_data.encode(), "text/csv")},
             data={"name": "A_Dataset", "description": "Private"})
    
    if rA.status_code not in (200, 201):
        log("FAIL", "User A creates dataset", f"status={rA.status_code}")
        return
    ds_id = rA.json().get("id")
    
    # Verify User B cannot view User A's dataset
    rB = api("GET", f"/data/datasets/{ds_id}", token=tokenB)
    if rB.status_code in (404, 403):
        log("PASS", "Isolation: User B cannot view A's dataset", f"status={rB.status_code}")
    else:
        log("FAIL", "Isolation: User B cannot view A's dataset", f"status={rB.status_code}")
        
    # Verify User B cannot delete User A's dataset
    rB_del = api("DELETE", f"/data/datasets/{ds_id}", token=tokenB)
    if rB_del.status_code in (404, 403):
        log("PASS", "Isolation: User B cannot delete A's dataset", f"status={rB_del.status_code}")
    else:
        log("FAIL", "Isolation: User B cannot delete A's dataset", f"status={rB_del.status_code}")
        
    # Unauthenticated access checks
    r_noauth = api("GET", "/data/datasets")
    if r_noauth.status_code in (401, 403):
        log("PASS", "Security: Unauthenticated API blocking", "GET /data/datasets blocked")
    else:
        log("FAIL", "Security: Unauthenticated API blocking", f"status={r_noauth.status_code}")


def test_input_validation():
    alert("Phase 2: Input Validation & Boundaries")
    _, _, token = create_user()
    
    if not token:
        log("FAIL", "Setup User for validation", "Failed to create user.")
        return
        
    # Extreme payload length testing (>1MB string)
    payload_huge = "A" * (1024 * 1024)
    r = api("POST", "/discussions/", token=token, json={"title": "Too Big", "content": payload_huge, "tags": []})
    if r.status_code == 413 or r.status_code == 422:
        log("PASS", "Boundary: Reject massive content payload safely", f"status={r.status_code}")
    else:
        log("FAIL", "Boundary: Reject massive content payload", f"Server accepted 1MB string or threw error. status={r.status_code}")

    # Missing required attributes tests
    r2 = api("POST", "/auth/login", json={"email": "not_an_email"})
    if r2.status_code in (422, 400):
        log("PASS", "Validation: Reject missing parameters", f"status={r2.status_code}")
    else:
        log("FAIL", "Validation: Reject missing parameters", f"status={r2.status_code}")
        
    # Malformed JSON payload
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    r3 = requests.post(f"{BASE_URL}/discussions/", headers=headers, data='{"title": "Broken", "cont')
    if r3.status_code in (400, 422):
        log("PASS", "Validation: Reject malformed JSON correctly", f"status={r3.status_code}")
    else:
        log("FAIL", "Validation: Reject malformed JSON correctly", f"status={r3.status_code}")

def test_lifecycle_workflows():
    alert("Phase 3: Lifecycle Integrity Constraints")
    _, _, token = create_user()
    
    # Try deploying a non-existent model
    bad_model_id = "00000000-0000-0000-0000-000000000000"
    r = api("POST", f"/deploy/{bad_model_id}", token=token)
    if r.status_code == 404:
        log("PASS", "Lifecycle: Handle deployment of ghost model gracefully", f"status={r.status_code}")
    else:
        log("FAIL", "Lifecycle: Handle deployment of ghost model gracefully", f"status={r.status_code}")
        
    # Regenerate a ghost API key
    bad_key_id = "00000000-0000-0000-0000-000000000000"
    r2 = api("POST", f"/deploy/keys/{bad_key_id}/regenerate", token=token)
    if r2.status_code == 404:
        log("PASS", "Lifecycle: Handle regenerate of ghost key correctly", f"status={r2.status_code}")
    else:
        log("FAIL", "Lifecycle: Handle regenerate of ghost key correctly", f"status={r2.status_code}")

def test_rate_limiting_stress():
    alert("Phase 4: Concurrency Stress Test")
    email, pwd, token = create_user()
    
    if not token:
        log("FAIL", "Setup Burst User", "Failed setup.")
        return
        
    # Fire off 30 simultaneous login requests to trigger burst limiting
    def do_req(_):
        return api("POST", "/auth/login", json={"email": email, "password": pwd}).status_code
        
    burst_count = 30
    status_codes = []
    
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=30) as executor:
            future_to_req = {executor.submit(do_req, i): i for i in range(burst_count)}
            for future in concurrent.futures.as_completed(future_to_req):
                status_codes.append(future.result())
                
        # If rate limiter is active, we should see some 429 status codes.
        if 429 in status_codes:
             log("PASS", "Stress: Rate limiter successfully triggered (HTTP 429)", f"Codes observed: {set(status_codes)}")
        else:
             log("FAIL", "Stress: No rate limiting observed", f"Codes observed: {set(status_codes)}")
    except Exception as e:
        log("FAIL", "Stress: Server failed handling concurrent burst", str(e))

# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  NexusML Rigorous Validation & Stress Suite")
    print(f"  Target URL: {BASE_URL}")
    print(f"  Started:    {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    # Ping server
    chk = api("GET", "/../docs")
    if chk.status_code == 0:
         print("CRITICAL ERROR: Backend server is not running on localhost:8000!")
         sys.exit(1)

    time.sleep(1)
    test_security_isolation()
    
    time.sleep(1)
    test_input_validation()
    
    time.sleep(1)
    test_lifecycle_workflows()
    
    time.sleep(1)
    test_rate_limiting_stress()

    print("\n" + "=" * 60)
    total = PASS + FAIL
    print(f"  RIGOROUS SUMMARY: {PASS} passed, {FAIL} failed ({total} total)")
    print(f"  Resilience Score: {PASS/max(total, 1)*100:.1f}%")
    print("=" * 60)
    
    if FAIL > 0:
        print("\nVulnerabilities / Failures Detected:")
        for r in RESULTS:
            if r["status"] == "FAIL":
                 print(f"  -> {r['test']}: {r['detail']}")

    sys.exit(1 if FAIL > 0 else 0)

if __name__ == "__main__":
    main()
