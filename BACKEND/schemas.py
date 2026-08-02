from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel

GoalCategory = Literal["english_speaking", "fitness", "ai_ml"]

# ---------------------------------------------------------
# Table-mirroring models (one per Supabase table in schema_backend.sql)
# ---------------------------------------------------------


class User(BaseModel):
    id: str
    email: str
    name: str
    created_at: Optional[datetime] = None


class Goal(BaseModel):
    id: str
    user_id: str
    category: GoalCategory
    title: str
    metric_config: dict = {}
    teacher_name: Optional[str] = None
    created_at: Optional[datetime] = None


class GoalCreate(BaseModel):
    category: GoalCategory
    title: str
    metric_config: dict = {}


class Blueprint(BaseModel):
    id: str
    user_id: str
    goal_id: str
    current_level: Optional[str] = None
    learning_style: Optional[str] = None
    why_now: Optional[str] = None
    past_attempts: Optional[str] = None
    updated_at: Optional[datetime] = None


class BlueprintUpdate(BaseModel):
    current_level: Optional[str] = None
    learning_style: Optional[str] = None
    why_now: Optional[str] = None
    past_attempts: Optional[str] = None


class PathItem(BaseModel):
    id: str
    goal_id: str
    content_id: Optional[str] = None
    status: Literal["pending", "active", "done"] = "pending"
    sequence_order: int = 0
    assigned_at: Optional[datetime] = None


class PathItemWithContent(PathItem):
    """path_items row flattened with its content_library join."""

    title: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None
    source_type: Optional[str] = None
    difficulty: Optional[str] = None


class Session(BaseModel):
    id: str
    path_item_id: Optional[str] = None
    user_id: str
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None


class Checkin(BaseModel):
    id: str
    goal_id: str
    user_id: str
    mood_score: Optional[int] = None
    confidence_score: Optional[int] = None
    understood: Optional[bool] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None


class CheckinCreate(BaseModel):
    mood_score: Optional[int] = None
    confidence_score: Optional[int] = None
    understood: Optional[bool] = None
    notes: Optional[str] = None
    metrics: dict[str, float] = {}


class Metric(BaseModel):
    id: str
    goal_id: str
    metric_name: str
    value: float
    recorded_at: Optional[datetime] = None


class Pod(BaseModel):
    id: str
    goal_category: GoalCategory
    name: str


class PodMembership(BaseModel):
    id: str
    pod_id: str
    user_id: str


class PodPost(BaseModel):
    id: str
    pod_id: str
    user_id: str
    content: str
    post_type: Literal["win", "struggle", "update"]
    created_at: Optional[datetime] = None


class PodPostCreate(BaseModel):
    content: str
    post_type: Literal["win", "struggle", "update"]


class PodPostWithAuthor(PodPost):
    author_name: Optional[str] = None


