import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { acceptInvitation, useAction } from "wasp/client/operations";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Alert, AlertDescription } from "../components/ui/alert";
import { UserPlus } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import FormFieldWithValidation from "../components/FormFieldWithValidation";

export default function AcceptInvitePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();

  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ============================================
  // VALIDATION STATE
  // ============================================
  const [touched, setTouched] = useState({
    username: false,
    password: false,
    confirmPassword: false,
  });

  const [errors, setErrors] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });

  const acceptInvitationFn = useAction(acceptInvitation);

  // ============================================
  // VALIDATION FUNCTIONS
  // ============================================
  const validateField = (name: string, value: string) => {
    let error = "";

    switch (name) {
      case "username":
        if (!value) {
          error = t("auth.validation.nameRequired", "Name is required");
        } else if (value.length < 2) {
          error = t("auth.validation.nameTooShort", "Name must be at least 2 characters");
        } else if (value.length > 50) {
          error = t("auth.validation.nameTooLong", "Name cannot exceed 50 characters");
        }
        break;

      case "password":
        if (!value) {
          error = t("auth.validation.passwordRequired", "Password is required");
        } else if (value.length < 8) {
          error = t("auth.validation.passwordTooShort", "Password must be at least 8 characters");
        } else if (!/[A-Z]/.test(value)) {
          error = t(
            "auth.validation.passwordNeedsUppercase",
            "Password must contain at least one uppercase letter"
          );
        } else if (!/[a-z]/.test(value)) {
          error = t(
            "auth.validation.passwordNeedsLowercase",
            "Password must contain at least one lowercase letter"
          );
        } else if (!/[0-9]/.test(value)) {
          error = t("auth.validation.passwordNeedsNumber", "Password must contain at least one number");
        }
        break;

      case "confirmPassword":
        if (!value) {
          error = t("auth.validation.confirmPasswordRequired", "Please confirm your password");
        } else if (value !== password) {
          error = t("auth.validation.passwordMismatch", "Passwords do not match");
        }
        break;
    }

    return error;
  };

  const handleFieldBlur = (fieldName: string) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
    const value =
      fieldName === "username"
        ? username
        : fieldName === "password"
          ? password
          : confirmPassword;
    const error = validateField(fieldName, value);
    setErrors((prev) => ({ ...prev, [fieldName]: error }));
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    // Update state
    if (fieldName === "username") setUsername(value);
    else if (fieldName === "password") {
      setPassword(value);
      // Re-validate confirm password if it was already touched
      if (touched.confirmPassword) {
        const confirmError = validateField("confirmPassword", confirmPassword);
        setErrors((prev) => ({ ...prev, confirmPassword: confirmError }));
      }
    } else if (fieldName === "confirmPassword") setConfirmPassword(value);

    // Validate if already touched
    if (touched[fieldName as keyof typeof touched]) {
      const error = validateField(fieldName, value);
      setErrors((prev) => ({ ...prev, [fieldName]: error }));
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tokenParam = params.get("token");

    if (!tokenParam) {
      setErrorMessage("Invalid invitation link");
    } else {
      setToken(tokenParam);
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // ============================================
    // VALIDATE ALL FIELDS BEFORE SUBMIT
    // ============================================
    const newErrors = {
      username: validateField("username", username),
      password: validateField("password", password),
      confirmPassword: validateField("confirmPassword", confirmPassword),
    };

    setErrors(newErrors);
    setTouched({
      username: true,
      password: true,
      confirmPassword: true,
    });

    // Check if there are any errors
    const hasErrors = Object.values(newErrors).some((error) => error !== "");
    if (hasErrors) {
      setErrorMessage(t("auth.validation.fixErrors", "Please fix validation errors before submitting"));
      return;
    }

    if (!token) {
      setErrorMessage("Invalid invitation token");
      return;
    }

    try {
      setIsSubmitting(true);
      await acceptInvitationFn({ token, password, username });

      // Success! Show toast and redirect to login
      toast({
        title: t("auth.accountCreatedSuccess"),
      });
      navigate("/login");
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to accept invitation");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert className="bg-red-50 border-red-200">
              <AlertDescription className="text-red-800">
                {errorMessage || "Invalid invitation link"}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <UserPlus className="h-6 w-6" />
            Accept Your Invitation
          </CardTitle>
          <p className="text-muted-foreground text-sm mt-2">
            You&apos;ve been invited to join Loom Platform as a client. Set up your
            account below.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormFieldWithValidation
              label="Your Name"
              error={errors.username}
              touched={touched.username}
              success={touched.username && !errors.username && username.length > 0}
              hint="2-50 characters"
              required={true}
            >
              <Input
                id="username"
                type="text"
                placeholder="John Doe"
                value={username}
                onChange={(e) => handleFieldChange("username", e.target.value)}
                onBlur={() => handleFieldBlur("username")}
                disabled={isSubmitting}
                className={`${
                  touched.username && errors.username ? "border-red-500" : ""
                } ${
                  touched.username && !errors.username && username ? "border-green-500" : ""
                }`}
              />
            </FormFieldWithValidation>

            <FormFieldWithValidation
              label="Password"
              error={errors.password}
              touched={touched.password}
              success={touched.password && !errors.password && password.length > 0}
              hint="Minimum 8 characters with uppercase, lowercase, and number"
              required={true}
            >
              <Input
                id="password"
                type="password"
                placeholder="Enter a secure password"
                value={password}
                onChange={(e) => handleFieldChange("password", e.target.value)}
                onBlur={() => handleFieldBlur("password")}
                disabled={isSubmitting}
                className={`${
                  touched.password && errors.password ? "border-red-500" : ""
                } ${
                  touched.password && !errors.password && password ? "border-green-500" : ""
                }`}
              />
            </FormFieldWithValidation>

            <FormFieldWithValidation
              label="Confirm Password"
              error={errors.confirmPassword}
              touched={touched.confirmPassword}
              success={touched.confirmPassword && !errors.confirmPassword && confirmPassword.length > 0}
              required={true}
            >
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => handleFieldChange("confirmPassword", e.target.value)}
                onBlur={() => handleFieldBlur("confirmPassword")}
                disabled={isSubmitting}
                className={`${
                  touched.confirmPassword && errors.confirmPassword ? "border-red-500" : ""
                } ${
                  touched.confirmPassword && !errors.confirmPassword && confirmPassword ? "border-green-500" : ""
                }`}
              />
            </FormFieldWithValidation>

            {errorMessage && (
              <Alert className="bg-red-50 border-red-200">
                <AlertDescription className="text-red-800">
                  {errorMessage}
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
