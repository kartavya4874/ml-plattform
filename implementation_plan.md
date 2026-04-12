# NexusML — Comprehensive Feature Audit

> Audited from two perspectives:
> 1. **🧑‍💼 Non-tech user** — "I just want to upload data and get a model without understanding code"
> 2. **👩‍💻 AI developer** — "I want fine-grained control, reproducibility, and professional workflows"

---

## 🔴 CRITICAL GAPS — Without these, the platform feels broken

### 1. Model Detail Page is EMPTY (424 bytes)
`ModelDetail.tsx` is a stub — clicking a model card just shows "Model ID: xxx". This is the most viewed page after Dashboard.

**What it needs:**
- Model name, description, metrics summary
- Confusion matrix visualization (classification)
- Feature importance chart (RandomForest/GradientBoosting have this built-in)
- Training configuration used
- Download model (.pkl) button
- Public/private toggle
- Tags editor
- "Test this model" and "Deploy" quick action buttons
- Training history (accuracy over epochs if applicable)

### 2. No Feature Selection in Training
Non-tech users don't know which columns to exclude (IDs, names, dates that shouldn't be features). The training pipeline blindly uses ALL columns except target.

**What it needs:**
- Column checkboxes to include/exclude features
- Auto-detect and suggest excluding ID-like columns (unique values == row count)
- Auto-detect and warn about high-cardinality categoricals

### 3. No Training Hyperparameters (your request)
Currently only "time budget" slider. No-code users need simple presets, developers need full control.

**What it needs (collapsible "Advanced Settings"):**
- **Algorithm selector**: Auto / LogisticRegression / RandomForest / GradientBoosting / XGBoost / SVM / KNN
- **n_estimators**: 10-1000 slider (for tree-based)
- **max_depth**: None/1-50 (for tree-based)
- **learning_rate**: 0.001-1.0 (for boosting)
- **test_size**: 0.1-0.4 slider
- **cross_validation**: None / 3-fold / 5-fold / 10-fold
- **Presets**: "Quick (30s)", "Balanced (2min)", "Best Quality (10min)"

### 4. No Model Download / Export
Users train models but can't download them. The `.pkl` is in MinIO but there's no download button anywhere.

### 5. No Dataset Download
Public datasets on the Explore page have no download button. Users can't actually download and use public datasets.

---

## 🟠 HIGH PRIORITY — Platform feels incomplete without these

### 6. Dashboard is Static for New Users
A brand new user sees zeros everywhere and no guidance.

**What it needs:**
- "Getting Started" checklist: ☐ Upload first dataset → ☐ Train first model → ☐ Deploy model
- Sample datasets button ("Try with Iris / Titanic / MNIST")
- Guided tour / tooltip walkthrough

### 7. No Global Search
No way to search across the platform. The Explore page has search, but it's only for public community content.

### 8. Notification Bell Does Nothing
`NotifIcon` renders but is non-functional, feels broken.

**What it needs:**
- Training job completed/failed alerts
- New follower notifications
- Competition deadline reminders
- "Someone starred/forked your dataset" alerts

### 9. No Data Preprocessing Guidance for Non-Tech Users
The DataPrepStudio has transforms but no guidance. A non-tech user doesn't know:
- What "handle missing values" means or why it matters
- Which columns should be normalized
- What label encoding does

**What it needs:**
- "Auto-fix" button: one-click handle nulls + encode categoricals + normalize numerics
- Plain English descriptions: "3 columns have missing values. Click to fill them automatically."

### 10. Discussion Replies Don't Exist
Discussions are flat — no threaded replies, no upvotes, no likes. Feels like a broken forum.

### 11. No Confusion Matrix / ROC Curve Visualization
After training, users see raw numbers (accuracy: 0.92). Non-tech users don't understand what this means.

**What it needs:**
- Visual confusion matrix (heatmap)
- ROC curve chart
- Feature importance bar chart
- Plain English summary: "Your model correctly predicts 92 out of 100 samples"

---

## 🟡 MEDIUM PRIORITY — Polish that separates good from great

### 12. No Onboarding Flow
First-time users land on Dashboard with no context.

**What it needs:**
- Welcome modal or stepper: "NexusML helps you build ML models without code"
- Step 1: Upload data → Step 2: Auto-train → Step 3: Deploy API
- Skip button for experienced users

### 13. No Model Comparison View
After training multiple models, users can't compare them side by side.

**What it needs:**
- Table comparing all models: name, algorithm, accuracy, f1, training time
- Sort by any metric
- Select 2+ models for side-by-side comparison

