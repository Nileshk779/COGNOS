"""
seed_demo.py
Fills the gaps left after the existing manual seed (goals/path_items/
sessions/checkins/metrics/quests/notifications/pod_posts/chat_messages/
blueprints already exist for the real user) — specifically:
  - pod_memberships (was empty — this is why pods weren't showing up)
  - growth_snapshots (before/after reveal data)
  - calendar_events (a couple of persisted reminders)
  - a few extra demo users + pod posts from them + DM threads, so pods and
    messages read as a populated community rather than a monologue.

Safe-ish to re-run: uses fixed ids for the demo users / snapshots / events
so re-running just re-upserts the same rows instead of duplicating forever
(pod posts from demo users use fixed ids too).
"""

from supabase_client import get_supabase

BHAVESH = "63e70246-45f7-44b5-9a70-2418b580fe51"

GOAL_ENGLISH = "a1111111-1111-1111-1111-111111111111"
GOAL_FITNESS = "a2222222-2222-2222-2222-222222222222"
GOAL_AIML = "a3333333-3333-3333-3333-333333333333"

POD_ENGLISH = "d1111111-1111-1111-1111-111111111111"
POD_FITNESS = "d2222222-2222-2222-2222-222222222222"
POD_AIML = "d3333333-3333-3333-3333-333333333333"

DEMO_USERS = [
    {"id": "e1111111-1111-1111-1111-111111111111", "name": "Meera Kapoor", "email": "meera-tester@example.com"},
    {"id": "e2222222-2222-2222-2222-222222222222", "name": "Vikram Rao", "email": "vikram.rao.demo@example.com"},
    {"id": "e3333333-3333-3333-3333-333333333333", "name": "Priyanka Nair", "email": "priyanka.nair.demo@example.com"},
    {"id": "e4444444-4444-4444-4444-444444444444", "name": "Arjun T", "email": "arjun.t.demo@example.com"},
    {"id": "e5555555-5555-5555-5555-555555555555", "name": "Kabir Sinha", "email": "kabir.sinha.demo@example.com"},
    {"id": "e6666666-6666-6666-6666-666666666666", "name": "Sana Iyer", "email": "sana.iyer.demo@example.com"},
]
MEERA, VIKRAM, PRIYANKA, ARJUN, KABIR, SANA = [u["id"] for u in DEMO_USERS]


def upsert(sb, table, rows, on_conflict="id"):
    if not rows:
        return
    sb.table(table).upsert(rows, on_conflict=on_conflict).execute()


