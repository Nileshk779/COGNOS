"""Deterministic, per-persona canned replies — explicitly NOT an LLM call.
Picked by a simple hash of the incoming message so the same message always
gets the same reply (stable, reproducible, zero API cost)."""

REPLIES = {
    "english_speaking": [
        "Nice — keep talking it through like that, it's exactly how fluency builds.",
        "Good instinct. Try saying that out loud once more, a little slower this time.",
        "That's solid. Want me to line up your next practice step?",
        "I hear you. Let's turn that into today's speaking drill.",
    ],
    "fitness": [
        "Good — log that and let's keep the streak going.",
        "That's the spirit. Form first, intensity later.",
        "Noted. Want me to queue up your next session?",
        "Solid effort. Recovery matters just as much, don't skip it.",
    ],
    "ai_ml": [
        "Good catch. Let's dig into that a bit more with your next task.",
        "That tracks. Want me to line up something hands-on next?",
        "Makes sense — that's a common spot to get stuck. Keep going.",
        "Noted. Let's put that into practice with your next step.",
    ],
}


def pick_reply(category: str, message: str) -> str:
    options = REPLIES.get(category, REPLIES["english_speaking"])
    idx = sum(ord(c) for c in message) % len(options)
    return options[idx]
