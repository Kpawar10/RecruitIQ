"""
LLM Streaming Service — uses Google Gemini (FREE) for streaming output.
Falls back gracefully if key is missing.

Set env var: GOOGLE_API_KEY=AIzaSy...
"""

import os
from dotenv import load_dotenv

load_dotenv()
import asyncio
from typing import AsyncIterator
from google import genai
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# Load embedding model (lightweight + free)
embedder = SentenceTransformer("all-MiniLM-L6-v2")
resume_chunks = []
resume_embeddings = None
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
print("API KEY LOADED:", bool(GOOGLE_API_KEY))
client = genai.Client(api_key=GOOGLE_API_KEY) if GOOGLE_API_KEY else None


# ─── STREAM FEEDBACK ─────────────────────────────────────────

async def stream_feedback(resume_text, job_description, result):
    if not client:
        async for chunk in _stream_mock_feedback(result):
            yield chunk
        return

    try:
        prompt = f"""
        You are an expert resume reviewer.

        

        Job Description:
        {job_description}

        Analysis:
        {result}

        Give:
        - Strengths
        - Weaknesses
        - Improvements
        """

        loop = asyncio.get_running_loop()

        def blocking():
            print("✅ Gemini called")
            try:
                response = client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=prompt,
                )
                return response.text
            except Exception as e:
                print("❌ Gemini Error:", e)
                return None

        full_text = await loop.run_in_executor(None, blocking)
        if not full_text:
            async for chunk in _stream_mock_feedback(result):  # or _stream_mock_chat
                yield chunk
            return

# ✅ Fake streaming (stable)
        for word in full_text.split(" "):
            yield word + " "
            await asyncio.sleep(0.01)
    except Exception as e:
        print("❌ Outer Error:", e)
        async for chunk in _stream_mock_feedback(result):
            yield chunk  
#_____________________________Prepare data____________________________
def prepare_resume_context(resume_text: str):
    global resume_chunks, resume_embeddings

    # Split into chunks
    resume_chunks = [chunk.strip() for chunk in resume_text.split("\n") if chunk.strip()]

    # Create embeddings
    resume_embeddings = embedder.encode(resume_chunks)


def get_relevant_context(question: str, top_k: int = 3):
     global resume_chunks, resume_embeddings

     if not resume_chunks:
         return ""

     question_embedding = embedder.encode([question])
     scores = cosine_similarity(question_embedding, resume_embeddings)[0]

     top_indices = np.argsort(scores)[-top_k:][::-1]

     context = "\n".join([resume_chunks[i] for i in top_indices])
     return context
# ─── STREAM CHAT ─────────────────────────────────────────────

def _generate_chatgpt_response(question: str, context: str) -> str:
    """Generate intelligent ChatGPT-like responses based on question and context."""
    
    q_lower = question.lower()
    
    # Extract key info from context
    lines = [line.strip() for line in context.split('\n') if line.strip()]
    context_summary = '\n'.join(lines[:5]) if lines else "General resume information"
    
    # Question Type: Experience/Background
    if any(word in q_lower for word in ['experience', 'background', 'worked', 'worked at', 'previous', 'history']):
        responses = [
            f"Based on the resume, {context_summary}. The candidate has demonstrated strong experience in these areas, showing consistent growth and responsibility over time.",
            f"Looking at the background: {context_summary}. This shows a solid foundation with relevant hands-on experience in the field.",
            f"From the resume: {context_summary}. The candidate has built valuable experience that would be beneficial for similar roles."
        ]
        return responses[len(question) % len(responses)]
    
    # Question Type: Skills
    elif any(word in q_lower for word in ['skill', 'skills', 'proficient', 'expertise', 'capable', 'good at', 'know']):
        responses = [
            f"The resume highlights: {context_summary}. These represent the candidate's core competencies and areas of expertise.",
            f"Based on the background: {context_summary}. The candidate demonstrates proficiency in multiple areas relevant to the role.",
            f"Looking at qualifications: {context_summary}. These skills show strong alignment with industry requirements."
        ]
        return responses[len(question) % len(responses)]
    
    # Question Type: Strength/Fit for Role
    elif any(word in q_lower for word in ['strength', 'strong', 'weak', 'fit', 'suitable', 'match', 'qualified']):
        responses = [
            f"Analyzing the resume: {context_summary}. The candidate shows strong strengths in these areas, making them well-suited for positions requiring these skills.",
            f"From a fit perspective: {context_summary}. These elements demonstrate good alignment with typical role requirements.",
            f"Considering qualifications: {context_summary}. The candidate possesses the foundational skills needed to excel in this domain."
        ]
        return responses[len(question) % len(responses)]
    
    # Question Type: Projects/Accomplishments
    elif any(word in q_lower for word in ['project', 'built', 'created', 'developed', 'accomplish', 'achievement', 'work on', 'worked on']):
        responses = [
            f"From the resume: {context_summary}. These projects showcase the candidate's ability to deliver tangible results and apply technical knowledge practically.",
            f"Looking at accomplishments: {context_summary}. The candidate has proven capability in executing and completing significant projects.",
            f"The project portfolio includes: {context_summary}. This demonstrates hands-on experience and problem-solving capabilities."
        ]
        return responses[len(question) % len(responses)]
    
    # Question Type: Improvements/Growth
    elif any(word in q_lower for word in ['improve', 'weak', 'gap', 'better', 'lacking', 'develop', 'learn', 'growth']):
        responses = [
            f"Based on the resume showing: {context_summary}. To enhance career prospects, the candidate could: (1) Pursue additional certifications in emerging technologies, (2) Take on more leadership responsibilities, (3) Build projects showcasing new skill areas, and (4) Focus on measurable outcomes in future roles.",
            f"While the resume demonstrates: {context_summary}, there's room for improvement by: (1) Expanding technical depth in key areas, (2) Gaining experience with cutting-edge tools and frameworks, (3) Developing soft skills like public speaking, and (4) Building a portfolio of personal projects.",
            f"Considering current experience: {context_summary}. Growth opportunities include: (1) Working with advanced technologies, (2) Taking on larger-scale projects, (3) Mentoring others, and (4) Contributing to open-source initiatives."
        ]
        return responses[len(question) % len(responses)]
    
    # Question Type: Recommendations/Next Steps
    elif any(word in q_lower for word in ['recommend', 'suggest', 'should', 'next', 'advice', 'focus', 'prepare']):
        responses = [
            f"Given the profile: {context_summary}. My recommendation would be to: (1) Leverage existing expertise to take on more complex projects, (2) Build a personal brand through technical writing or speaking, (3) Network within the industry, and (4) Stay updated with industry trends.",
            f"Based on: {context_summary}. The ideal path forward involves: (1) Deepening expertise in core areas, (2) Expanding skill set to complementary domains, (3) Building a strong professional network, and (4) Contributing to meaningful projects.",
            f"Considering: {context_summary}. Strategic moves include: (1) Seeking roles with greater responsibility, (2) Pursuing relevant certifications, (3) Building a technical portfolio, and (4) Engaging with the professional community."
        ]
        return responses[len(question) % len(responses)]
    
    # Default intelligent response
    else:
        responses = [
            f"Looking at the resume details: {context_summary}. This provides strong context for understanding the candidate's capabilities and experience level. The background demonstrates relevant expertise in key areas.",
            f"From the information available: {context_summary}. The candidate has built a solid foundation with diverse experience that translates well across multiple roles and responsibilities.",
            f"Based on the resume: {context_summary}. This shows a well-rounded professional with practical experience and dedication to continuous improvement.",
        ]
        return responses[len(question) % len(responses)]


