"""Attachment normalization (docs/specs/chat-attachments).

CopilotKit calls anything that is not image/audio/video a *document*, and the
AG-UI → LangChain conversion routes every media modality through LangChain's
`image_url` block. A text file therefore arrives at the model as an image and
the run fails with `invalid_image_format` — and because the block is written to
the thread checkpoint, every later run in that conversation fails the same way.

This module rewrites those blocks at the model call: text becomes text the
agent can read, anything undecodable becomes a placeholder that names the file,
and real images pass through untouched. It never writes back to state, so the
transcript stays a faithful record and the repair happens on every read.
"""

from __future__ import annotations

import base64
import binascii
from typing import Any

from langchain.agents.middleware.types import AgentMiddleware
from langchain_core.messages import BaseMessage

# Beyond this the model is handed a marked truncation rather than the whole
# file. The composer's 1 MB cap is the first line of defence; this is the
# second, since threads predating that cap come through here too.
MAX_CHARS = 20_000

# MIME types whose payload is text the model can simply read.
TEXT_MIME_PREFIXES = ("text/",)
TEXT_MIME_TYPES = frozenset({"application/json", "application/x-ndjson"})


def _parse_data_url(url: str) -> tuple[str, dict[str, str], str] | None:
    """Split a data URL into (mime type, header parameters, base64 payload)."""
    if not url.startswith("data:") or "," not in url:
        return None
    header, payload = url.split(",", 1)
    parts = header[len("data:") :].split(";")
    mime = parts[0].strip().lower()
    params: dict[str, str] = {}
    for part in parts[1:]:
        if "=" in part:
            key, _, value = part.partition("=")
            params[key.strip().lower()] = value.strip()
    return mime, params, payload


def _is_text_mime(mime: str) -> bool:
    return mime.startswith(TEXT_MIME_PREFIXES) or mime in TEXT_MIME_TYPES


def _label(filename: str | None) -> str:
    return f"attached file: {filename}" if filename else "attached file"


def _decode(payload: str) -> str | None:
    try:
        return base64.b64decode(payload, validate=True).decode("utf-8")
    except (binascii.Error, ValueError, UnicodeDecodeError):
        return None


def _wrap(text: str, filename: str | None) -> str:
    if len(text) > MAX_CHARS:
        omitted = len(text) - MAX_CHARS
        text = f"{text[:MAX_CHARS]}\n[… truncated, {omitted} characters omitted]"
    label = _label(filename)
    return f"[{label}]\n{text}\n[end of {label}]"


def normalize_block(block: Any) -> Any:
    """Rewrite one content block. Anything unrecognized is returned unchanged."""
    if not isinstance(block, dict) or block.get("type") != "image_url":
        return block

    image_url = block.get("image_url")
    url = image_url.get("url", "") if isinstance(image_url, dict) else image_url
    if not isinstance(url, str):
        return block

    parsed = _parse_data_url(url)
    if parsed is None:
        # A remote image URL — the model fetches it itself; nothing to repair.
        return block
    mime, params, payload = parsed

    if mime.startswith("image/"):
        return block

    # The client sends the filename as metadata but it does not survive the
    # transport (docs/specs/chat-attachments design), so `name=` on the MIME
    # type is the working source. Metadata still wins if it ever arrives.
    metadata = block.get("metadata")
    filename = None
    if isinstance(metadata, dict):
        filename = metadata.get("filename")
    filename = filename or params.get("name")

    text = _decode(payload) if _is_text_mime(mime) else None
    if text is None:
        return {
            "type": "text",
            "text": f"[{_label(filename)} — the agent cannot read this file type]",
        }
    return {"type": "text", "text": _wrap(text, filename)}


def normalize_message(message: BaseMessage) -> BaseMessage:
    """Return the message with its attachment blocks rewritten, or as it was."""
    if not isinstance(message.content, list):
        return message
    blocks = [normalize_block(block) for block in message.content]
    if blocks == message.content:
        return message
    return message.model_copy(update={"content": blocks})


def _normalized(request):  # type: ignore[no-untyped-def]
    return request.override(
        messages=[normalize_message(message) for message in request.messages]
    )


class NormalizeAttachments(AgentMiddleware):
    """Hand the model readable content whatever the conversation carries.

    Both hooks are implemented: the server runs the graph with `astream`, and a
    middleware defining only the sync hook raises there rather than falling
    back to it.
    """

    def wrap_model_call(self, request, handler):  # type: ignore[no-untyped-def]
        return handler(_normalized(request))

    async def awrap_model_call(self, request, handler):  # type: ignore[no-untyped-def]
        return await handler(_normalized(request))
