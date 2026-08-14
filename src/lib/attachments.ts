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

/**
 * An attachment comes back from the agent as an `image` part whatever it was —
 * the same conversion the agent has to undo (docs/specs/chat-attachments) — so
 * a document renders as an image that cannot load. Re-typing the part by its
 * actual MIME hands it to CopilotKit's own file chip instead.
 *
 * The filename survives on the message just sent, in the `name=` parameter the
 * upload puts on the MIME type. A message read back from the thread has lost
 * it: the AG-UI conversion keeps only the bare MIME type, so a reopened
 * conversation labels the chip with the type rather than the name.
 */
export function describeAttachments(content: unknown): unknown {
  if (!Array.isArray(content)) return content;
  return content.map((part) => {
    if (!part || typeof part !== "object") return part;
    const block = part as Record<string, unknown>;
    if (block.type !== "image") return part;

    const source = block.source as Record<string, unknown> | undefined;
    const mimeType = (source?.mimeType as string) ?? "";
    if (!mimeType || mimeType.startsWith("image/")) return part;

    const [type, ...parameters] = mimeType.split(";");
    const name = parameters
      .find((parameter) => parameter.trim().startsWith("name="))
      ?.trim()
      .slice("name=".length);
    const metadata = block.metadata as Record<string, unknown> | undefined;

    return {
      ...block,
      type: "document",
      source: { ...source, mimeType: type },
      metadata: { ...metadata, filename: metadata?.filename ?? name },
    };
  });
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
