# NexusML — Feature Audit & Advanced Training Hyperparameters

## Current Platform Status

| Area | Pages | Status |
|------|-------|--------|
| **Auth** | Login, Register | ✅ Solid |
| **Data** | DataExplorer, DataPrepStudio | ✅ Solid — upload, EDA, transforms, visibility toggle |
| **Training** | TrainingStudio | ⚠️ Works but lacks hyperparameter controls |
| **Models** | ModelHub, ModelDetail, TestingPlayground, ExplainabilityLab, DeploymentHub | ✅ Solid |
| **Community** | ExplorePage, DiscussionsPage, UserProfilePage | ✅ Solid |
| **Notebooks** | NotebooksPage, NotebookEditor | ✅ Solid (venvs, pip, files, dataset import) |
| **Competitions** | CompetitionsPage, LeaderboardPage | ✅ Solid |
| **Admin** | AdminPage | ✅ Solid |
| **Account** | ManageProfilePage, ManageBillingPage, PricingPage | ✅ Solid |

---

## Missing Features (Priority Ordered)

### 🏆 Tier 1 — Must Have Now

#### 1. Advanced Training Hyperparameters (THIS TASK)
The training studio currently only offers time budget. It should offer **optional** advanced controls:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `n_estimators` | 100 | Number of trees/estimators |
| `max_depth` | None (auto) | Max tree depth |
| `learning_rate` | 0.1 | Step size for gradient boosting |
| `test_size` | 0.2 | Train/test split ratio |
| `random_state` | 42 | Reproducibility seed |
| `epochs` | auto | For deep learning tasks |
| `batch_size` | 32 | Mini-batch size |
| `algorithm` | "auto" | Let user pick specific algorithm |

> [!IMPORTANT]
> All parameters are **optional** — if user doesn't touch them, the system works exactly as it does now with smart defaults.

**Frontend changes:**
- Add collapsible "Advanced Settings" accordion in Step 1 (Configure)
- Algorithm picker: let user choose specific model or "Auto (best of 3)"
- Hyperparameter sliders/inputs for the selected algorithm
- "Reset to Defaults" button

**Backend changes:**
- Extend `TrainingConfig` schema with new fields
- Read config values in `_run_training_background` and pass to sklearn constructors

---

### 🔧 Tier 2 — Should Have Soon

#### 2. Model Comparison View
- Side-by-side metric comparison of all trained models
- Currently individual cards exist but no comparison table/chart

#### 3. Dataset Version History
- Track previous versions from transforms
- Currently `version` field exists but no UI to browse/rollback

#### 4. Notification System
- The bell icon exists but does nothing
- Wire up: training complete, new follower, competition deadline alerts

#### 5. Download Model Artifacts
- Export trained `.pkl` model files for local use
- Currently stored in MinIO but no download endpoint on frontend

---

### 🌟 Tier 3 — Nice to Have

#### 6. Discussion Threads (replies/comments)
- Currently flat list, add nested replies

#### 7. Organization Settings Page
- Frontend for org management (invite members, manage permissions)

#### 8. Activity Feed on Dashboard
- Show recent activity from followed users

#### 9. Scheduled/Recurring Training Jobs
- Re-train models on a schedule

#### 10. API Key Management
- Let users generate API keys for their deployed models

---

## Proposed Changes (Tier 1 — Advanced Training)

### Backend Schema

#### [MODIFY] [schemas.py](file:///c:/Users/karta/ml_plattform/backend/app/schemas/schemas.py)
Extend `TrainingConfig` with:
- `n_estimators`, `max_depth`, `learning_rate`, `test_size`, `random_state`
- `algorithm`: "auto" | "logistic_regression" | "random_forest" | "gradient_boosting" | "linear_regression"

#### [MODIFY] [training.py](file:///c:/Users/karta/ml_plattform/backend/app/api/v1/training.py)
Read new config values and pass to sklearn model constructors.

### Frontend

#### [MODIFY] [TrainingStudio.tsx](file:///c:/Users/karta/ml_plattform/frontend/src/pages/TrainingStudio.tsx)
Add collapsible "Advanced Settings" panel in Step 1 with:
- Algorithm selector (dropdown)
- Hyperparameter controls (sliders/inputs) that appear based on selected algorithm
- All optional — hidden by default in an accordion

---

## Verification Plan

### Automated Tests
- `py_compile` all modified backend files
- `npx tsc --noEmit` for frontend
- Visual browser verification of the training page

### Manual Verification
- Train a model with default settings → should work exactly as before
- Train a model with custom hyperparameters → should respect the values
