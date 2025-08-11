import os
import random
import re
from typing import Optional, Dict, Any
import json
from pathlib import Path


def _apply_modifiers(text: str, *, include_punctuation: bool, include_numbers: bool, quotes_mode: bool, zen_mode: bool) -> str:
    base = text.strip()
    if zen_mode:
        # Zen mode: short simple phrases, reduce punctuation
        base = base.replace(",", "").replace(";", "").replace(":", "")
    if not include_punctuation:
        for ch in [",", ".", "!", "?", ":", ";", "-", "—", "(", ")", "\"", "'"]:
            base = base.replace(ch, "")
    if include_numbers and any(c.isdigit() for c in base) is False:
        # Append some numbers in a natural way
        base = f"{base} {random.randint(10, 999)} {random.randint(1, 99)}"
    if quotes_mode:
        if not (base.startswith("\"") and base.endswith("\"")):
            base = f'"{base}"'
    return base


def _rule_based_generate(*, language: str, difficulty: str, topic: str, word_target: int, seed: Optional[int]) -> str:
    rng = random.Random(seed)

    # Basic word banks by difficulty
    easy_words = (
        "time", "day", "work", "play", "light", "sound", "river", "paper", "quiet", "simple",
        "focus", "calm", "flow", "clean", "space", "stone", "soft", "clear", "early", "fresh",
    )
    medium_words = (
        "rhythm", "cursor", "syntax", "journey", "pattern", "texture", "complex", "elegant", "dynamic", "harmony",
        "balance", "context", "process", "notion", "granular", "precise", "example", "render", "compose", "gesture",
    )
    hard_words = (
        "symphony", "algorithmic", "idiosyncratic", "labyrinth", "ephemeral", "inexorable", "serendipity", "palimpsest",
        "equanimity", "metamorphosis", "multiplicity", "orthogonal", "concatenate", "paresthesia", "phenomenology",
    )

    if difficulty == "hard":
        bank = hard_words + medium_words
    elif difficulty == "medium":
        bank = medium_words + easy_words
    else:
        bank = easy_words + medium_words

    # Topic bias: sprinkle topic words
    topic_words = []
    if topic:
        for token in topic.lower().split():
            if token.isalpha() and token not in topic_words:
                topic_words.append(token)

    chosen: list[str] = []
    while len(chosen) < max(4, word_target):
        if topic_words and rng.random() < 0.25:
            chosen.append(rng.choice(topic_words))
        else:
            chosen.append(rng.choice(bank))

    # Light shaping into a few phrases
    words_per_sentence = max(6, min(14, int(word_target / 2)))
    sentences = []
    for i in range(0, len(chosen), words_per_sentence):
        chunk = chosen[i:i+words_per_sentence]
        if not chunk:
            continue
        chunk[0] = chunk[0].capitalize()
        sentence = " ".join(chunk)
        sentence = sentence + "."
        sentences.append(sentence)

    text = " ".join(sentences)

    # Language minimal tweak (placeholder)
    if language.lower() != "english":
        text = text  # For phase 1 we leave as-is; future: add language packs

    return text


def _openai_generate(opts: Dict[str, Any]) -> Optional[str]:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    try:
        # Lazy import to avoid hard dependency when not available
        from openai import OpenAI  # type: ignore
    except Exception:
        return None

    client = OpenAI(api_key=api_key)

    language = opts.get("language", "english")
    difficulty = opts.get("difficulty", "easy")
    include_punctuation = bool(opts.get("include_punctuation", True))
    include_numbers = bool(opts.get("include_numbers", False))
    quotes_mode = bool(opts.get("quotes_mode", False))
    zen_mode = bool(opts.get("zen_mode", False))
    topic = opts.get("topic", "")
    word_target = int(opts.get("word_target", 18))
    seed = opts.get("seed")

    system = (
        "You generate short, engaging typing practice passages that feel natural, "
        "with clear structure and balanced word variety."
    )
    user = (
        f"Language: {language}\n"
        f"Difficulty: {difficulty}\n"
        f"Include punctuation: {include_punctuation}\n"
        f"Include numbers: {include_numbers}\n"
        f"Quotes mode: {quotes_mode}\n"
        f"Zen mode: {zen_mode}\n"
        f"Topic: {topic or 'general'}\n"
        f"Target words: {word_target}\n"
        "\n"
        "Constraints:\n"
        "- Return a single paragraph, no markdown.\n"
        "- Avoid newlines.\n"
        "- Approximate the target word count.\n"
    )

    try:
        # Use the Responses API if available (>=1.0), else fall back to chat.completions
        try:
            resp = client.responses.create(
                model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                input=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                extra_headers={"x-use-cache": "true"},
                temperature=0.8,
                max_output_tokens=max(64, word_target * 3),
                seed=seed if isinstance(seed, int) else None,
            )
            text = resp.output_text  # type: ignore
        except Exception:
            chat = client.chat.completions.create(
                model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                temperature=0.8,
                max_tokens=max(64, word_target * 3),
                seed=seed if isinstance(seed, int) else None,
            )
            text = chat.choices[0].message.content or ""
    except Exception:
        return None

    if not text:
        return None

    text = _apply_modifiers(
        text,
        include_punctuation=include_punctuation,
        include_numbers=include_numbers,
        quotes_mode=quotes_mode,
        zen_mode=zen_mode,
    )
    return text


