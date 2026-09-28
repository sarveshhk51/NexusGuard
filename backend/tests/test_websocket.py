"""
Tests for WebSocket Connection Manager.
NexusGuard Person 3 — Verifies connection lifecycle, multi-client broadcast, and graceful disconnect cleanup.
"""

from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, timezone
import pytest

from app.websocket.manager import ConnectionManager
from app.security_events.schemas import SecurityEventResponse
from app.security_events.models import SeverityEnum, EventTypeEnum, EventStatusEnum


@pytest.fixture
def manager():
    return ConnectionManager()


@pytest.mark.asyncio
async def test_websocket_connect_and_disconnect(manager):
    """Verify clients can connect and disconnect cleanly."""
    mock_ws = AsyncMock()

    await manager.connect(mock_ws)
    assert manager.get_active_count() == 1
    mock_ws.accept.assert_awaited_once()

    manager.disconnect(mock_ws)
    assert manager.get_active_count() == 0


@pytest.mark.asyncio
async def test_broadcast_to_multiple_clients(manager):
    """Verify broadcast delivers messages to all connected clients."""
    client1 = AsyncMock()
    client2 = AsyncMock()

    await manager.connect(client1)
    await manager.connect(client2)
    assert manager.get_active_count() == 2

    test_data = {"type": "ping", "message": "hello"}
    await manager.broadcast_json(test_data)

    client1.send_json.assert_awaited_once_with(test_data)
    client2.send_json.assert_awaited_once_with(test_data)


@pytest.mark.asyncio
async def test_broadcast_security_event_contract(manager):
    """Verify broadcast_security_event formats payload strictly per Person 4 frontend contract."""
    client = AsyncMock()
    await manager.connect(client)

    event_dto = SecurityEventResponse(
        id="uuid-1234",
        timestamp=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
        target_id=1,
        engine="postgresql",
        database_name="prod",
        username="attacker",
        source_ip="10.0.0.42",
        query="SELECT * FROM nexusguard_decoy.customers",
        schema_name="nexusguard_decoy",
        table_name="customers",
        event_type=EventTypeEnum.DECOY_ACCESS,
        severity=SeverityEnum.CRITICAL,
        detection_reason="Potential unauthorized interaction with deception asset.",
        status=EventStatusEnum.NEW,
    )

    await manager.broadcast_security_event(event_dto)

    # Check payload structure
    client.send_json.assert_awaited_once()
    payload = client.send_json.call_args[0][0]

    assert payload["type"] == "security_event"
    assert payload["event"]["id"] == "uuid-1234"
    assert payload["event"]["severity"] == "CRITICAL"
    assert payload["event"]["schema_name"] == "nexusguard_decoy"
    assert payload["event"]["query"] == "SELECT * FROM nexusguard_decoy.customers"


@pytest.mark.asyncio
async def test_graceful_cleanup_on_broken_client(manager):
    """Verify that if one client disconnects abruptly, other clients still receive alerts."""
    good_client = AsyncMock()
    broken_client = AsyncMock()
    broken_client.send_json.side_effect = RuntimeError("Socket closed abruptly")

    await manager.connect(good_client)
    await manager.connect(broken_client)
    assert manager.get_active_count() == 2

    # Broadcast should succeed without crashing
    await manager.broadcast_json({"alert": "critical"})

    # Broken client should have been cleaned up automatically
    assert manager.get_active_count() == 1
    assert good_client in manager.active_connections
    assert broken_client not in manager.active_connections
    good_client.send_json.assert_awaited_once_with({"alert": "critical"})
