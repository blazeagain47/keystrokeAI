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
    duration: Optional[int] = None
    language: Optional[str] = "english"
    # IMPORTANT: None means "unspecified"; do NOT default to False here.
    include_punctuation: Optional[bool] = None
    include_numbers: Optional[bool] = None
    difficulty: Optional[str] = "medium"   # "easy" | "medium" | "hard" | "auto"
    recent_wpm: Optional[float] = None
    recent_accuracy: Optional[float] = None


@app.post("/generate")
async def generate_handler(params: GenerateIn):
    # For now, we unify to words-mode generation with optional punctuation/numbers.
    # Time mode requests will request a long count from the frontend.
    if params.mode not in ("words", "time"):
        params.mode = "words"
    allowed = {10, 15, 20, 30, 50}
    if params.mode == "time":
        # front-end supplies a large count for time mode; fall back if missing
        count = max(200, int(params.count or 200))
    else:
        count = params.count if params.count in allowed else 25
    # --- choose difficulty (auto if requested) ---
    difficulty = (params.difficulty or "medium").lower()
    if difficulty == "auto":
        wpm = float(params.recent_wpm or 0.0)
        acc = float(params.recent_accuracy or 100.0)
        # Simple policy:
        # hard if wpm>=70 and acc>=96
        # medium if wpm>=40 and acc>=94
        # else easy
        if wpm >= 70 and acc >= 96:
            difficulty = "hard"
        elif wpm >= 40 and acc >= 94:
            difficulty = "medium"
        else:
            difficulty = "easy"

    # defaults per tier only if client did not specify the flag (None)
    tier_defaults = {
        "easy":   {"punct": False, "nums": False},
        "medium": {"punct": True,  "nums": True},
        "hard":   {"punct": True,  "nums": True},
    }
    tdef = tier_defaults.get(difficulty, tier_defaults["medium"])
    def resolve_flag(val, default):
        # Only substitute default when value is None.
        return default if (val is None) else bool(val)
    include_punctuation = resolve_flag(params.include_punctuation, tdef["punct"])
    include_numbers     = resolve_flag(params.include_numbers,     tdef["nums"])

    seed = random.randint(1, 2_000_000_000)
    text = generate_words_prompt(
        count=count,
        language=params.language or "english",
        include_punctuation=include_punctuation,
        include_numbers=include_numbers,
        difficulty=difficulty,
    )
    # Debug log to verify flags align with output (remove in prod if noisy)
    print("[GEN]", {"mode": params.mode, "count": count, "difficulty": difficulty,
                   "flags": {"punctuation": include_punctuation, "numbers": include_numbers}})
    return {"text": text, "mode": "words", "count": count, "seed": seed, "difficulty": difficulty, "flags": {"punctuation": include_punctuation, "numbers": include_numbers}}
