This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/pages/api-reference/create-next-app).

## Local YOLO fridge detection (optional)

Fridge item detection can use a **local** Ultralytics YOLOv8 service under `inference/`, or your existing **remote** FastAPI (`NEXT_PUBLIC_API_URL` / `FASTAPI_URL` / `ML_API_URL`).

### 1. Place the model

Weights live at `inference/models/best.pt` (default). You can override with the `MODEL_PATH` environment variable (absolute or relative to the `inference/` directory).

### 2. Run the Python inference server

```bash
cd inference
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
```

Start the API (from the `inference/` directory so paths resolve predictably):

```bash
# Still inside inference/, with venv active
uvicorn app:app --host 0.0.0.0 --port 8000
```

- **Health check:** [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)
- **Detect:** `POST /detect` (multipart form: `image` file, optional form field `conf`, default `0.25`)

### 3. Configure Next.js

Copy `env.example` to `.env.local` and set at least:

| Variable | Purpose |
| -------- | ------- |
| `USE_LOCAL_MODEL` | `true` to use local YOLO; `false` to use the external API for `/api/fridge/detect` |
| `LOCAL_MODEL_URL` | Base URL of the Python server (default `http://localhost:8000`) |
| `NEXT_MONGODB_URI` | MongoDB connection (required for saving fridge items) |
| `NEXT_PUBLIC_API_URL` | Remote FastAPI base URL (required when `USE_LOCAL_MODEL` is not `true`, and for other ML routes in the app) |

Example for **local YOLO + Next** dev:

```env
USE_LOCAL_MODEL=true
LOCAL_MODEL_URL=http://localhost:8000
```

### 4. Run the Next.js app (second terminal)

From the **project root** (not `inference/`):

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), go to the Fridge Detector, upload an image, and run **Detect & Save**. The API route `POST /api/fridge/detect` will call `http://localhost:8000/detect` when `USE_LOCAL_MODEL=true`.

### Deployment note

- The Next.js app (e.g. Vercel) does **not** run `best.pt`; deploy the `inference/` service separately (e.g. Render, Fly.io, a VM) with the same env vars, and point `LOCAL_MODEL_URL` at that public URL if you use local inference in production.

## Getting started (Next.js only)

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.js`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) are mapped to `/api/*` under `pages/api/`.

This project uses [`next/font`](https://nextjs.org/docs/pages/building-your-application/optimizing/fonts) to optimize and load [Geist](https://vercel.com/font).

## Learn more

- [Next.js Documentation](https://nextjs.org/docs) — features and API.
- [Learn Next.js](https://nextjs.org/learn-pages-router) — interactive tutorial.

## Deploy on Vercel

The [Vercel Platform](https://vercel.com/new) works well for the **Next.js** frontend and API routes. The **Python** inference service should be hosted separately; see *Deployment note* above.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/pages/building-your-application/deploying) for more details.
