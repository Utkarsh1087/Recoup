from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.db.database import get_db
from backend.app.agent.schemas import ChatRequest, ChatResponse
from backend.app.agent.orchestrator import orchestrator

router = APIRouter(prefix="/agent", tags=["AI Agent Console"])

@router.post("/chat", response_model=ChatResponse)
def chat_with_agent(req: ChatRequest, db: Session = Depends(get_db)):
    reply = orchestrator.handle_chat(req.message, db)
    return ChatResponse(response=reply)
