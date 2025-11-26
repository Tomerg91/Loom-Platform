import { FormEvent, useEffect, useState } from "react";
import type { User, Resource } from "wasp/entities";
import {
  getUploadUrl,
  createResource,
  getCoachResources,
  deleteResource,
  useQuery,
  useAction,
} from "wasp/client/operations";
import { Download, Trash, FileText, Music, Image as ImageIcon, Upload } from "lucide-react";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Progress } from "../components/ui/progress";
import { Textarea } from "../components/ui/textarea";
import { toast } from "../hooks/use-toast";
import { cn } from "../lib/utils";
import { uploadFileWithProgress } from "../file-upload/fileUploading";
import { validateResourceFile } from "../resources/validation";
import { formatDistanceToNow } from "date-fns";

export default function CoachResourcesPage({ user }: { user: User }) {
  const [uploadProgressPercent, setUploadProgressPercent] = useState<number>(0);
  const [resourceToDelete, setResourceToDelete] = useState<Pick<
    Resource,
    "id" | "name"
  > | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [description, setDescription] = useState("");

  const createResourceFn = useAction(createResource);
  const deleteResourceFn = useAction(deleteResource);
  const getUploadUrlFn = useAction(getUploadUrl);
  const { data: resources, refetch } = useQuery(getCoachResources);

  useEffect(() => {
    refetch();
  }, []);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes("pdf")) return <FileText className="h-4 w-4" />;
    if (mimeType.includes("image")) return <ImageIcon className="h-4 w-4" />;
    if (mimeType.includes("audio")) return <Music className="h-4 w-4" />;
    return <Upload className="h-4 w-4" />;
  };

  const handleUpload = async (e: FormEvent<HTMLFormElement>) => {
    try {
      e.preventDefault();
      setIsUploading(true);

      const formElement = e.target;
      if (!(formElement instanceof HTMLFormElement)) {
        throw new Error("Event target is not a form element");
      }

      const formData = new FormData(formElement);
      const file = formData.get("file-upload");
      const resourceName = formData.get("resource-name") as string;

      if (!file || !(file instanceof File) || file.size === 0) {
        toast({
          title: "No file selected",
          description: "Please select a file to upload.",
          variant: "destructive",
        });
        return;
      }

      if (!resourceName || resourceName.trim() === "") {
        toast({
          title: "Name required",
          description: "Please enter a name for this resource.",
          variant: "destructive",
        });
        return;
      }

      // Validate file
      const validation = validateResourceFile(file);
      if (!validation.valid) {
        toast({
          title: "Invalid file",
          description: validation.error,
          variant: "destructive",
        });
        return;
      }

      // Get upload URL
      const { uploadUrl, uploadFields, s3Key } = await getUploadUrlFn({
        fileName: file.name,
        fileType: file.type as any,
      });

      // Upload to S3
      await uploadFileWithProgress({
        file: file as any,
        s3UploadUrl: uploadUrl,
        s3UploadFields: uploadFields,
        setUploadProgressPercent,
      });

      // Create resource in database
      await createResourceFn({
        name: resourceName,
        type: file.type as any,
        s3Key,
        description: description || undefined,
      });

      formElement.reset();
      setDescription("");
      refetch();
      toast({
        title: "Resource uploaded",
        description: "Your resource has been successfully uploaded.",
      });
    } catch (error) {
      console.error("Error uploading resource:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Error uploading resource.";
      toast({
        title: "Error uploading resource",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploadProgressPercent(0);
      setIsUploading(false);
    }
  };

  const handleDelete = async (resourceId: string, resourceName: string) => {
    try {
      await deleteResourceFn({ resourceId });
      setResourceToDelete(null);
      refetch();
      toast({
        title: "Resource deleted",
        description: `${resourceName} has been deleted.`,
      });
    } catch (error) {
      console.error("Error deleting resource:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Error deleting resource.";
      toast({
        title: "Error deleting resource",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mt-10 px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Resources Library</h1>
        <p className="text-muted-foreground mt-2">
          Upload resources for your clients to access
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upload Form Card */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Resource
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resource-name">Resource Name</Label>
                  <Input
                    id="resource-name"
                    name="resource-name"
                    placeholder="e.g., Grounding Meditation"
                    disabled={isUploading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="file-upload">Select File</Label>
                  <Input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.mp3,.m4a,.wav"
                    disabled={isUploading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Max 20MB. Supported: PDF, Images, Audio
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Add a description for this resource..."
                    className="h-20 resize-none"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isUploading}
                  />
                </div>

                {uploadProgressPercent > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      Uploading... {uploadProgressPercent}%
                    </div>
                    <Progress value={uploadProgressPercent} />
                  </div>
                )}

                <Button type="submit" disabled={isUploading} className="w-full">
                  {isUploading ? "Uploading..." : "Upload Resource"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Resources List Card */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Your Resources ({resources?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {resources && resources.length > 0 ? (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
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
                              Uploaded{" "}
                              {formatDistanceToNow(new Date(resource.createdAt), {
                                addSuffix: true,
                              })}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setResourceToDelete({ id: resource.id, name: resource.name })}
                          className="flex-shrink-0"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-40" />
                  <p className="text-muted-foreground">
                    No resources yet. Upload one to get started!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!resourceToDelete} onOpenChange={(open) => !open && setResourceToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Resource</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{resourceToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResourceToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (resourceToDelete) {
                  handleDelete(resourceToDelete.id, resourceToDelete.name);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