def generate_prompt(options: Dict[str, Any]) -> Dict[str, Any]:
    language = options.get("language", "english")
    difficulty = options.get("difficulty", "easy")
    include_punctuation = bool(options.get("include_punctuation", True))
    include_numbers = bool(options.get("include_numbers", False))
    quotes_mode = bool(options.get("quotes_mode", False))
    zen_mode = bool(options.get("zen_mode", False))
    topic = options.get("topic", "")
    word_target = int(options.get("word_target", 18))
    seed = options.get("seed")

    # Try OpenAI first
    ai_text = _openai_generate(options)
    if isinstance(ai_text, str) and ai_text.strip():
        return {"text": ai_text.strip()}

    # Rule-based fallback
    base = _rule_based_generate(
        language=language,
        difficulty=difficulty,
        topic=topic,
        word_target=word_target,
        seed=seed,
    )
    final_text = _apply_modifiers(
        base,
        include_punctuation=include_punctuation,
        include_numbers=include_numbers,
        quotes_mode=quotes_mode,
        zen_mode=zen_mode,
    )
    return {"text": final_text}




def _load_corpus_words() -> list[str]:
    corpus: list[str] = []
    try:
        data_path = Path(__file__).resolve().parents[1] / "data" / "typing_dataset.jsonl"
        if data_path.exists():
            with data_path.open("r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        obj = json.loads(line)
                        text = obj.get("text") or obj.get("content") or ""
                        for tok in str(text).split():
                            # keep alphabetic-ish tokens
                            t = tok.strip().strip(",.!?;:\"'()[]{}")
                            if t:
                                corpus.append(t.lower())
                    except Exception:
                        continue
    except Exception:
        pass
    return corpus


_FALLBACK_BANK = [
    "time", "day", "work", "play", "light", "sound", "river", "paper", "quiet", "simple",
    "focus", "calm", "flow", "clean", "space", "stone", "soft", "clear", "early", "fresh",
    "code", "typing", "keyboard", "cursor", "swift", "rhythm", "balance", "syntax", "practice", "steady",
    "mind", "breath", "track", "smooth", "motion", "pattern", "learn", "grace", "model", "prompt",
]

# --- NEW: Tier parameters ----------------------------------------------------
from typing import Iterable, Tuple, List

TIER = ("easy", "medium", "hard")

def _partition_banks(words: List[str]) -> Tuple[List[str], List[str], List[str]]:
    """
    Split words by naive difficulty heuristic:
    - easy: <=5 letters
    - medium: 6-7 letters
    - hard: >=8 letters
    Use fallback bank if corpus is small.
    """
    src = words if len(words) >= 200 else _FALLBACK_BANK
    easy, med, hard = [], [], []
    for w in src:
        L = len(w)
        if L <= 5: easy.append(w)
        elif L <= 7: med.append(w)
        else: hard.append(w)
    # ensure all non-empty (fallback to src)
    if not easy: easy = src[:]
    if not med: med = src[:]
    if not hard: hard = src[:]
    return easy, med, hard

def _tier_params(difficulty: str):
    """
    Return generation knobs for given tier.
    knobs:
      - sent_span = (min,max) words per sentence
      - commas choices
      - ender weights
      - number_rate
      - bank_mix = (easy, med, hard) weights
    """
    if difficulty == "hard":
        return {
            "sent_span": (8, 14),
            "comma_choices": [0,1,1,2,2],
            "ender_weights": [4,1,1,1,1],  # dot bias but allow ! ?
            "number_rate": 0.18,
            "bank_mix": (1, 2, 4),
        }
    if difficulty == "medium":
        return {
            "sent_span": (7, 12),
            "comma_choices": [0,1,1,2],
            "ender_weights": [6,1,1,1,1],
            "number_rate": 0.12,
            "bank_mix": (2, 3, 2),
        }
    # easy
    return {
        "sent_span": (6, 10),
        "comma_choices": [0,0,1],
        "ender_weights": [8,1,0,0,0],    # mostly periods
        "number_rate": 0.06,
        "bank_mix": (4, 2, 1),
    }


def _assemble_sentences(tokens: list[str], include_punctuation: bool, *, sent_span=(6,12), comma_choices=None, ender_weights=None) -> str:
    """
    Given plain tokens (words and numeric tokens), return a string with proper sentence
    boundaries and optional commas. Ensures:
    - Sentences length 6–12 tokens.
    - First token of each sentence capitalized.
    - Sentence enders: '.', '!', '?' with light randomness (bias to '.') when punctuation is enabled.
    - Commas appear after a token with small probability but never adjacent to other punctuation.
    """
    import random as _random
    rng = _random.Random()
    out: list[str] = []
    i = 0
    if comma_choices is None: comma_choices = [0,1,1,2]
    if ender_weights is None: ender_weights = [5,1,1,1,1]
    while i < len(tokens):
        span = rng.randint(sent_span[0], sent_span[1])
        end = min(len(tokens), i + span)
        sent = tokens[i:end].copy()

        if include_punctuation and len(sent) > 6:
            num_commas = rng.choice(comma_choices)
            positions = list(range(2, len(sent) - 1))
            rng.shuffle(positions)
            placed = 0
            used_positions: set[int] = set()
            for pos in positions:
                if placed >= num_commas:
                    break
                if (pos - 1) in used_positions or (pos + 1) in used_positions:
                    continue
                sent[pos] = sent[pos] + ","
                used_positions.add(pos)
                placed += 1

        if sent:
            head = sent[0]
            if head and head[0].isalpha():
                sent[0] = head[0].upper() + head[1:]

        if include_punctuation:
            ender = rng.choices([".", ".", ".", "!", "?"], weights=ender_weights)[0]
            joined = " ".join(sent) + ender
        else:
            joined = " ".join(sent)
        out.append(joined)
        i = end
    return " ".join(out)


def _maybe_inject_numbers(base_words: list[str], include_numbers: bool, rng, *, rate: float = 0.12) -> list[str]:
    if not include_numbers:
        return base_words
    tokens: list[str] = []
    for w in base_words:
        if include_numbers and rng.random() < rate:
            n = rng.choice([
                str(rng.randint(1, 99)),
                str(rng.randint(100, 999)),
                str(rng.randint(2000, 9999)),
            ])
            tokens.append(n)
        else:
            tokens.append(w)
    return tokens


def generate_words_prompt(
    count: int,
    language: str = "english",
    include_punctuation: bool = False,
    include_numbers: bool = False,
    difficulty: str = "medium",
) -> str:
    rng = random.Random()
    allowed = {10, 15, 20, 30, 50}
    if count not in allowed:
        count = 25

    words = _load_corpus_words()
    # Filter out tokens containing digits/punct when flags are OFF
    alpha_re = re.compile(r"^[A-Za-z]+$")
    def clean_bank(src: list[str]) -> list[str]:
        out: list[str] = []
        base = src if len(src) >= 200 else _FALLBACK_BANK
        for w in base:
            if not include_numbers and not alpha_re.match(w):
                # Skip tokens like "v2", "foo-bar", "123"
                continue
            # Strip common punctuation artifacts from corpus words; real punctuation is added later
            out.append(w.strip(".,!?;:"))
        return out or _FALLBACK_BANK[:]
    easy_bank, med_bank, hard_bank = _partition_banks(clean_bank(words))
    params = _tier_params(difficulty if difficulty in TIER else "medium")

    # Sample with replacement to reach exactly count tokens
    chosen: list[str] = []
    weights = params["bank_mix"]
    banks = [easy_bank, med_bank, hard_bank]
    for _ in range(count):
        # first pick a bank by tier weights, then a word from that bank
        bank_idx = rng.choices([0,1,2], weights=weights, k=1)[0]
        w = rng.choice(banks[bank_idx])
        chosen.append(w)

    # number rate depends on tier
    chosen = _maybe_inject_numbers(chosen, include_numbers, rng, rate=params["number_rate"])
    text = _assemble_sentences(
        chosen,
        include_punctuation,
        sent_span=params["sent_span"],
        comma_choices=params["comma_choices"],
        ender_weights=params["ender_weights"],
    )
    return text.strip()

