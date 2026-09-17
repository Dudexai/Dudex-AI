from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json

from api.openrouter import (
    generate_startup_plan,
    generate_chat_response,
    generate_task_guide,
)
from api.strategy_router import router as strategy_router
from api.export_router import router as export_router
from database import init_db
from api.email_service import start_scheduler, stop_scheduler


# ================================================================
# APP
# ================================================================

app = FastAPI(
    title="DudeX AI",
    version="1.0.0",
)


# ================================================================
# STARTUP / SHUTDOWN
# ================================================================

@app.on_event("startup")
def on_startup():
    init_db()
    start_scheduler()


@app.on_event("shutdown")
def on_shutdown():
    stop_scheduler()


# ================================================================
# ROUTERS
# ================================================================

app.include_router(strategy_router)
app.include_router(export_router)


# ================================================================
# CORS
# ================================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ================================================================
# REQUEST MODELS
# ================================================================

class GenerateRequest(BaseModel):
    idea: str
    days: int


class ChatRequest(BaseModel):
    context: str
    message: str


class GuideRequest(BaseModel):
    task_title: str
    task_description: str
    phase: str = ""
    day: int = 0


class InviteRequest(BaseModel):
    to_email: str
    startup_name: str
    inviter_email: str
    invite_url: str
    token: str


class MeetingInviteRequest(BaseModel):
    attendees: list[str]
    title: str
    date: str
    time: str
    link: str
    inviter_email: str
    inviter_name: str
    startup_name: str


# ================================================================
# ROOT
# ================================================================

@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "DudeX AI",
    }


# ================================================================
# GENERATE STARTUP PLAN
# ================================================================

@app.post("/generate-plan")
async def generate_plan(req: GenerateRequest):
    try:
        raw = await generate_startup_plan(
            startup_idea=req.idea,
            days=req.days,
        )

        try:
            return json.loads(raw)

        except (json.JSONDecodeError, TypeError):
            return {
                "raw": raw
            }

    except Exception as e:
        print(f"Plan Generation Error: {e}")

        raise HTTPException(
            status_code=500,
            detail=str(e),
        )


# ================================================================
# CHAT
# ================================================================

@app.post("/chat")
async def chat_endpoint(req: ChatRequest):
    try:
        response = await generate_chat_response(
            context=req.context,
            message=req.message,
        )

        return {
            "response": response
        }

    except Exception as e:
        print(f"Chat Error: {e}")

        raise HTTPException(
            status_code=500,
            detail=str(e),
        )


# ================================================================
# GENERATE TASK GUIDE
# ================================================================

@app.post("/generate-guide")
async def generate_guide_endpoint(req: GuideRequest):
    try:
        raw = await generate_task_guide(
            task=req.task_title,
            context=req.task_description,
            phase=req.phase,
            day=req.day,
        )

        try:
            return json.loads(raw)

        except (json.JSONDecodeError, TypeError):
            return {
                "raw": raw
            }

    except Exception as e:
        print(f"Guide Error: {e}")

        raise HTTPException(
            status_code=500,
            detail=str(e),
        )


# ================================================================
# SEND INVITE
# ================================================================

@app.post("/send-invite")
async def send_invite_endpoint(req: InviteRequest):

    try:
        from api.email_service import send_invite_email

        success = send_invite_email(
            to_email=req.to_email,
            startup_name=req.startup_name,
            inviter_email=req.inviter_email,
            invite_url=req.invite_url,
            token=req.token,
        )

        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to send invite email",
            )

        return {
            "status": "success"
        }

    except HTTPException:
        raise

    except Exception as e:
        print(f"Invite Error: {e}")

        raise HTTPException(
            status_code=500,
            detail=str(e),
        )


# ================================================================
# SEND MEETING INVITES
# ================================================================

@app.post("/send-meeting-invites")
async def send_meeting_invites_endpoint(
    req: MeetingInviteRequest
):

    try:
        from api.email_service import send_meeting_invites

        success = send_meeting_invites(
            attendees=req.attendees,
            title=req.title,
            date=req.date,
            time=req.time,
            link=req.link,
            inviter_email=req.inviter_email,
            inviter_name=req.inviter_name,
            startup_name=req.startup_name,
        )

        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to send meeting invites",
            )

        return {
            "status": "success"
        }

    except HTTPException:
        raise

    except Exception as e:
        print(f"Meeting Invite Error: {e}")

        raise HTTPException(
            status_code=500,
            detail=str(e),
        )