def main():
    sb = get_supabase()

    # Meera Kapoor already exists from earlier testing (different id) — reuse
    # that real row instead of inserting a duplicate under the fixed demo id.
    existing_meera = sb.table("User").select("id").eq("email", "meera-tester@example.com").execute().data
    demo_users = [u for u in DEMO_USERS if u["email"] != "meera-tester@example.com"]
    meera_id = existing_meera[0]["id"] if existing_meera else MEERA

    print("Upserting demo users...")
    upsert(
        sb,
        "User",
        [{"id": u["id"], "name": u["name"], "email": u["email"], "provider": "EMAIL"} for u in demo_users],
    )

    print("Seeding pod_memberships...")
    memberships = [
        {"pod_id": POD_ENGLISH, "user_id": BHAVESH},
        {"pod_id": POD_ENGLISH, "user_id": meera_id},
        {"pod_id": POD_ENGLISH, "user_id": VIKRAM},
        {"pod_id": POD_FITNESS, "user_id": BHAVESH},
        {"pod_id": POD_FITNESS, "user_id": PRIYANKA},
        {"pod_id": POD_FITNESS, "user_id": ARJUN},
        {"pod_id": POD_AIML, "user_id": BHAVESH},
        {"pod_id": POD_AIML, "user_id": KABIR},
        {"pod_id": POD_AIML, "user_id": SANA},
    ]
    for m in memberships:
        exists = (
            sb.table("pod_memberships")
            .select("id")
            .eq("pod_id", m["pod_id"])
            .eq("user_id", m["user_id"])
            .execute()
            .data
        )
        if not exists:
            sb.table("pod_memberships").insert(m).execute()

    print("Seeding a few extra pod posts from other members...")
    upsert(
        sb,
        "pod_posts",
        [
            {
                "id": "f1111111-1111-1111-1111-111111111111",
                "pod_id": POD_ENGLISH,
                "user_id": meera_id,
                "content": "Recorded myself for the first time today without cringing immediately. Progress!",
                "post_type": "win",
            },
            {
                "id": "f1111111-1111-1111-1111-111111111112",
                "pod_id": POD_ENGLISH,
                "user_id": VIKRAM,
                "content": "Anyone have tips for filler words? I say 'like' way too much under pressure.",
                "post_type": "struggle",
            },
            {
                "id": "f2222222-2222-2222-2222-222222222221",
                "pod_id": POD_FITNESS,
                "user_id": PRIYANKA,
                "content": "3rd week straight, no PRs but no misses either. Consistency over intensity.",
                "post_type": "win",
            },
            {
                "id": "f2222222-2222-2222-2222-222222222222",
                "pod_id": POD_FITNESS,
                "user_id": ARJUN,
                "content": "Hit a new deadlift PR today — 100kg! The programming actually works.",
                "post_type": "win",
            },
            {
                "id": "f3333333-3333-3333-3333-333333333331",
                "pod_id": POD_AIML,
                "user_id": KABIR,
                "content": "Finally got backprop to click after implementing it by hand instead of using autograd.",
                "post_type": "win",
            },
            {
                "id": "f3333333-3333-3333-3333-333333333332",
                "pod_id": POD_AIML,
                "user_id": SANA,
                "content": "My model's stuck at 60% accuracy no matter what I tune. Feeling stuck, any ideas?",
                "post_type": "struggle",
            },
        ],
    )

    print("Seeding growth_snapshots...")
    upsert(
        sb,
        "growth_snapshots",
        [
            {
                "id": "b1111111-1111-1111-1111-111111111111",
                "goal_id": GOAL_ENGLISH,
                "kind": "before",
                "media_type": "audio",
                "transcript": "Um... I think... maybe the, uh, project is... good? I don't know how to say it exactly.",
            },
            {
                "id": "b1111111-1111-1111-1111-111111111112",
                "goal_id": GOAL_ENGLISH,
                "kind": "after",
                "media_type": "audio",
                "transcript": "I believe this project demonstrates strong architecture and clear communication throughout the process.",
            },
            {
                "id": "b2222222-2222-2222-2222-222222222221",
                "goal_id": GOAL_FITNESS,
                "kind": "before",
                "media_type": "image",
                "caption": "First form check · Week 1",
                "stat_label": None,
            },
            {
                "id": "b2222222-2222-2222-2222-222222222222",
                "goal_id": GOAL_FITNESS,
                "kind": "after",
                "media_type": "image",
                "caption": "Latest form check · Week 8",
                "stat_label": "+15kg Squat 1RM",
            },
            {
                "id": "b3333333-3333-3333-3333-333333333331",
                "goal_id": GOAL_AIML,
                "kind": "before",
                "media_type": "code",
                "transcript": ">>> model.fit(X_train, y_train)\nEpoch 3/20 — loss: NaN\nTraceback (most recent call last):\nValueError: gradient overflow",
            },
            {
                "id": "b3333333-3333-3333-3333-333333333332",
                "goal_id": GOAL_AIML,
                "kind": "after",
                "media_type": "code",
                "transcript": ">>> model.fit(X_train, y_train)\nEpoch 20/20 — loss: 0.084\ntest_accuracy = 0.91",
            },
        ],
    )

    print("Seeding calendar_events...")
    from datetime import datetime, timedelta, timezone

    now = datetime.now(timezone.utc)
    upsert(
        sb,
        "calendar_events",
        [
            {
                "id": "c1111111-1111-1111-1111-111111111111",
                "user_id": BHAVESH,
                "goal_id": GOAL_ENGLISH,
                "title": "Mock interview practice call",
                "event_date": (now + timedelta(days=3)).replace(hour=18, minute=0, second=0, microsecond=0).isoformat(),
                "event_type": "reminder",
            },
            {
                "id": "c2222222-2222-2222-2222-222222222222",
                "user_id": BHAVESH,
                "goal_id": GOAL_AIML,
                "title": "Hackathon prep sync with pod",
                "event_date": (now + timedelta(days=6)).replace(hour=20, minute=0, second=0, microsecond=0).isoformat(),
                "event_type": "reminder",
            },
        ],
    )

    print("Seeding direct_messages...")
    base = now - timedelta(hours=5)
    upsert(
        sb,
        "direct_messages",
        [
            {
                "id": "1a111111-1111-1111-1111-111111111111",
                "sender_id": meera_id,
                "receiver_id": BHAVESH,
                "content": "hey! saw you're on a streak with English too — how are you keeping up the momentum?",
                "read": False,
                "created_at": base.isoformat(),
            },
            {
                "id": "1a111111-1111-1111-1111-111111111112",
                "sender_id": BHAVESH,
                "receiver_id": meera_id,
                "content": "honestly just doing the daily prompt first thing, before I can talk myself out of it",
                "read": True,
                "created_at": (base + timedelta(minutes=4)).isoformat(),
            },
            {
                "id": "1a222222-2222-2222-2222-222222222221",
                "sender_id": KABIR,
                "receiver_id": BHAVESH,
                "content": "yo, saw your project in the ML pod. what optimizer did you end up using?",
                "read": False,
                "created_at": (base + timedelta(hours=1)).isoformat(),
            },
        ],
    )

    print("Done.")


if __name__ == "__main__":
    main()
