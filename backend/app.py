from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
import random
from typing import Optional
from .prompt_generator import generate_words_prompt

app = FastAPI()

# CORS for frontend (Next.js on localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load a small model first
model_name = "distilgpt2"
tokenizer = AutoTokenizer.from_pretrained(model_name)
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token
model = AutoModelForCausalLM.from_pretrained(model_name)

# Device setup
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model.to(device)

class TypingInput(BaseModel):
    user_text: str

def generate_response(user_text: str) -> dict:
    # 1) Basic, hardcoded corrections to simulate structure
    corrections_map = {
        "helo": "hello",
        "wlrod": "world",
        "teh": "the",
        "recieve": "receive",
        "adress": "address",
    }

    tokens = user_text.split()
    corrections: list[str] = []

    for idx, tok in enumerate(tokens):
        fixed = corrections_map.get(tok.lower())
        if fixed is not None:
            corrections.append(f"{tok} → {fixed}")

    num_errors = len(corrections)
    # Simple difficulty heuristic based on number of corrections
    if num_errors == 0:
        difficulty = "Easy"
        feedback = "Looks good. Keep practicing to maintain accuracy."
    elif num_errors <= 2:
        difficulty = "Easy"
        feedback = "Try to improve spelling accuracy."
    elif num_errors <= 4:
        difficulty = "Medium"
        feedback = "Focus on common misspellings and slow down slightly."
    else:
        difficulty = "Hard"
        feedback = "Practice short phrases to build accuracy before increasing speed."

    return {
        "input": user_text,
        "corrections": corrections,
        "difficulty": difficulty,
        "feedback": feedback,
    }

@app.post("/analyze")
async def analyze_typing(data: TypingInput):
    # Return structured JSON directly
    return generate_response(data.user_text)


class GenerateIn(BaseModel):
    mode: str = "words"
    count: Optional[int] = 25
    language: Optional[str] = "english"


@app.post("/generate")
async def generate_handler(params: GenerateIn):
    if params.mode != "words":
        params.mode = "words"
    allowed = {10, 15, 20, 30, 50}
    count = params.count if params.count in allowed else 25
    seed = random.randint(1, 2_000_000_000)
    text = generate_words_prompt(count=count, language=params.language or "english")
    return {"text": text, "mode": "words", "count": count, "seed": seed}
