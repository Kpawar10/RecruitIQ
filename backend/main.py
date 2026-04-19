"""
AI Resume Screener — FastAPI Backend
Endpoints: upload, analyze, rank, chat (streaming), analytics
"""

from fastapi import FastAPI
from fastapi import UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional
import asyncio
import json
import uuid
import io
 
from services.pdf_parser import extract_text_from_pdf
from services.embeddings import get_embedding, compute_similarity
from services.skills import extract_skills, SKILLS_LIST
from services.llm import stream_feedback, stream_chat_answer
from services.rag import ResumeRAG
from services.auth import create_user, authenticate_user, get_user_by_id, create_token, decode_token
from store import resume_store
from dotenv import load_dotenv
load_dotenv() 
from services.llm import prepare_resume_context
import os
print("PORT =", os.getenv("PORT"))
import sys
print(sys.path)
app = FastAPI(title="AI Resume Screener API", version="2.0")
print("🚀 Backend main.py loaded")
model = None

def get_model():
    global model
    if model is None:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer("all-MiniLM-L6-v2")
    return model

@app.get("/")
def health():
    return {"status": "running"}
@app.post("/ext/activate")
async def ignore_extension():
    return {"status": "ok"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Auth models & dependency ─────────────────────────────────────────────────
 
bearer = HTTPBearer(auto_error=False)
 
class SignupRequest(BaseModel):
    name: str
    email: str
    password: str
 
class LoginRequest(BaseModel):
    email: str
    password: str
 
def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> dict:
    if not creds:
        raise HTTPException(401, "Not authenticated.")
    data = decode_token(creds.credentials)
    if not data:
        raise HTTPException(401, "Invalid or expired token.")
    user = get_user_by_id(data["sub"])
    if not user:
        raise HTTPException(401, "User not found.")
    return user
 
 
@app.post("/auth/signup")
async def signup(req: SignupRequest):
    try:
        user = create_user(req.email, req.password, req.name)
    except ValueError as e:
        raise HTTPException(400, str(e))
    token = create_token(user["id"], user["email"])
    return {"token": token, "user": user}
 
 
@app.post("/auth/login")
async def login(req: LoginRequest):
    try:
        user = authenticate_user(req.email, req.password)
    except ValueError as e:
        raise HTTPException(401, str(e))
    token = create_token(user["id"], user["email"])
    return {"token": token, "user": user}
 
 
@app.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user
 

# ─── Models ──────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    resume_id: str
    question: str
    history: list[dict] = []


class AnalyzeRequest(BaseModel):
    resume_ids: list[str]
    job_description: str


# ─── Upload ──────────────────────────────────────────────────────────────────

@app.post("/upload")
async def upload_resume(file: UploadFile = File(...)):
    """Upload a single PDF resume. Returns resume_id."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported.")

    contents = await file.read()
    text = extract_text_from_pdf(io.BytesIO(contents))

    if not text.strip():
        raise HTTPException(422, "Could not extract text from PDF.")

    resume_id = str(uuid.uuid4())
    resume_store[resume_id] = {
        "id": resume_id,
        "filename": file.filename,
        "text": text,
        "rag": None,  # lazy init
    }

    return {"resume_id": resume_id, "filename": file.filename, "preview": text[:300]}


# ─── Analyze (single or batch) ───────────────────────────────────────────────

@app.post("/analyze")
async def analyze_resumes(req: AnalyzeRequest):
    """Score and rank multiple resumes against a job description."""
    if not req.job_description.strip():
        raise HTTPException(400, "Job description is required.")

    jd_embedding = get_embedding(req.job_description)
    jd_skills = extract_skills(req.job_description)

    results = []
    for rid in req.resume_ids:
        if rid not in resume_store:
            continue
        resume = resume_store[rid]
        text = resume["text"]

        res_embedding = get_embedding(text)
        semantic_score = float(compute_similarity(res_embedding, jd_embedding))

        res_skills = extract_skills(text)
        matched = list(set(res_skills) & set(jd_skills))
        missing = list(set(jd_skills) - set(res_skills))
        skill_score = len(matched) / len(jd_skills) if jd_skills else 0.0

        final_score = round(0.4 * semantic_score + 0.6 * skill_score, 4)

        results.append({
            "resume_id": rid,
            "filename": resume["filename"],
            "final_score": final_score,
            "semantic_score": round(semantic_score, 4),
            "skill_score": round(skill_score, 4),
            "matched_skills": matched,
            "missing_skills": missing,
            "status": "selected" if final_score >= 0.60 else "rejected",
        })

        # Persist for analytics
        resume_store[rid]["last_result"] = results[-1]

    results.sort(key=lambda x: x["final_score"], reverse=True)
    return {"results": results, "jd_skills": jd_skills}


# ─── Streaming LLM Feedback ──────────────────────────────────────────────────

@app.get("/feedback/stream")
async def stream_feedback_endpoint(resume_id: str, job_description: str):
    """Stream GPT-quality feedback for a resume vs JD."""
    if resume_id not in resume_store:
        raise HTTPException(404, "Resume not found.")

    result = resume_store[resume_id].get("last_result")
    if not result:
        raise HTTPException(400, "Analyze first before requesting feedback.")

    resume_text = resume_store[resume_id]["text"]
    prepare_resume_context(resume_text)
    async def generator():
        async for chunk in stream_feedback(resume_text, job_description, result):
            yield f"data: {json.dumps({'text': chunk})}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(
    generator(),
    media_type="text/event-stream",
    headers={
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    },
)


# ─── RAG Chat (streaming) ─────────────────────────────────────────────────────

@app.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    """Stream a ChatGPT-style answer about a specific resume."""
    if req.resume_id not in resume_store:
        raise HTTPException(404, "Resume not found.")

    entry = resume_store[req.resume_id]

    # Lazy-init RAG index
    if entry["rag"] is None:
        entry["rag"] = ResumeRAG(entry["text"])

    rag: ResumeRAG = entry["rag"]
    context = rag.retrieve(req.question, k=6)

    async def generator():
        async for chunk in stream_chat_answer(req.question, context, req.history):
            yield f"data: {json.dumps({'text': chunk})}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(
    generator(),
    media_type="text/event-stream",
    headers={
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",  # 🔥 important for streaming
    },
)


# ─── Analytics ───────────────────────────────────────────────────────────────

@app.get("/analytics")
async def get_analytics():
    """Aggregate missing skills trends across all analyzed resumes."""
    all_missing: dict[str, int] = {}
    all_matched: dict[str, int] = {}
    scores = []
    selected = rejected = 0

    for entry in resume_store.values():
        result = entry.get("last_result")
        if not result:
            continue
        scores.append(result["final_score"])
        if result["status"] == "selected":
            selected += 1
        else:
            rejected += 1
        for s in result["missing_skills"]:
            all_missing[s] = all_missing.get(s, 0) + 1
        for s in result["matched_skills"]:
            all_matched[s] = all_matched.get(s, 0) + 1

    top_missing = sorted(all_missing.items(), key=lambda x: -x[1])[:10]
    top_matched = sorted(all_matched.items(), key=lambda x: -x[1])[:10]

    return {
        "total": len(scores),
        "selected": selected,
        "rejected": rejected,
        "avg_score": round(sum(scores) / len(scores), 3) if scores else 0,
        "top_missing_skills": [{"skill": k, "count": v} for k, v in top_missing],
        "top_matched_skills": [{"skill": k, "count": v} for k, v in top_matched],
        "score_distribution": scores,
    }


@app.get("/resumes")
async def list_resumes():
    return [
        {"id": v["id"], "filename": v["filename"], "analyzed": "last_result" in v}
        for v in resume_store.values()
    ]


@app.delete("/resumes/{resume_id}")
async def delete_resume(resume_id: str):
    if resume_id not in resume_store:
        raise HTTPException(404, "Not found.")
    del resume_store[resume_id]
    return {"deleted": resume_id}