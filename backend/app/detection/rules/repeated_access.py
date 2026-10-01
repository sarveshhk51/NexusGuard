"""
Repeated Access Detection Rule.
NexusGuard Person 3 — Detects query bursts and high-frequency automated scraping attempts.
"""

from collections import defaultdict, deque
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Deque, Tuple
from app.detection.base import DetectionRule, RawEvent, DetectionResult
from app.security_events.models import SeverityEnum, EventTypeEnum


class RepeatedAccessRule(DetectionRule):
    """
    Detects repeated access or query bursts from the same source IP/user within a short time window.
    Indicates automated vulnerability scanning, brute-force scraping, or unauthorized batch exfiltration.
    """

    def __init__(self, window_seconds: int = 60, threshold: int = 5):
        """
        :param window_seconds: Sliding window duration in seconds (default: 60)
        :param threshold: Number of queries in window that triggers an anomaly (default: 5)
        """
        self.window_seconds = window_seconds
        self.threshold = threshold
        # Key: (target_id, source_ip) -> Deque of timestamps
        self._history: Dict[Tuple[int, str], Deque[datetime]] = defaultdict(deque)

    @property
    def name(self) -> str:
        return "REPEATED_ACCESS_RULE"

    @property
    def description(self) -> str:
        return f"Detects query frequency exceeding {self.threshold} requests in {self.window_seconds}s."

    def _cleanup_old_entries(self, key: Tuple[int, str], current_time: datetime) -> None:
        """Removes timestamps outside the current sliding window."""
        cutoff = current_time - timedelta(seconds=self.window_seconds)
        timestamps = self._history[key]
        while timestamps and timestamps[0] < cutoff:
            timestamps.popleft()

    def matches(self, event: RawEvent) -> bool:
        """Matches if query exists and is evaluated for frequency."""
        return bool(event.query and event.source_ip)

    def evaluate(self, event: RawEvent) -> Optional[DetectionResult]:
        if not self.matches(event):
            return None

        key = (event.target_id, event.source_ip)
        now = event.timestamp if event.timestamp else datetime.now(timezone.utc)

        # Cleanup expired window timestamps
        self._cleanup_old_entries(key, now)

        # Record this event timestamp
        self._history[key].append(now)
        count = len(self._history[key])

        if count >= self.threshold:
            severity = SeverityEnum.CRITICAL if count >= self.threshold * 2 else SeverityEnum.HIGH
            return DetectionResult(
                event_type=EventTypeEnum.REPEATED_ACCESS,
                severity=severity,
                detection_reason=(
                    f"High-frequency query burst detected: {count} queries in under {self.window_seconds} seconds."
                ),
                matched=True,
                metadata={
                    "rule": self.name,
                    "query_count": count,
                    "window_seconds": self.window_seconds,
                    "source_ip": event.source_ip,
                },
            )

        return None

    def reset(self) -> None:
        """Clear memory cache (useful for testing and memory management)."""
        self._history.clear()
