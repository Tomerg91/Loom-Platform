import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Recommended length for GCM

function getKey(): Buffer {
  const secret = process.env.DATA_ENCRYPTION_KEY;

  if (!secret) {
    throw new Error(
      "DATA_ENCRYPTION_KEY is required to encrypt sensitive fields. Set it to a strong secret in your environment.",
    );
  }

  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptText(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${authTag.toString(
    "base64",
  )}:${encrypted.toString("base64")}`;
}

export function decryptText(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    const [ivB64, authTagB64, payloadB64] = value.split(":");

    if (!ivB64 || !authTagB64 || !payloadB64) {
      return value;
    }

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      getKey(),
      Buffer.from(ivB64, "base64"),
    );

    decipher.setAuthTag(Buffer.from(authTagB64, "base64"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payloadB64, "base64")),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch (error) {
    console.warn("Unable to decrypt value, returning raw data", error);
    return value;
  }
}

export const sanitizeSensitiveTextInput = (value?: string | null) =>
  value === undefined ? undefined : encryptText(value ?? null);

export const sanitizeSensitiveTextOutput = (value?: string | null) =>
  value === undefined ? undefined : decryptText(value ?? null);
