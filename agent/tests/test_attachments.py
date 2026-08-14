"""Acceptance tests for docs/specs/chat-attachments (the block rewriter)."""

import base64

from langchain_core.messages import HumanMessage

from src.attachments import MAX_CHARS, normalize_block, normalize_message


def data_url(mime: str, payload: bytes) -> str:
    return f"data:{mime};base64,{base64.b64encode(payload).decode()}"


def image_block(url: str, **extra) -> dict:
    return {"type": "image_url", "image_url": {"url": url}, **extra}


def test_image_passes_through_untouched():
    block = image_block(data_url("image/png", b"\x89PNG\r\n"))
    assert normalize_block(block) is block


def test_remote_url_passes_through_untouched():
    block = image_block("https://example.com/plan.png")
    assert normalize_block(block) is block


def test_text_is_decoded_and_wrapped_with_its_filename():
    block = image_block(data_url("text/markdown;name=brief.md", b"# Riverside"))
    out = normalize_block(block)
    assert out["type"] == "text"
    assert out["text"] == (
        "[attached file: brief.md]\n# Riverside\n[end of attached file: brief.md]"
    )


def test_metadata_filename_wins_over_the_mime_parameter():
    block = image_block(
        data_url("text/plain;name=from-mime.txt", b"hi"),
        metadata={"filename": "from-metadata.txt"},
    )
    assert "from-metadata.txt" in normalize_block(block)["text"]


def test_a_legacy_block_with_no_filename_anywhere_still_reads():
    block = image_block(data_url("text/markdown", b"hi"))
    assert normalize_block(block)["text"] == "[attached file]\nhi\n[end of attached file]"


def test_json_counts_as_text():
    block = image_block(data_url("application/json", b'{"floors": 8}'))
    assert '{"floors": 8}' in normalize_block(block)["text"]


def test_long_text_is_truncated_visibly():
    block = image_block(data_url("text/plain;name=long.txt", b"x" * (MAX_CHARS + 500)))
    text = normalize_block(block)["text"]
    assert "[… truncated, 500 characters omitted]" in text


def test_unreadable_type_becomes_a_placeholder_naming_the_file():
    block = image_block(data_url("application/pdf;name=tender.pdf", b"%PDF-1.7"))
    assert normalize_block(block) == {
        "type": "text",
        "text": "[attached file: tender.pdf — the agent cannot read this file type]",
    }


def test_undecodable_text_payload_becomes_a_placeholder():
    block = image_block("data:text/plain;name=broken.txt;base64,not-base64!!")
    assert "cannot read" in normalize_block(block)["text"]


def test_string_content_is_left_alone():
    message = HumanMessage(content="the shaft is 1800 by 1700")
    assert normalize_message(message) is message


def test_a_message_mixing_text_and_a_file_keeps_both():
    message = HumanMessage(
        content=[
            {"type": "text", "text": "Look at this brief"},
            image_block(data_url("text/markdown;name=brief.md", b"8-storey hotel")),
        ]
    )
    blocks = normalize_message(message).content
    assert blocks[0] == {"type": "text", "text": "Look at this brief"}
    assert "8-storey hotel" in blocks[1]["text"]
