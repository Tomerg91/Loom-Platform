import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { formatRelativeTime } from "../shared/date";

export default function ClientResourcesPage() {
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
    <div className="content-container section-padding pb-12">
      <div className="mb-10 animate-fade-in">
        <h1 className="text-4xl font-display font-bold text-foreground tracking-tight">
          {t("resources.resources")}
        </h1>
        <p className="text-muted-foreground mt-3 text-lg">
          {t("resources.accessCoachResources")}
        </p>
      </div>

      <Card variant="glass" className="animate-slide-in-from-bottom animate-delay-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
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
                  className="p-4 border border-border/50 rounded-xl hover:bg-white/50 dark:hover:bg-white/5 transition-all duration-300 group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="mt-1 p-2 bg-primary/10 rounded-lg text-primary group-hover:bg-primary/20 transition-colors">
                        {getFileIcon(resource.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-base truncate text-foreground group-hover:text-primary transition-colors">
                          {resource.name}
                        </div>
                        {resource.description && (
                          <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {resource.description}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <span>{t("resources.shared")}</span>
                          <span className="font-medium">{formatRelativeTime(resource.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDownload(resource.id, resource.name)}
                      disabled={downloadingResourceId === resource.id}
                      size="sm"
                      className="flex-shrink-0 rounded-full shadow-soft hover:shadow-soft-md"
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
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4 opacity-50">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-lg">
                {t("resources.noResourcesAvailableYet")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
