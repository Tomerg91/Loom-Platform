import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Loader2, Upload, X } from "lucide-react";
import {
  createOfflineClient,
  getClientAvatarUploadUrl,
  useAction,
} from "wasp/client/operations";

interface AddOfflineClientDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddOfflineClientDialog({
  isOpen,
  onClose,
  onSuccess,
}: AddOfflineClientDialogProps) {
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const getAvatarUploadUrl = useAction(getClientAvatarUploadUrl);
  const createClient = useAction(createOfflineClient);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError(
        t(
          "coach.offlineClientForm.errors.invalidFileType",
          "Please select an image file",
        ),
      );
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError(
        t(
          "coach.offlineClientForm.errors.fileTooLarge",
          "File must be less than 5MB",
        ),
      );
      return;
    }

    setAvatarFile(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!displayName.trim()) {
      setError(
        t(
          "coach.offlineClientForm.errors.nameRequired",
          "Client name is required",
        ),
      );
      return;
    }

    if (contactEmail && !contactEmail.includes("@")) {
      setError(
        t(
          "coach.offlineClientForm.errors.invalidEmail",
          "Invalid email format",
        ),
      );
      return;
    }

    try {
      setIsSubmitting(true);
      let avatarS3Key: string | undefined;

      // Upload avatar if selected
      if (avatarFile) {
        try {
          const uploadUrlResponse = await getAvatarUploadUrl({
            fileName: avatarFile.name,
            fileType: avatarFile.type as
              | "image/png"
              | "image/jpeg"
              | "image/webp"
              | "image/gif",
          });

          // Upload to S3
          const formData = new FormData();
          // Add form fields from the presigned URL response
          formData.append("file", avatarFile);

          const uploadResponse = await fetch(uploadUrlResponse.uploadUrl, {
            method: "PUT",
            body: avatarFile,
            headers: {
              "Content-Type": avatarFile.type,
            },
          });

          if (!uploadResponse.ok) {
            throw new Error(
              t(
                "coach.offlineClientForm.errors.uploadFailed",
                "Failed to upload avatar",
              ),
            );
          }

          avatarS3Key = uploadUrlResponse.s3Key;
        } catch (uploadError) {
          console.error("Avatar upload error:", uploadError);
          setError(
            t(
              "coach.offlineClientForm.errors.uploadFailed",
              "Failed to upload avatar. Please try again.",
            ),
          );
          setIsSubmitting(false);
          return;
        }
      }

      // Create offline client
      await createClient({
        displayName: displayName.trim(),
        contactEmail: contactEmail.trim() || undefined,
        avatarS3Key,
      });

      setSuccess(
        t("coach.offlineClientForm.success", "Client added successfully!"),
      );
      setTimeout(() => {
        handleClose();
        onSuccess();
      }, 1500);
    } catch (err: any) {
      setError(
        err.message ||
          t(
            "coach.offlineClientForm.errors.createFailed",
            "Failed to create client",
          ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setDisplayName("");
    setContactEmail("");
    setAvatarFile(null);
    setAvatarPreview(null);
    setError(null);
    setSuccess(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("coach.offlineClientForm.title", "Add New Client (No Account)")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "coach.offlineClientForm.description",
              "Create a client profile for someone who won't use the app themselves.",
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="display-name">
              {t("coach.offlineClientForm.displayName", "Client Name")} *
            </Label>
            <Input
              id="display-name"
              placeholder={t(
                "coach.offlineClientForm.displayNamePlaceholder",
                "Enter full name",
              )}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Contact Email */}
          <div className="space-y-2">
            <Label htmlFor="contact-email">
              {t(
                "coach.offlineClientForm.contactEmail",
                "Contact Email (Optional)",
              )}
            </Label>
            <Input
              id="contact-email"
              type="email"
              placeholder={t(
                "coach.offlineClientForm.contactEmailPlaceholder",
                "client@example.com",
              )}
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              {t(
                "coach.offlineClientForm.emailHelp",
                "For your reference only, not used for authentication",
              )}
            </p>
          </div>

          {/* Avatar Upload */}
          <div className="space-y-2">
            <Label htmlFor="avatar">
              {t(
                "coach.offlineClientForm.avatar",
                "Profile Picture (Optional)",
              )}
            </Label>

            {avatarPreview ? (
              <div className="space-y-2">
                <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200">
                  <img
                    src={avatarPreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    disabled={isSubmitting}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    document.getElementById("avatar-input")?.click()
                  }
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  disabled={isSubmitting}
                >
                  {t("coach.offlineClientForm.changePhoto", "Change photo")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => document.getElementById("avatar-input")?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors disabled:opacity-50"
                disabled={isSubmitting}
              >
                <Upload className="w-4 h-4" />
                <span className="text-sm">
                  {t("coach.offlineClientForm.uploadAvatar", "Upload photo")}
                </span>
              </button>
            )}

            <input
              id="avatar-input"
              type="file"
              accept="image/*"
              onChange={handleAvatarSelect}
              className="hidden"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              {t(
                "coach.offlineClientForm.avatarHelp",
                "PNG, JPG, WebP or GIF up to 5MB",
              )}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <Alert className="bg-red-50 border-red-200">
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {success && (
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {/* Footer */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {t("common.cancel", "Cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common.creating", "Creating...")}
                </>
              ) : (
                t("coach.offlineClientForm.createButton", "Create Client")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
