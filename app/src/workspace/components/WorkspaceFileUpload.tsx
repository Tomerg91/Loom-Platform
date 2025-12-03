import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAction } from "wasp/client/operations";
import {
  getWorkspaceUploadUrl,
  createWorkspaceFile,
} from "wasp/client/operations";
import { Button } from "@src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@src/components/ui/dialog";
import { Alert, AlertDescription } from "@src/components/ui/alert";
import { Upload, AlertCircle, Loader2 } from "lucide-react";

interface WorkspaceFileUploadProps {
  coachId: string;
  clientId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: () => void;
}

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export default function WorkspaceFileUpload({
  coachId,
  clientId,
  isOpen,
  onOpenChange,
  onUploadComplete,
}: WorkspaceFileUploadProps) {
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getUploadUrl = useAction(getWorkspaceUploadUrl);
  const createFile = useAction(createWorkspaceFile);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];

    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setError(
        t("workspace.invalidFileType") ||
          "File type not allowed. Supported: PDF, Images, Word, Excel",
      );
      setSelectedFile(null);
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError(t("workspace.fileTooLarge") || "File size exceeds 20MB limit");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      // Get presigned upload URL
      const { uploadUrl, s3Key } = await getUploadUrl({
        coachId,
        clientId,
        fileName: selectedFile.name,
        fileType: selectedFile.type,
      });

      // Upload file to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": selectedFile.type,
        },
        body: selectedFile,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to S3");
      }

      // Create workspace file record
      await createFile({
        coachId,
        clientId,
        name: selectedFile.name,
        type: selectedFile.type,
        s3Key,
      });

      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onOpenChange(false);
      onUploadComplete();
    } catch (err) {
      console.error("Error uploading file:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to upload file. Please try again.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("workspace.uploadFile")}</DialogTitle>
          <DialogDescription>
            {t("resources.fileHelp")} ({MAX_FILE_SIZE / 1024 / 1024}MB max)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            role="button"
            tabIndex={0}
          >
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">
              {selectedFile
                ? selectedFile.name
                : t("workspace.dragOrClick") ||
                  "Click to select a file or drag and drop"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {t("resources.fileHelp")}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept={ALLOWED_FILE_TYPES.join(",")}
              disabled={isUploading}
            />
          </div>

          {selectedFile && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <span className="font-medium">File selected:</span>{" "}
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
          >
            {isUploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("workspace.uploadFile")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
