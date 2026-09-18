import asyncio
from typing import Dict, Any, List
from datetime import datetime

class EventBus:
    """
    In-memory asynchronous event bus for broadcasting agent execution steps,
    terminal diagnostics, and verification diffs to active WebSocket subscribers.
    """
    def __init__(self):
        self._subscribers: List[asyncio.Queue] = []

    def subscribe(self) -> asyncio.Queue:
        queue = asyncio.Queue()
        self._subscribers.append(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue):
        if queue in self._subscribers:
            self._subscribers.remove(queue)

    async def publish(self, event_type: str, project_id: str, payload: Dict[str, Any]):
        event = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "type": event_type,
            "project_id": project_id,
            "payload": payload,
        }
        for queue in list(self._subscribers):
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                pass

event_bus = EventBus()
