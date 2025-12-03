import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAction, useQuery } from "wasp/client/operations";
import {
  getWorkspaceFiles,
  getWorkspaceFileDownloadUrl,
  deleteWorkspaceFile,
} from "wasp/client/operations";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { AlertCircle, Download, Trash2, Loader2, FileText } from "lucide-react";
import { formatDate } from "../../shared/date";

interface WorkspaceFileListProps {
  coachId: string;
  clientId: string;
  sessionId?: string;
  isCoachView?: boolean;
  onUploadClick?: () => void;
}

export default function WorkspaceFileList({
  coachId,
  clientId,
  sessionId,
  isCoachView = false,
  onUploadClick,
}: WorkspaceFileListProps) {
  const { t } = useTranslation();
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(
    null,
  );

  const {
    data: files = [],
    isLoading,
    error,
    refetch,
  } = useQuery(getWorkspaceFiles, {
    coachId,
    clientId,
    ...(sessionId && { sessionId }),
  });

  const getDownloadUrl = useAction(getWorkspaceFileDownloadUrl);
  const deleteFn = useAction(deleteWorkspaceFile);

  const handleDownload = async (fileId: string, fileName: string) => {
    setDownloadingFileId(fileId);
    try {
      const url = await getDownloadUrl({
        fileId,
        coachId,
        clientId,
      });
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Error downloading file:", err);
    } finally {
      setDownloadingFileId(null);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm(t("workspace.confirmDeleteFile"))) return;
    try {
      await deleteFn({
        fileId,
        coachId,
        clientId,
      });
      await refetch();
    } catch (err) {
      console.error("Error deleting file:", err);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-muted-foreground text-center">
            {t("common.loading")}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert className="bg-red-50 border-red-200">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          {t("workspace.failedLoadFiles")}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {isCoachView && onUploadClick && (
        <Button onClick={onUploadClick} className="w-full sm:w-auto">
          {t("workspace.uploadFile")}
        </Button>
      )}

      {files.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-muted-foreground text-center">
              {t("workspace.noWorkspaceFiles")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {files.map((file: any) => (
            <Card key={file.id}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3 justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {file.uploadedBy?.email || "Unknown"} •{" "}
                        {formatDate(new Date(file.createdAt))}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(file.id, file.name)}
                      disabled={downloadingFileId === file.id}
                    >
                      {downloadingFileId === file.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                    {isCoachView && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(file.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