class Opportunity(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    type: Literal["hackathon", "job", "event", "seminar"]
    goal_category: GoalCategory
    url: Optional[str] = None
    deadline: Optional[datetime] = None


class Quest(BaseModel):
    id: str
    goal_id: str
    title: str
    description: Optional[str] = None
    xp_value: int = 0
    status: Literal["available", "active", "completed"] = "available"


class Notification(BaseModel):
    id: str
    user_id: str
    message: str
    type: str
    read: bool = False
    created_at: Optional[datetime] = None


class ChatMessage(BaseModel):
    id: str
    goal_id: str
    role: Literal["user", "teacher"]
    content: str
    path_item_id: Optional[str] = None
    task_title: Optional[str] = None
    task_description: Optional[str] = None
    created_at: Optional[datetime] = None


class ChatMessageOut(ChatMessage):
    """Chat message with its task info -- either AI-authored directly on the
    row (task_title/task_description) or, for legacy rows, joined in from a
    linked path_item + content_library entry (task_url/task_source_type)."""

    task_url: Optional[str] = None
    task_source_type: Optional[str] = None


class ChatMessageCreate(BaseModel):
    content: str


class ChatExchange(BaseModel):
    user_message: ChatMessageOut
    teacher_message: Optional[ChatMessageOut] = None


class CompleteSessionRequest(BaseModel):
    path_item_id: str
    duration_seconds: Optional[int] = None


class PodMember(BaseModel):
    user_id: str
    name: str


class PodDetail(BaseModel):
    id: str
    goal_category: GoalCategory
    name: str
    member_count: int


class DirectMessage(BaseModel):
    id: str
    sender_id: str
    receiver_id: str
    content: str
    read: bool = False
    created_at: Optional[datetime] = None


class DirectMessageCreate(BaseModel):
    receiver_id: str
    content: str


class ConversationSummary(BaseModel):
    other_user_id: str
    other_user_name: str
    last_message: str
    last_message_time: Optional[datetime] = None
    unread_count: int


class UserSearchResult(BaseModel):
    id: str
    name: str
    email: str


class GrowthSnapshot(BaseModel):
    id: str
    goal_id: str
    kind: Literal["before", "after"]
    media_type: Literal["audio", "image", "code"]
    transcript: Optional[str] = None
    media_url: Optional[str] = None
    caption: Optional[str] = None
    stat_label: Optional[str] = None
    created_at: Optional[datetime] = None


class CalendarEvent(BaseModel):
    id: str
    user_id: str
    goal_id: Optional[str] = None
    title: str
    event_date: datetime
    event_type: str = "reminder"
    created_at: Optional[datetime] = None


class CalendarEventCreate(BaseModel):
    title: str
    event_date: datetime
    goal_id: Optional[str] = None
    event_type: str = "reminder"


# ---------------------------------------------------------
# Composite response models (joins / aggregations, not real tables)
# ---------------------------------------------------------


class GoalSummary(BaseModel):
    goal_id: str
    category: GoalCategory
    title: str
    streak_days: int
    last_activity: Optional[datetime] = None


class TeacherInfo(BaseModel):
    goal_id: str
    category: GoalCategory
    goal_title: str
    teacher_name: str


class CalendarEntry(BaseModel):
    id: Optional[str] = None
    type: Literal["session", "deadline", "event"]
    title: str
    date: Optional[datetime] = None
    goal_id: Optional[str] = None


# ---------------------------------------------------------
# Interview (Gemini-backed mock interviews)
# ---------------------------------------------------------


class InterviewSession(BaseModel):
    id: str
    user_id: str
    goal_id: Optional[str] = None
    topic: str
    status: Literal["active", "completed"]
    score: Optional[int] = None
    summary: Optional[str] = None
    strengths: Optional[list[str]] = None
    improvements: Optional[list[str]] = None
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class InterviewTurn(BaseModel):
    id: str
    session_id: str
    role: Literal["interviewer", "candidate"]
    content: str
    created_at: Optional[datetime] = None


class InterviewStartRequest(BaseModel):
    topic: str
    goal_id: Optional[str] = None


class InterviewStartResponse(BaseModel):
    session: InterviewSession
    first_question: str


class InterviewRespondRequest(BaseModel):
    content: str


class InterviewRespondResponse(BaseModel):
    done: bool
    turn_number: int
    total_questions: int
    question: Optional[str] = None
    session: Optional[InterviewSession] = None


class InterviewDetail(BaseModel):
    session: InterviewSession
    turns: list[InterviewTurn]


# ---------------------------------------------------------
# Onboarding interview (profiling, not scored — produces embeddings)
# ---------------------------------------------------------


class OnboardingStartResponse(BaseModel):
    session_id: str
    question: str
    turn_number: int
    total_questions: int


class OnboardingRespondRequest(BaseModel):
    content: str


class OnboardingRespondResponse(BaseModel):
    done: bool
    turn_number: int
    total_questions: int
    question: Optional[str] = None


# ---------------------------------------------------------
# Marketplace ("The Stash") -- items assigned to a user, read-only
# ---------------------------------------------------------


class MarketplaceItem(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    category: Optional[str] = None
    status: Literal["assigned", "claimed"]
    assigned_at: Optional[datetime] = None
