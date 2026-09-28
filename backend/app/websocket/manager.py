"""
WebSocket Connection Manager.
NexusGuard Person 3 — Manages connected SOC clients and broadcasts real-time security alerts.
"""

import json
import logging
from typing import Set, Dict, Any
from fastapi import WebSocket, WebSocketDisconnect

from app.security_events.schemas import (
    SecurityEventResponse,
    WebSocketSecurityEventPayload,
)

logger = logging.getLogger("nexusguard.websocket")


class ConnectionManager:
    """
    Manages active WebSocket connections to the /ws/alerts endpoint.
    Broadcasts security events instantaneously to connected SOC analysts.
    """

    def __init__(self):
        # Set of active WebSocket connections
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        """Accept an incoming WebSocket connection and register client."""
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Total active connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket) -> None:
        """Unregister a disconnected client."""
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket client disconnected. Total active connections: {len(self.active_connections)}")

    async def broadcast_json(self, data: Dict[str, Any]) -> None:
        """
        Broadcast raw JSON dictionary to all connected clients.
        Gracefully handles dead or abruptly disconnected sockets.
        """
        dead_connections = set()
        for connection in list(self.active_connections):
            try:
                await connection.send_json(data)
            except Exception as exc:
                logger.warning(f"Failed to send alert to client, marking for cleanup: {exc}")
                dead_connections.add(connection)

        # Cleanup any dead sockets
        for dead in dead_connections:
            self.disconnect(dead)

    async def broadcast_security_event(self, event: SecurityEventResponse) -> None:
        """
        Broadcasts a normalized SecurityEvent adhering strictly to the contract expected by Person 4:
        {
          "type": "security_event",
          "event": { ... }
        }
        """
        payload = WebSocketSecurityEventPayload(
            type="security_event",
            event=event,
        )
        await self.broadcast_json(payload.model_dump(mode="json"))

    def get_active_count(self) -> int:
        """Return count of currently connected clients."""
        return len(self.active_connections)


# Global singleton instance for use across API routers and services
ws_manager = ConnectionManager()