async def stream_chat_answer(question: str, context=None, history=None):
    print("➡️ Using Mock ChatGPT-style responses")
    print("➡️ Context received type:", type(context))

    # ✅ FIX: handle list context safely
    if isinstance(context, list):
        context = "\n".join(context)

    # ✅ FIX: handle None safely
    context = context or ""

    if not context.strip():
        response = (
            "I don't have enough context from the resume to answer this question. "
            "Could you provide more specific details or ask about a different aspect?"
        )
    else:
        response = _generate_chatgpt_response(question, context)

    # Stream response
    for word in response.split(" "):
        yield word + " "
        await asyncio.sleep(0.01)
# ─── GEMINI IMPLEMENTATION ────────────────────────────────────────────────────

#async def _stream_gemini(prompt):
 #   loop = asyncio.get_event_loop()

  #  def blocking():
   #     try:
    #        model = genai.GenerativeModel("gemini-2.0-flash")  # ✅ SAFE MODEL
     #       response = model.generate_content(prompt)  # ❗ NO stream=True
      #      return response.text
       # except Exception as e:
        #    print("❌ Gemini Error:", e)
         #   return None

   # full_text = await loop.run_in_executor(None, blocking)

   # if full_text is None:
    #    yield "Error generating response from AI."
     #   return

    # ✅ Fake streaming (VERY STABLE)
   # try:
    #    for word in full_text.split(" "):
     #       yield word + " "
          #  await asyncio.sleep(0.01)
   # except Exception as e:
    #    print("❌ Streaming Error:", e)
     #   yield "Streaming failed."
# ─── MOCK FALLBACK ────────────────────────────────────────────────────────────

async def _stream_mock_feedback(scores: dict) -> AsyncIterator[str]:
    matched = scores.get("matched_skills", [])
    missing = scores.get("missing_skills", [])
    final = scores.get("final_score", 0)

    level = "strong" if final > 0.75 else "moderate" if final > 0.6 else "weak"

    paragraphs = [
        f"## Overall Assessment\n\nThis candidate shows a **{level} match** ({final:.0%}). ",
        "Recommendation: " + (
            "Proceed to interview." if final >= 0.6 else "Not recommended."
        ) + "\n\n",

        "## Strengths\n\n",
        f"Skills: **{', '.join(matched[:5]) or 'General'}**\n\n",

        "## Gaps\n\n",
        f"Missing: **{', '.join(missing[:5]) or 'None'}**\n\n",

        "## Recommendations\n\n",
        "Improve missing skills and build stronger projects.\n\n",

        "## Interview Focus\n\n",
        f"Focus on: {', '.join(matched[:3]) or 'core skills'}"
    ]

    for para in paragraphs:
        for word in para.split(" "):
            yield word + " "
            await asyncio.sleep(0.02)


async def _stream_mock_chat(question: str) -> AsyncIterator[str]:
    response = f"Answer for '{question}' based on resume. Add GOOGLE_API_KEY for real AI."
    for word in response.split(" "):
        yield word + " "
        await asyncio.sleep(0.03)