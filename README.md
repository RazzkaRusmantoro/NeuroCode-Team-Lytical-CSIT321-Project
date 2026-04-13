# NeuroCode Team Lytical CSIT321 Project

## Project Overview

**NeuroCode** connects to your team’s repositories and turns a live codebase into a navigable system. It helps you explain and onboard without reading every file. It provides structural maps of component relationships, documentation and guided paths tied to the actual tree, and workflows that highlight risky or high-churn areas.

The backend uses **retrieval-augmented generation (RAG)**. Source files are **chunked**, **embedded** with transformer-style models, indexed in a **vector database** for similarity search, and then passed to **LLMs** as retrieved context. This keeps answers, docs, and assistants grounded in your repo rather than generic model priors.

The system also uses **deterministic code analysis** (parse trees, dependency and symbol structure) and a **knowledge graph** view of the system. The product combines **structured graph signals**, **vector retrieval**, and **probabilistic generation**.

**The goal** is faster ramp-up, less stale institutional knowledge, and a shared picture of how the system works for everyone who ships code.

[![YouTube Demo Video](https://img.youtube.com/vi/0nnDuntck44/0.jpg)](https://www.youtube.com/watch?v=0nnDuntck44)
 
Watch the demo on YouTube: https://www.youtube.com/watch?v=0nnDuntck44

## Disclaimer

> **Important:** Run this project as Administrator!
>
> If you cannot run the repo locally, you can also visit `neurocode.lol` instead.

## Prerequisites

- Administrator permissions
- Node.js installed for the frontend
- Python installed for the backend

## How to Install

1. Install frontend dependencies:

   ```bash
   cd frontend
   npm install
   ```

2. Install backend dependencies:

   ```bash
   cd backend
   pip install -r requirements.txt
   ```

## How to Run

1. Start the backend:

   ```bash
   cd backend
   python run.py
   ```

2. Start the frontend:

   ```bash
   cd frontend
   npm run dev
   ```

3. (Optional) Start the background worker if you want queue mode / async job processing:

   ```bash
   cd backend
   python -m neurocode.worker
   ```

> The worker is only needed when `INDEX_USE_ARQ` is enabled or if `INDEX_INLINE` is set to queue/off mode. This is the recommended setup when you want indexing and knowledge-graph work to run asynchronously instead of immediately inside the API process.

## Environment Configuration

Create your runtime environment files from the examples in the repository.

- Frontend: copy `.env.example.frontend` into `frontend/.env.local`
- Backend: copy `.env.example.backend` into `backend/.env`

### Frontend variables (`frontend/.env.local`)

- `NODE_ENV`: should be `development` for local runs.
- `MONGODB_URI`: MongoDB connection string used by frontend auth and data services.
- `NEXTAUTH_SECRET`: secret used by NextAuth for session signing.
- `NEXT_PUBLIC_APP_URL`: frontend app URL, typically `http://localhost:3000`.
- `PYTHON_SERVICE_URL`: backend API URL, typically `http://localhost:8000`.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: Google OAuth credentials for sign-in.
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`: GitHub OAuth credentials for sign-in.
- `ANTHROPIC_API_KEY`: optional Anthropic key for AI-powered features.
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION` / `S3_BUCKET_NAME`: AWS credentials and bucket name for S3 storage.
- `NEO4J_URI` / `NEO4J_USERNAME` / `NEO4J_PASSWORD` / `NEO4J_DATABASE` / `AURA_INSTANCEID` / `AURA_INSTANCENAME`: Neo4j Aura database connection settings.
- `RESEND_API_KEY`: API key for email or notification service integration.
- `OPENAI_API_KEY`: API key for OpenAI services.

### Backend variables (`backend/.env`)

- `MONGODB_URI`: MongoDB connection string used by the backend.
- `QDRANT_URL`: remote Qdrant vector database URL.
- `QDRANT_API_KEY`: API key for Qdrant access.
- `QDRANT_LOCAL_PATH`: local persistence path for vector storage if Qdrant is not used.
- `NEO4J_URI` / `NEO4J_USERNAME` / `NEO4J_PASSWORD` / `NEO4J_DATABASE` / `AURA_INSTANCEID` / `AURA_INSTANCENAME`: Neo4j graph database settings.
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION` / `S3_BUCKET_NAME`: AWS credentials and bucket name for S3 file storage.
- `EMBEDDING_MODEL`: the model to use for generating embeddings.
- `ANTHROPIC_API_KEY`: Anthropic API key for AI request handling.
- `ANTHROPIC_MODEL` / `ANTHROPIC_MODEL_FAST`: Anthropic model names for standard and fast requests.
- `REDIS_URL`: Redis connection URL for caching or background processing.
- `HOST`: backend host binding, usually `0.0.0.0`.
- `PORT`: backend port, usually `8000`.
- `ENV`: environment mode, e.g. `development`.
- `HF_TOKEN`: Hugging Face token for model or embedding access.
- `OPENAI_API_KEY`: OpenAI API key for AI services.
- `CORS_ORIGINS`: comma-separated allowed frontend origins, such as `http://localhost:3000,http://127.0.0.1:3000`.
- `INDEX_USE_ARQ`: set to `true` / `1` / `yes` to enable queue mode and send indexing jobs to the background worker.
- `INDEX_INLINE`: if set to `0` / `false` / `no` / `off` / `arq` / `queue`, the backend will also use queue mode instead of running indexing inline.

Use the values from `.env.example.frontend` and `.env.example.backend` as your starting point, then save the actual values in the respective `frontend/.env.local` and `backend/.env` files.




