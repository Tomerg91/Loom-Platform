// Resource file size limit (20MB for supporting audio and larger PDFs)
export const MAX_RESOURCE_FILE_SIZE = 20 * 1024 * 1024;

// Allowed file types for coach resources
export const ALLOWED_RESOURCE_TYPES = [
  // Documents
  "application/pdf",
  // Images
  "image/jpeg",
  "image/png",
  // Audio
  "audio/mpeg", // MP3
  "audio/mp4", // M4A
  "audio/x-m4a", // M4A alternative
] as const;

/**
 * Validates if a file can be uploaded as a resource
 */
export function validateResourceFile(file: File): {
  valid: boolean;
  error?: string;
} {
  // Check file size
  if (file.size > MAX_RESOURCE_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${
        MAX_RESOURCE_FILE_SIZE / (1024 * 1024)
      }MB limit`,
    };
  }

  // Check file type
  if (!ALLOWED_RESOURCE_TYPES.includes(file.type as any)) {
    return {
      valid: false,
      error: `File type ${file.type} is not supported. Allowed types: PDF, Images, Audio`,
    };
  }

  return { valid: true };
}
