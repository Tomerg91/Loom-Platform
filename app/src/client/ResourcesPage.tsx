import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { User, Resource } from "wasp/entities";
import {
  getCoachResources,
  getResourceDownloadUrl,
  useQuery,
} from "wasp/client/operations";
import {
  Download,
  FileText,
  Music,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { toast } from "../hooks/use-toast";
import { formatRelativeTime } from "@src/shared/date";

export default function ClientResourcesPage({ user }: { user: User }) {
  const { t } = useTranslation();
  const [downloadingResourceId, setDownloadingResourceId] = useState<
    string | null
  >(null);

  const { data: resources, isLoading } = useQuery(getCoachResources);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes("pdf")) return <FileText className="h-5 w-5" />;
    if (mimeType.includes("image")) return <ImageIcon className="h-5 w-5" />;
    if (mimeType.includes("audio")) return <Music className="h-5 w-5" />;
    return <Download className="h-5 w-5" />;
  };

  const handleDownload = async (resourceId: string, resourceName: string) => {
    try {
      setDownloadingResourceId(resourceId);
      const downloadUrl = await getResourceDownloadUrl({ resourceId });
      window.open(downloadUrl, "_blank");
      toast({
        title: t("resources.downloadStarted"),
        description: t("resources.downloading", { name: resourceName }),
      });
    } catch (error) {
      console.error("Error downloading resource:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : t("resources.errorDownloading");
      toast({
        title: t("resources.errorDownloading"),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDownloadingResourceId(null);
    }
  };

  return (
    <div className="mt-10 px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          {t("resources.resources")}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("resources.accessCoachResources")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {t("resources.availableResources", {
              count: resources?.length || 0,
            })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : resources && resources.length > 0 ? (
            <div className="space-y-3">
              {resources.map((resource) => (
                <div
                  key={resource.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors dark:hover:bg-gray-900"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="mt-1 text-muted-foreground">
                        {getFileIcon(resource.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {resource.name}
                        </div>
                        {resource.description && (
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {resource.description}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-2">
                          {t("resources.shared")}{" "}
                          {formatRelativeTime(resource.createdAt)}
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDownload(resource.id, resource.name)}
                      disabled={downloadingResourceId === resource.id}
                      size="sm"
                      className="flex-shrink-0"
                    >
                      {downloadingResourceId === resource.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t("resources.downloadingBtn")}
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          {t("resources.download")}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-40" />
              <p className="text-muted-foreground">
                {t("resources.noResourcesAvailableYet")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
