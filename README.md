# 🛡️ SessionSentinel

**AI Agent Behavioral Monitoring & Threat Detection System**

SessionSentinel is an advanced threat detection platform designed specifically for autonomous LLM agents. Instead of looking for traditional static indicators of compromise, it uses **Machine Learning (Sentence Transformers + DBSCAN clustering)** to detect adversarial behavior that spans across **multiple seemingly benign sessions**.

By correlating subtle cross-session behavior—like progressive data probing, credential harvesting, or tool enumeration—SessionSentinel detects coordinated attacks that traditional single-session guardrails miss entirely.

---

## 🚀 Key Features

- **Behavioral Fingerprinting**: Converts unstructured agent tool calls and actions into canonical, structured behavioral sequences.
- **Cross-Session ML Clustering**: Uses SentenceTransformers (`all-MiniLM-L6-v2`) and DBSCAN to group mathematically similar sessions across time and agents.
- **Multi-Vector Pattern Engine**: Deterministically analyzes clusters to identify specific threat vectors (Boundary Probing, Privilege Escalation, Tool Enumeration, Credential Harvesting).
- **Risk Scoring & Decay**: Assigns accumulating risk scores to agents based on frequency, similarity, and sensitive tool access. Risk scores decay automatically after configurable inactivity windows.
- **LLM Threat Explanations**: Generates human-readable, plain-English explanations of detected threats using NVIDIA NIM (with Groq fallback).
- **Interactive Simulator**: Features a live Chat Simulator where you can act as a malicious user against a simulated LLM to trigger real-time guardrail logging.
- **Premium React Dashboard**: A state-of-the-art dark/light mode UI built with React and Vite to visualize active threats, risky agents, and raw session telemetry.

## 🛠️ Tech Stack

- **Backend**: FastAPI, PostgreSQL, SQLAlchemy (async)
- **ML Pipeline**: Scikit-learn (DBSCAN), SentenceTransformers
- **LLM Integrations**: NVIDIA NIM (primary), Groq (fallback)
- **Frontend**: Vite, React, TypeScript, Vanilla CSS (Custom Design System)

## ⚙️ Setup Instructions

### 1. Configure the Environment
Set up your API keys and PostgreSQL database connection in `backend/.env`. The project uses an external Aiven PostgreSQL cloud database:
```env
POSTGRES_USER=avnadmin
POSTGRES_PASSWORD=<your_aiven_password>
POSTGRES_DB=defaultdb
POSTGRES_HOST=<your_aiven_host>.aivencloud.com
POSTGRES_PORT=14659
POSTGRES_SSLMODE=require

NVIDIA_NIM_API_KEY=your_nim_key
GROQ_API_KEY=your_groq_key
```

### 2. Start the Backend
Start the FastAPI server:
```bash
cd backend
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 3. Start the Frontend
Start the React dashboard using pnpm:
```bash
cd frontend
pnpm install
pnpm run dev
```
Navigate to `http://localhost:5173`.

---

## 🎥 The Killer Demo Flow

To demonstrate the full power of the cross-session correlation engine:

1. **Seed Realistic Data:**
   Run the seeding script to populate the database with 60 realistic sessions (42 benign, 18 adversarial).
   ```bash
   cd backend
   python seed_realistic.py
   ```
2. **Review the Raw Data:**
   Open the Dashboard at `http://localhost:5173`. Go to the **Session Store** page. You will see 60 sessions injected, but notice that their "Fingerprint" status is **Pending**.
3. **Run the ML Analysis Pipeline:**
   Go to the **Overview** or **Threats** page. Click the purple **Run Pipeline** button in the top right corner.
   - *Result*: The ML pipeline runs. It fingerprints all sessions, embeds them into high-dimensional vectors, runs DBSCAN clustering, flags the malicious clusters, scores the agents, and queries the LLM for explanations.
4. **Investigate the Threats:**
   The dashboard will instantly update to show 4 newly detected adversarial patterns (e.g., *Progressive Data Probing* and *Credential Harvesting*).
5. **View Agent Risk Profiles:**
   Navigate to the **Risky Agents** page to see the accumulating risk scores assigned to the attackers, demonstrating how cross-session tracking isolates bad agents.

---

## 📚 Documentation
For detailed insights into the architecture and requirements mapping, please review:
- [flow.md](./flow.md): System Architecture & Workflow Diagram

---

## ☁️ Aiven PostgreSQL Deployment

This project currently uses a managed Aiven PostgreSQL cluster. The configuration in `backend/.env` automatically constructs the database URL (via `backend/app/config.py`) to connect securely to the cloud instance using SSL.

### Migration Runbook (Reference)
1. **Provision**: Create a PostgreSQL service in Aiven and rotate the default `avnadmin` password.
2. **Snapshot**: Create a logical dump of your EC2 data (do not destroy EC2!):
   ```bash
   pg_dump -d "postgresql://local_user:local_pass@localhost:5432/sessionsentinel" --format=directory --jobs=4 -f ~/sessionsentinel-migration.dump
   ```
3. **Restore**: Restore data to Aiven using `--no-owner`:
   ```bash
   pg_restore -d "postgres://avnadmin:<password>@<aiven-host>:<port>/defaultdb?sslmode=require" --jobs=4 --no-owner ~/sessionsentinel-migration.dump
   ```
4. **Validate**: Use our automated schema & row-count validation script to ensure 1:1 parity before switching:
   ```bash
   cd backend
   export SOURCE_DB_URL="postgresql+asyncpg://..."
   export TARGET_DB_URL="postgresql+asyncpg://..."
   PYTHONPATH=. uv run python scripts/validate_aiven_migration.py
   ```
5. **Optimize**: Run `ANALYZE;` via `psql` on the Aiven target to rebuild statistics.
6. **Stamp Schema**: Since the data was restored directly into Aiven, we must tell Alembic that the baseline schema already exists to prevent it from trying to run `CREATE TABLE` again:
   ```bash
   cd backend
   uv run alembic stamp head
   ```
7. **Cutover**: Stop the application, update the `.env` file with Aiven credentials (`POSTGRES_SSLMODE=verify-full`), and restart the backend!
