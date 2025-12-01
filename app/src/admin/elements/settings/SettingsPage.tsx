import { FileText, Mail, Upload, User } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  getAdminAvatarUploadUrl,
  getAdminSettings,
  updateAdminSettings,
  useQuery,
} from "wasp/client/operations";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import Breadcrumb from "../../layout/Breadcrumb";
import DefaultLayout from "../../layout/DefaultLayout";
import LoadingSpinner from "../../layout/LoadingSpinner";

const ACCEPTED_AVATAR_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;
const MAX_AVATAR_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_AVATAR_DIMENSION = 800;

const getSafeImageUrl = (url: string | null) => {
  if (!url) return null;

  try {
    const parsed = new URL(url, window.location.origin);
    return ["http:", "https:", "blob:"].includes(parsed.protocol) ? parsed.toString() : null;
  } catch (err) {
    return null;
  }
};

const SettingsPage = ({ user }: { user: AuthUser }) => {
  const { data, isLoading, error, refetch } = useQuery(getAdminSettings);
  const [formState, setFormState] = useState({
    fullName: "",
    phoneNumber: "",
    emailAddress: "",
    username: "",
    bio: "",
    privacyPolicyUrl: "",
    termsOfServiceUrl: "",
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const safeAvatarSrc = useMemo(() => getSafeImageUrl(avatarPreview), [avatarPreview]);

  const currentSettings = useMemo(() => data, [data]);

  useEffect(() => {
    if (!currentSettings) return;

    setFormState({
      fullName: currentSettings.fullName || "",
      phoneNumber: currentSettings.phoneNumber || "",
      emailAddress: currentSettings.emailAddress || "",
      username: currentSettings.username || "",
      bio: currentSettings.bio || "",
      privacyPolicyUrl: currentSettings.privacyPolicyUrl || "",
      termsOfServiceUrl: currentSettings.termsOfServiceUrl || "",
    });
    setAvatarPreview(currentSettings.avatarUrl || null);
    setRemoveAvatar(!currentSettings.avatarS3Key);
    setAvatarFile(null);
  }, [currentSettings]);

  const handleInputChange = (
    field: keyof typeof formState,
    value: string,
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const validateImageDimensions = (file: File) => {
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        if (img.width > MAX_AVATAR_DIMENSION || img.height > MAX_AVATAR_DIMENSION) {
          URL.revokeObjectURL(objectUrl);
          reject(
            new Error(
              `Image must be ${MAX_AVATAR_DIMENSION}x${MAX_AVATAR_DIMENSION} pixels or smaller.`,
            ),
          );
          return;
        }
        URL.revokeObjectURL(objectUrl);
        resolve();
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Invalid image file."));
      };
      img.src = objectUrl;
    });
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatusMessage(null);
    setErrorMessage(null);

    try {
      if (!ACCEPTED_AVATAR_TYPES.includes(file.type as (typeof ACCEPTED_AVATAR_TYPES)[number])) {
        throw new Error("Unsupported file type. Please upload PNG, JPEG, WEBP or GIF.");
      }

      if (file.size > MAX_AVATAR_FILE_SIZE) {
        throw new Error("Avatar must be 2MB or smaller.");
      }

      await validateImageDimensions(file);

      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      setRemoveAvatar(false);
    } catch (err: any) {
      setErrorMessage(err.message || "Unable to use this image.");
      setAvatarFile(null);
      setAvatarPreview(currentSettings?.avatarUrl || null);
      event.target.value = "";
    }
  };

  const uploadAvatar = async () => {
    if (!avatarFile) return { s3Key: removeAvatar ? null : currentSettings?.avatarS3Key ?? null };

    const uploadDetails = await getAdminAvatarUploadUrl({
      fileName: avatarFile.name,
      fileType: avatarFile.type as (typeof ACCEPTED_AVATAR_TYPES)[number],
    });

    const formData = new FormData();
    Object.entries(uploadDetails.uploadFields).forEach(([key, value]) => {
      formData.append(key, value);
    });
    formData.append("file", avatarFile);

    const uploadResponse = await fetch(uploadDetails.uploadUrl, {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload avatar. Please try again.");
    }

    return { s3Key: uploadDetails.s3Key };
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      setIsSaving(true);
      const { s3Key } = await uploadAvatar();

      const payload = {
        ...formState,
        fullName: formState.fullName.trim(),
        phoneNumber: formState.phoneNumber.trim() || undefined,
        emailAddress: formState.emailAddress.trim(),
        username: formState.username.trim(),
        bio: formState.bio.trim() || undefined,
        avatarS3Key: removeAvatar ? null : s3Key ?? currentSettings?.avatarS3Key ?? null,
        privacyPolicyUrl: formState.privacyPolicyUrl.trim(),
        termsOfServiceUrl: formState.termsOfServiceUrl.trim(),
      };

      const updatedSettings = await updateAdminSettings(payload);
      setStatusMessage("Settings saved successfully.");
      setAvatarPreview(updatedSettings.avatarUrl || null);
      setAvatarFile(null);
      setRemoveAvatar(!updatedSettings.avatarS3Key);
      await refetch();
    } catch (err: any) {
      setErrorMessage(err.message || "Unable to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (!currentSettings) return;
    setFormState({
      fullName: currentSettings.fullName || "",
      phoneNumber: currentSettings.phoneNumber || "",
      emailAddress: currentSettings.emailAddress || "",
      username: currentSettings.username || "",
      bio: currentSettings.bio || "",
      privacyPolicyUrl: currentSettings.privacyPolicyUrl || "",
      termsOfServiceUrl: currentSettings.termsOfServiceUrl || "",
    });
    setAvatarFile(null);
    setAvatarPreview(currentSettings.avatarUrl || null);
    setRemoveAvatar(!currentSettings.avatarS3Key);
    setStatusMessage(null);
    setErrorMessage(null);
  };

  if (isLoading) {
    return (
      <DefaultLayout user={user}>
        <div className="flex h-full items-center justify-center">
          <LoadingSpinner />
        </div>
      </DefaultLayout>
    );
  }

  if (error || !currentSettings) {
    return (
      <DefaultLayout user={user}>
        <div className="text-destructive">Failed to load settings.</div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout user={user}>
      <div className="max-w-270 mx-auto">
        <Breadcrumb pageName="Settings" />

        <div className="grid grid-cols-5 gap-8">
          <div className="col-span-5 xl:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Personal & Site Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit}>
                  <div className="mb-5.5 gap-5.5 flex flex-col sm:flex-row">
                    <div className="w-full sm:w-1/2">
                      <Label
                        htmlFor="full-name"
                        className="text-foreground mb-3 block text-sm font-medium"
                      >
                        Full Name
                      </Label>
                      <div className="relative">
                        <User className="left-4.5 text-muted-foreground absolute top-2 h-5 w-5" />
                        <Input
                          className="pl-11.5"
                          type="text"
                          id="full-name"
                          placeholder="Full name"
                          value={formState.fullName}
                          onChange={(e) => handleInputChange("fullName", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="w-full sm:w-1/2">
                      <Label
                        htmlFor="phone-number"
                        className="text-foreground mb-3 block text-sm font-medium"
                      >
                        Phone Number
                      </Label>
                      <Input
                        type="tel"
                        id="phone-number"
                        placeholder="+1 555 123 4567"
                        value={formState.phoneNumber}
                        onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="mb-5.5">
                    <Label
                      htmlFor="email-address"
                      className="text-foreground mb-3 block text-sm font-medium"
                    >
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="left-4.5 text-muted-foreground absolute top-2 h-5 w-5" />
                      <Input
                        className="pl-11.5"
                        type="email"
                        id="email-address"
                        placeholder="admin@loom-platform.com"
                        value={formState.emailAddress}
                        onChange={(e) => handleInputChange("emailAddress", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="mb-5.5">
                    <Label
                      htmlFor="username"
                      className="text-foreground mb-3 block text-sm font-medium"
                    >
                      Username
                    </Label>
                    <Input
                      type="text"
                      id="username"
                      placeholder="loom-admin"
                      value={formState.username}
                      onChange={(e) => handleInputChange("username", e.target.value)}
                    />
                  </div>

                  <div className="mb-5.5">
                    <Label
                      htmlFor="bio"
                      className="text-foreground mb-3 block text-sm font-medium"
                    >
                      BIO
                    </Label>
                    <div className="relative">
                      <FileText className="left-4.5 text-muted-foreground absolute top-4 h-5 w-5" />
                      <Textarea
                        className="border-border bg-background pl-11.5 pr-4.5 text-foreground focus:border-primary w-full rounded border py-3 focus-visible:outline-none"
                        id="bio"
                        rows={6}
                        placeholder="Share a short introduction for the admin team."
                        value={formState.bio}
                        onChange={(e) => handleInputChange("bio", e.target.value)}
                      ></Textarea>
                    </div>
                  </div>

                  <div className="mb-5.5 gap-5.5 flex flex-col sm:flex-row">
                    <div className="w-full sm:w-1/2">
                      <Label
                        htmlFor="privacy-policy-url"
                        className="text-foreground mb-3 block text-sm font-medium"
                      >
                        Privacy Policy URL
                      </Label>
                      <Input
                        type="url"
                        id="privacy-policy-url"
                        placeholder="https://loom-platform.com/privacy-policy"
                        value={formState.privacyPolicyUrl}
                        onChange={(e) => handleInputChange("privacyPolicyUrl", e.target.value)}
                      />
                    </div>
                    <div className="w-full sm:w-1/2">
                      <Label
                        htmlFor="terms-url"
                        className="text-foreground mb-3 block text-sm font-medium"
                      >
                        Terms of Service URL
                      </Label>
                      <Input
                        type="url"
                        id="terms-url"
                        placeholder="https://loom-platform.com/terms-of-service"
                        value={formState.termsOfServiceUrl}
                        onChange={(e) => handleInputChange("termsOfServiceUrl", e.target.value)}
                      />
                    </div>
                  </div>

                  {statusMessage && (
                    <div className="text-green-600 mb-4 text-sm">{statusMessage}</div>
                  )}
                  {errorMessage && (
                    <div className="text-destructive mb-4 text-sm">{errorMessage}</div>
                  )}

                  <div className="gap-4.5 flex justify-end">
                    <Button variant="outline" type="button" onClick={handleCancel} disabled={isSaving}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
          <div className="col-span-5 xl:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Your Photo</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit}>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="h-14 w-14 overflow-hidden rounded-full">
                      {safeAvatarSrc ? (
                        <img src={safeAvatarSrc} alt="Admin avatar" className="h-full w-full object-cover" />
                      ) : (
                        <div className="bg-muted flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                          No photo
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="text-foreground mb-1.5">Edit your photo</span>
                      <span className="flex gap-2.5">
                        <button
                          type="button"
                          className="hover:text-primary text-sm"
                          onClick={handleCancel}
                        >
                          Reset
                        </button>
                        <button
                          type="button"
                          className="hover:text-primary text-sm"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Update
                        </button>
                        <button
                          type="button"
                          className="hover:text-primary text-sm"
                          onClick={() => {
                            setRemoveAvatar(true);
                            setAvatarFile(null);
                            setAvatarPreview(null);
                          }}
                        >
                          Delete
                        </button>
                      </span>
                    </div>
                  </div>

                  <div
                    id="FileUpload"
                    className="mb-5.5 border-primary bg-background sm:py-7.5 relative block w-full cursor-pointer appearance-none rounded border-2 border-dashed px-4 py-4"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPTED_AVATAR_TYPES.join(",")}
                      className="absolute inset-0 z-50 m-0 h-full w-full cursor-pointer p-0 opacity-0 outline-none"
                      onChange={handleAvatarChange}
                    />
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <span className="border-border bg-background flex h-10 w-10 items-center justify-center rounded-full border">
                        <Upload className="text-primary h-4 w-4" />
                      </span>
                      <p>
                        <span className="text-primary">Click to upload</span> or
                        drag and drop
                      </p>
                      <p className="mt-1.5">PNG, JPG, WebP or GIF</p>
                      <p>(max {MAX_AVATAR_DIMENSION} x {MAX_AVATAR_DIMENSION}px, 2MB)</p>
                    </div>
                  </div>

                  <div className="gap-4.5 flex justify-end">
                    <Button variant="outline" type="button" onClick={handleCancel} disabled={isSaving}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
};

export default SettingsPage;
