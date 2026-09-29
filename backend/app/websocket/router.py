"""
WebSocket Router for Real-Time Threat Broadcasting.
NexusGuard Person 3 — Endpoint for live Security Operations Center (SOC) clients.
"""

import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.websocket.manager import ws_manager

logger = logging.getLogger("nexusguard.websocket.router")

router = APIRouter(tags=["WebSocket SOC Stream"])


@router.websocket("/ws/alerts")
async def alerts_websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time cyber deception alerts.
    Clients (frontend dashboard or SOC monitoring tools) connect here to receive
    instant JSON alert broadcasts when threat rules are triggered.
    """
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep socket open and listen for any client heartbeats or messages
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as exc:
        logger.warning(f"WebSocket client terminated with error: {exc}")
        ws_manager.disconnect(websocket)
