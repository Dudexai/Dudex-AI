from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
from database import get_db_connection

router = APIRouter(prefix="/community", tags=["community"])


class ConnectRequest(BaseModel):
    requester_id: str = Field(min_length=1)
    receiver_id: str = Field(min_length=1)


class ActionRequest(BaseModel):
    request_id: str = Field(min_length=1)
    startup_id: str = Field(min_length=1)


class SendMessageRequest(BaseModel):
    sender_startup_id: str = Field(min_length=1)
    receiver_startup_id: str = Field(min_length=1)
    sender_name: str = Field(default="Founder")
    message: str = Field(min_length=1)


@router.get("/connections")
def get_connections(startup_id: str = Query(...)):
    """
    Returns:
    - connected_ids: IDs of startups where mutual connection is established ('connected')
    - sent_request_ids: IDs of startups the current startup has sent a pending request to
    - incoming_requests: List of pending requests sent TO this startup
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        # 1. Mutual connections:
        # Either (requester_id = startup_id AND status = 'connected') OR (receiver_id = startup_id AND status = 'connected')
        rows = cursor.execute(
            """
            SELECT requester_id, receiver_id FROM startup_connections
            WHERE (requester_id = ? OR receiver_id = ?) AND status = 'connected'
            """,
            (startup_id, startup_id),
        ).fetchall()

        connected_ids = set()
        for r in rows:
            other = r["receiver_id"] if r["requester_id"] == startup_id else r["requester_id"]
            connected_ids.add(other)

        # 2. Sent pending requests:
        sent_rows = cursor.execute(
            """
            SELECT receiver_id FROM startup_connections
            WHERE requester_id = ? AND status = 'pending'
            """,
            (startup_id,),
        ).fetchall()
        sent_request_ids = [r["receiver_id"] for r in sent_rows]

        # 3. Incoming pending requests:
        incoming_rows = cursor.execute(
            """
            SELECT id, requester_id, receiver_id, status, created_at
            FROM startup_connections
            WHERE receiver_id = ? AND status = 'pending'
            ORDER BY created_at DESC
            """,
            (startup_id,),
        ).fetchall()
        incoming_requests = [dict(r) for r in incoming_rows]

        return {
            "startup_id": startup_id,
            "connected_ids": list(connected_ids),
            "sent_request_ids": sent_request_ids,
            "incoming_requests": incoming_requests,
        }
    finally:
        conn.close()


@router.post("/connect-request")
def send_connect_request(req: ConnectRequest):
    """
    Sends a connection request from requester to receiver.
    If receiver had ALREADY sent a request to requester, automatically accept and mark as 'connected' (Instagram mutual follow/connect).
    """
    if req.requester_id == req.receiver_id:
        raise HTTPException(status_code=400, detail="Cannot connect to your own startup")

    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        # Check if already connected
        existing_connected = cursor.execute(
            """
            SELECT id FROM startup_connections
            WHERE ((requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?))
              AND status = 'connected'
            """,
            (req.requester_id, req.receiver_id, req.receiver_id, req.requester_id),
        ).fetchone()

        if existing_connected:
            return {"status": "connected", "message": "Already connected!"}

        # Check if reverse request exists (receiver -> requester) with 'pending'
        reverse_pending = cursor.execute(
            """
            SELECT id FROM startup_connections
            WHERE requester_id = ? AND receiver_id = ? AND status = 'pending'
            """,
            (req.receiver_id, req.requester_id),
        ).fetchone()

        if reverse_pending:
            # Mutual connect!
            cursor.execute(
                """
                UPDATE startup_connections
                SET status = 'connected', updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (reverse_pending["id"],),
            )
            conn.commit()
            return {"status": "connected", "message": "Mutual connection established! You can now chat."}

        # Check if forward request already exists
        existing_pending = cursor.execute(
            """
            SELECT id FROM startup_connections
            WHERE requester_id = ? AND receiver_id = ? AND status = 'pending'
            """,
            (req.requester_id, req.receiver_id),
        ).fetchone()

        if existing_pending:
            return {"status": "pending", "message": "Connection request already pending."}

        # Insert new pending request
        new_id = f"conn-{uuid.uuid4()}"
        cursor.execute(
            """
            INSERT INTO startup_connections (id, requester_id, receiver_id, status, created_at, updated_at)
            VALUES (?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """,
            (new_id, req.requester_id, req.receiver_id),
        )
        conn.commit()

        return {"status": "requested", "request_id": new_id, "message": "Connection request sent successfully."}
    finally:
        conn.close()


@router.post("/accept-connection")
def accept_connection(req: ActionRequest):
    """
    Accepts an incoming connection request.
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        row = cursor.execute(
            "SELECT * FROM startup_connections WHERE id = ? AND receiver_id = ?",
            (req.request_id, req.startup_id),
        ).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Connection request not found or unauthorized")

        cursor.execute(
            """
            UPDATE startup_connections
            SET status = 'connected', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (req.request_id,),
        )
        conn.commit()

        return {
            "status": "connected",
            "message": "Connection accepted! You can now message each other.",
            "connected_with": row["requester_id"],
        }
    finally:
        conn.close()


@router.post("/reject-connection")
def reject_connection(req: ActionRequest):
    """
    Rejects or dismisses an incoming connection request.
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        cursor.execute(
            """
            UPDATE startup_connections
            SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND receiver_id = ?
            """,
            (req.request_id, req.startup_id),
        )
        conn.commit()

        return {"status": "rejected", "message": "Request declined."}
    finally:
        conn.close()


@router.post("/send-message")
def send_message(req: SendMessageRequest):
    """
    Saves and sends a direct message between two startups.
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        msg_id = f"msg-{int(datetime.utcnow().timestamp() * 1000)}-{uuid.uuid4().hex[:6]}"
        now_iso = datetime.utcnow().isoformat()

        cursor.execute(
            """
            INSERT INTO startup_messages (id, sender_startup_id, receiver_startup_id, sender_name, message, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (msg_id, req.sender_startup_id, req.receiver_startup_id, req.sender_name, req.message, now_iso),
        )
        conn.commit()

        return {
            "id": msg_id,
            "sender_startup_id": req.sender_startup_id,
            "receiver_startup_id": req.receiver_startup_id,
            "sender_name": req.sender_name,
            "message": req.message,
            "created_at": now_iso,
        }
    finally:
        conn.close()


@router.get("/messages")
def get_messages(startup1_id: str = Query(...), startup2_id: str = Query(...)):
    """
    Retrieves all messages between startup1 and startup2.
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        rows = cursor.execute(
            """
            SELECT id, sender_startup_id, receiver_startup_id, sender_name, message, created_at
            FROM startup_messages
            WHERE (sender_startup_id = ? AND receiver_startup_id = ?)
               OR (sender_startup_id = ? AND receiver_startup_id = ?)
            ORDER BY created_at ASC
            """,
            (startup1_id, startup2_id, startup2_id, startup1_id),
        ).fetchall()

        return [dict(r) for r in rows]
    finally:
        conn.close()
