/**
 * Utilities for sanitizing strings, handling binary buffers, and preparing
 * data safely for PostgreSQL persistence without triggering \u0000 errors.
 */

// Common binary magic numbers (file signatures)
const BINARY_MAGIC_SIGNATURES: { name: string; bytes: number[] }[] = [
  { name: "PNG", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { name: "JPEG", bytes: [0xff, 0xd8, 0xff] },
  { name: "GIF", bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF8
  { name: "PDF", bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { name: "ZIP/JAR/DOCX", bytes: [0x50, 0x4b, 0x03, 0x04] }, // PK\x03\x04
  { name: "GZIP", bytes: [0x1f, 0x8b] },
  { name: "7Z", bytes: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c] },
  { name: "ELF", bytes: [0x7f, 0x45, 0x4c, 0x46] },
  { name: "PE/EXE", bytes: [0x4d, 0x5a] }, // MZ
  { name: "SQLite", bytes: [0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33, 0x00] },
  { name: "WASM", bytes: [0x00, 0x61, 0x73, 0x6d] }, // \0asm
  { name: "JavaClass", bytes: [0xca, 0xfe, 0xba, 0xbe] },
];

const KNOWN_BINARY_EXTENSIONS = new Set([
  // Images
  ".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp", ".bmp", ".tiff", ".tif", ".psd", ".raw",
  // Audio & Video
  ".mp4", ".webm", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a",
  // Archives & Compressed
  ".zip", ".tar", ".gz", ".tgz", ".bz2", ".xz", ".7z", ".rar", ".iso", ".dmg", ".pkg",
  // Executables & Binaries
  ".exe", ".dll", ".so", ".dylib", ".bin", ".hex", ".rom", ".sys", ".drv",
  // Bytecode & Compiled artifacts
  ".pyc", ".pyo", ".pyd", ".class", ".jar", ".war", ".ear", ".wasm", ".o", ".obj", ".a", ".lib", ".pdb",
  // Databases & Serialized binary data
  ".sqlite", ".sqlite3", ".db", ".db3", ".parquet", ".avro", ".dat", ".lockb", ".pkl", ".pickle",
  // Machine Learning Weights
  ".onnx", ".pt", ".pth", ".bin", ".weights", ".h5", ".tflite",
  // Fonts
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  // Documents
  ".pdf", ".docx", ".xlsx", ".pptx",
]);

/**
 * Strips null bytes (\0 or \u0000) from a text string.
 * PostgreSQL rejects \u0000 in text and JSONB fields.
 */
export function sanitizeNullBytes(text: string): string {
  if (typeof text !== "string") return text;
  // Strip null bytes and escaped null sequences
  return text.replace(/\0/g, "").replace(/\\u0000/gi, "");
}

/**
 * Checks if a buffer matches any known binary magic number signature.
 */
function hasBinaryMagicNumber(buffer: Buffer | Uint8Array): boolean {
  for (const sig of BINARY_MAGIC_SIGNATURES) {
    if (buffer.length < sig.bytes.length) continue;
    let match = true;
    for (let i = 0; i < sig.bytes.length; i++) {
      if (buffer[i] !== sig.bytes[i]) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}

/**
 * Checks whether a given buffer is binary content rather than ordinary source text.
 * Uses known file signatures and a sample-based byte frequency inspection (up to 8,000 bytes)
 * similar to Git's binary detection heuristic.
 */
export function isBinaryBuffer(buffer: Buffer | Uint8Array | null | undefined): boolean {
  if (!buffer || buffer.length === 0) return false;

  // 1. Magic number check
  if (hasBinaryMagicNumber(buffer)) {
    return true;
  }

  // 2. Check sample bytes (first 8,000 bytes, matching Git's heuristic)
  const sampleSize = Math.min(buffer.length, 8000);
  let nullCount = 0;
  let controlCharCount = 0;

  for (let i = 0; i < sampleSize; i++) {
    const byte = buffer[i]!;

    if (byte === 0) {
      nullCount++;
    } else if (
      (byte < 7 || (byte > 13 && byte < 32)) &&
      byte !== 27 // Allow escape for ANSI
    ) {
      controlCharCount++;
    }
  }

  // If there are more than 2 null bytes in the sample, treat as binary
  if (nullCount > 2) {
    return true;
  }

  // If non-printable characters make up more than 10% of the sample, treat as binary
  if ((controlCharCount + nullCount) / sampleSize > 0.1) {
    return true;
  }

  return false;
}

/**
 * Checks if a file path has an extension known to be binary.
 */
export function isBinaryPath(filePath: string): boolean {
  if (!filePath || typeof filePath !== "string") return false;
  const lower = filePath.toLowerCase();
  const dotIdx = lower.lastIndexOf(".");
  if (dotIdx === -1) return false;
  const ext = lower.slice(dotIdx);
  return KNOWN_BINARY_EXTENSIONS.has(ext);
}

/**
 * Recursively sanitizes any value (objects, arrays, strings) to remove null bytes
 * before writing to PostgreSQL. Safe for JSON/JSONB and text column persistence.
 */
export function sanitizeForPostgres<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    return sanitizeNullBytes(value) as unknown as T;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (value instanceof Date) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForPostgres(item)) as unknown as T;
  }

  if (typeof value === "object") {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      sanitizedObj[sanitizeNullBytes(key)] = sanitizeForPostgres(val);
    }
    return sanitizedObj as unknown as T;
  }

  return value;
}
