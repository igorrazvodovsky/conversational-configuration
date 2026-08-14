/**
 * Chat attachment transport (docs/specs/chat-attachments).
 *
 * The composer accepts what the agent can actually read, and the upload
 * handler carries the filename to it. Two facts drive the shape of this file:
 * CopilotKit derives an attachment's modality from the browser's MIME type,
 * which disagrees with itself about markdown; and the `metadata` the client
 * sends alongside the attachment does not survive the trip to the agent, so
 * the name rides in the MIME type instead — see the spec's design.
 */

/** Types the agent can read, plus the images that already worked. */
export const ATTACHMENT_ACCEPT =
  "text/plain,text/markdown,text/csv,application/json,image/*," +
  ".txt,.md,.markdown,.csv,.json";

/** 1 MB. A document larger than this is not a brief; it is a corpus. */
export const ATTACHMENT_MAX_SIZE = 1024 * 1024;

/**
 * Browsers disagree on markdown (`text/markdown`, `text/plain`, or nothing at
 * all depending on the OS registry), and an empty type reaches the agent as an
 * unreadable one. The extension is the more reliable signal for exactly the
 * types we accept.
 */
const MIME_BY_EXTENSION: Record<string, string> = {
  txt: "text/plain",
  md: "text/markdown",
  markdown: "text/markdown",
  csv: "text/csv",
  json: "application/json",
};

function mimeTypeOf(file: File): string {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[extension] ?? file.type ?? "";
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(file);
  });
}

// `AttachmentUploadResult` lives in @copilotkit/shared, which is not a direct
// dependency, so the shape is asserted here rather than imported through one.
/**
 * CopilotKit's own rejection message lists the MIME filter verbatim, which
 * reads as configuration rather than as an answer. This says what to do
 * instead.
 */
export function describeUploadFailure(failure: {
  reason: string;
  file: { name: string };
}): string {
  const { name } = failure.file;
  switch (failure.reason) {
    case "invalid-type":
      return `${name} can't be read here. Attach a text, markdown, csv or json file — or an image.`;
    case "file-too-large":
      return `${name} is larger than 1 MB. Paste the part that matters instead.`;
    default:
      return `${name} could not be read.`;
  }
}

/** One attached file as the transcript needs to show it. */
export type MessageAttachment = {
  id: string;
  mimeType: string;
  filename?: string;
  isImage: boolean;
  /** Present for images, which the row previews. */
  url?: string;
};

function sourceUrl(
  source: Record<string, unknown> | undefined,
  mimeType: string,
): string | undefined {
  if (!source || typeof source.value !== "string") return undefined;
  if (source.type === "url") return source.value;
  if (source.type === "data") return `data:${mimeType};base64,${source.value}`;
  return undefined;
}

/**
 * An attachment comes back from the agent as an `image` part whatever it was —
 * the same conversion the agent has to undo (docs/specs/chat-attachments) — so
 * the part's own type says nothing and the MIME type is the only signal.
 *
 * The filename survives on the message just sent, in the `name=` parameter the
 * upload puts on that MIME type. A message read back from the thread has lost
 * it: the AG-UI conversion keeps only the bare type, so a reopened
 * conversation has a file to show and no name to call it by.
 */
export function messageAttachments(content: unknown): MessageAttachment[] {
  if (!Array.isArray(content)) return [];
  const attachments: MessageAttachment[] = [];
  content.forEach((part, index) => {
    if (!part || typeof part !== "object") return;
    const block = part as Record<string, unknown>;
    if (block.type !== "image" && block.type !== "document") return;

    const source = block.source as Record<string, unknown> | undefined;
    const [mimeType = "", ...parameters] = (
      (source?.mimeType as string) ?? ""
    ).split(";");
    const named = parameters
      .find((parameter) => parameter.trim().startsWith("name="))
      ?.trim()
      .slice("name=".length);
    const metadata = block.metadata as Record<string, unknown> | undefined;
    const isImage = mimeType.startsWith("image/");

    attachments.push({
      id: `${index}`,
      mimeType,
      filename: typeof metadata?.filename === "string" ? metadata.filename : named,
      isImage,
      url: isImage ? sourceUrl(source, mimeType) : undefined,
    });
  });
  return attachments;
}

const FILE_LABELS: Record<string, string> = {
  "text/plain": "TXT",
  "text/markdown": "MD",
  "text/csv": "CSV",
  "application/json": "JSON",
};

/** A short badge for a file with no preview: its kind, in three or four letters. */
export function fileLabel(mimeType: string): string {
  return (
    FILE_LABELS[mimeType] ?? (mimeType.split("/")[1] ?? "file").slice(0, 4).toUpperCase()
  );
}

export async function uploadWithFilename(file: File) {
  const mimeType = mimeTypeOf(file);
  return {
    type: "data" as const,
    value: await readAsBase64(file),
    // Only files the agent rewrites carry the name: an image reaches OpenAI as
    // the data URL it is, and a parameter on that URL is rejected outright
    // ("You uploaded an unsupported image"). `;` and `,` terminate the header,
    // so a filename carrying either would truncate the payload, not name it.
    mimeType: mimeType.startsWith("image/")
      ? mimeType
      : `${mimeType};name=${file.name.replace(/[;,]/g, "_")}`,
    // Ignored in transit today, preferred by the agent if it ever arrives.
    metadata: { filename: file.name },
  };
}
