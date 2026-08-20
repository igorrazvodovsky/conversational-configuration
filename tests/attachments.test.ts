/**
 * The transcript's side of an attachment (docs/specs/chat-attachments, checked
 * per docs/specs/offline-checks).
 *
 * The agent's side — turning the block back into text it can read — is covered
 * by `agent/tests/test_attachments.py`. This is the reader that has to make
 * sense of what comes back: an attachment returns as an `image` part whatever
 * it was, so the part's own type says nothing and the MIME type is the only
 * signal. Nothing attachable may break a conversation, which is why every
 * malformed shape below has to read as no attachment rather than as a throw.
 */
import { describe, expect, it } from "vitest";

import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_MAX_SIZE,
  describeUploadFailure,
  fileLabel,
  messageAttachments,
} from "@/lib/attachments";

const block = (mimeType: string, extra: Record<string, unknown> = {}) => ({
  type: "image",
  source: { type: "data", value: "aGVsbG8=", mimeType },
  ...extra,
});

describe("reading the attachments off a message", () => {
  it("finds the filename in the name parameter the upload put on the type", () => {
    const [attachment] = messageAttachments([
      block("text/markdown;name=brief.md"),
    ]);
    expect(attachment).toMatchObject({
      mimeType: "text/markdown",
      filename: "brief.md",
      isImage: false,
    });
  });

  it("prefers the metadata filename, which the message just sent still has", () => {
    const [attachment] = messageAttachments([
      block("text/markdown;name=from-mime.md", {
        metadata: { filename: "from-metadata.md" },
      }),
    ]);
    expect(attachment.filename).toBe("from-metadata.md");
  });

  it("leaves a reopened conversation's attachment nameless rather than guessing", () => {
    const [attachment] = messageAttachments([block("text/markdown")]);
    expect(attachment.filename).toBeUndefined();
    expect(attachment.mimeType).toBe("text/markdown");
  });

  it("builds a data url for an image and none for anything else", () => {
    const [image] = messageAttachments([block("image/png")]);
    expect(image.isImage).toBe(true);
    expect(image.url).toBe("data:image/png;base64,aGVsbG8=");

    const [document] = messageAttachments([block("text/csv")]);
    expect(document.isImage).toBe(false);
    expect(document.url).toBeUndefined();
  });

  it("passes a remote url through as it stands", () => {
    const [attachment] = messageAttachments([
      {
        type: "image",
        source: { type: "url", value: "https://example.test/a.png", mimeType: "image/png" },
      },
    ]);
    expect(attachment.url).toBe("https://example.test/a.png");
  });

  it("takes document parts as well as image ones", () => {
    expect(
      messageAttachments([{ ...block("application/json"), type: "document" }]),
    ).toHaveLength(1);
  });

  it("numbers attachments by their place in the message", () => {
    const attachments = messageAttachments([
      { type: "text", text: "here you go" },
      block("text/plain;name=a.txt"),
    ]);
    expect(attachments).toHaveLength(1);
    expect(attachments[0].id).toBe("1");
  });

  it("reads anything malformed as no attachment at all", () => {
    expect(messageAttachments("just a string")).toEqual([]);
    expect(messageAttachments(undefined)).toEqual([]);
    expect(messageAttachments([null, 7, { type: "text", text: "hi" }])).toEqual([]);
    expect(messageAttachments([{ type: "image" }])[0].url).toBeUndefined();
    expect(
      messageAttachments([{ type: "image", source: { type: "data", value: 7 } }])[0]
        .url,
    ).toBeUndefined();
  });
});

describe("the badge a file with no preview shows", () => {
  it("names the four readable types in three or four letters", () => {
    expect(fileLabel("text/plain")).toBe("TXT");
    expect(fileLabel("text/markdown")).toBe("MD");
    expect(fileLabel("text/csv")).toBe("CSV");
    expect(fileLabel("application/json")).toBe("JSON");
  });

  it("falls back to the subtype, and to something for a type with none", () => {
    expect(fileLabel("application/pdf")).toBe("PDF");
    expect(fileLabel("")).toBe("FILE");
  });
});

describe("what a rejected upload says", () => {
  it("says what to attach instead, naming the file", () => {
    const message = describeUploadFailure({
      reason: "invalid-type",
      file: { name: "slides.pptx" },
    });
    expect(message).toContain("slides.pptx");
    expect(message).toContain("text, markdown, csv or json");
  });

  it("says what to do about a file over the cap", () => {
    expect(
      describeUploadFailure({ reason: "file-too-large", file: { name: "corpus.txt" } }),
    ).toContain("1 MB");
    expect(ATTACHMENT_MAX_SIZE).toBe(1024 * 1024);
  });

  it("still names the file for a reason it does not know", () => {
    expect(
      describeUploadFailure({ reason: "something-else", file: { name: "a.txt" } }),
    ).toContain("a.txt");
  });
});

describe("what the composer accepts", () => {
  it("offers every readable type by MIME and by extension", () => {
    for (const mimeType of [
      "text/plain",
      "text/markdown",
      "text/csv",
      "application/json",
    ]) {
      expect(ATTACHMENT_ACCEPT).toContain(mimeType);
    }
    for (const extension of [".txt", ".md", ".markdown", ".csv", ".json"]) {
      expect(ATTACHMENT_ACCEPT.split(",")).toContain(extension);
    }
  });
});