### 14. No Dataset Version History UI
`version` field exists on Dataset but no way to see/rollback previous versions in the UI.

### 15. No Batch Prediction
Testing Playground only does single predictions. No CSV upload for batch inference.

### 16. No Activity Feed / Social Feed
Dashboard shows only your own stats. No activity from followed users or community highlights.

### 17. Organization Management Page Missing
Backend org routes exist, but no frontend page for:
- Creating/managing organizations
- Inviting members
- Shared team resources

### 18. No API Key Management Page
Deployment generates API keys but there's no page to view/revoke/regenerate them.

### 19. No Feature Importance Before Training
Users should see which columns are most predictive BEFORE committing to a full training run.

### 20. No Auto-Detect Task Type
If target column has 2-10 unique values → suggest classification. If continuous → suggest regression. Currently the user must know.

---

## 🟢 NICE TO HAVE — Professional touches

### 21. No Dark/Light Theme Toggle
Currently hardcoded dark mode. Some users prefer light.

### 22. No Keyboard Shortcuts
Power users expect Ctrl+S to save, Ctrl+Enter to run cells in notebooks, etc.

### 23. No 404 Page
Navigating to a bad URL silently redirects to Dashboard.

### 24. No Public Landing Page
No marketing/hero page before login. Users can't see what the platform offers without creating an account.

### 25. No Documentation / Help Center
No in-app docs, API reference, or tutorials.

### 26. No Export Notebook to .ipynb
Notebooks can't be exported to Jupyter format.

### 27. No Audit Log (Admin)
Admin panel has no log of who did what.

### 28. No 2FA / Security Settings
No two-factor authentication option.

### 29. No Account Deletion
No GDPR-compliant account deletion.

### 30. No Model Serving Metrics Dashboard
Deployment shows usage stats but no time-series charts (requests over time, latency trends).

---

## Recommended Implementation Order

### Phase 4A — Fix Critical Gaps (do now)
1. **Model Detail page** — full rewrite with metrics, charts, download
2. **Training hyperparameters** — algorithm selection, all optional sliders
3. **Feature selection** — column include/exclude checkboxes
4. **Model download endpoint & button**
5. **Dataset download for public datasets**

### Phase 4B — High Priority Polish
6. **Getting Started checklist** on Dashboard
7. **Confusion matrix & feature importance** visualizations
8. **Auto-detect task type** from target column
9. **"Auto-fix data"** one-click preprocessing
10. **Notification system** (basic)

### Phase 4C — Community Completeness
11. **Discussion replies** (threaded)
12. **Org management page**
13. **Model comparison view**
14. **Batch prediction** in Testing Playground
15. **Activity feed** on Dashboard

### Phase 4D — Professional Polish
16. Onboarding flow
17. 404 page
18. API key management
19. Public landing page
20. Dark/light toggle

---

## Proposed Changes for Phase 4A

### [REWRITE] [ModelDetail.tsx](file:///c:/Users/karta/ml_plattform/frontend/src/pages/ModelDetail.tsx)
Full rewrite: metrics display, confusion matrix, feature importance chart, download button, visibility toggle, tag editor.

### [MODIFY] [TrainingStudio.tsx](file:///c:/Users/karta/ml_plattform/frontend/src/pages/TrainingStudio.tsx)
Step 1 additions:
- Collapsible "Advanced Settings" accordion
- Algorithm picker dropdown
- Hyperparameter sliders (n_estimators, max_depth, learning_rate, etc.)
- Feature column checkboxes (include/exclude)
- Auto-detect task type suggestion

### [MODIFY] [schemas.py](file:///c:/Users/karta/ml_plattform/backend/app/schemas/schemas.py)
Extend `TrainingConfig` with: `algorithm`, `n_estimators`, `max_depth`, `learning_rate`, `test_size`, `cross_validation`, `excluded_columns`.

### [MODIFY] [training.py](file:///c:/Users/karta/ml_plattform/backend/app/api/v1/training.py)
Read config hyperparameters, pass to sklearn constructors, support feature exclusion.

### [MODIFY] [data.py](file:///c:/Users/karta/ml_plattform/backend/app/api/v1/data.py)
Add `GET /data/datasets/{id}/download` for public dataset download.

### [MODIFY] [models_router.py](file:///c:/Users/karta/ml_plattform/backend/app/api/v1/models_router.py)
Add `GET /models/{id}/download` for model artifact download.

---

## Verification Plan
- `py_compile` + `tsc --noEmit` after each group
- Browser test each modified page
- Train a model with default settings → verify no regression
- Train with custom hyperparameters → verify they take effect
- Download a model artifact → verify file works
