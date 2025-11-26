import { useTranslation } from "react-i18next";
import { useAuth } from "wasp/client/auth";
import { updateUserLanguage } from "wasp/client/operations";
import { Button } from "../../components/ui/button";

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const { data: user } = useAuth();
  const currentLanguage = i18n.language as "en" | "he";

  const handleLanguageToggle = async () => {
    const newLanguage = currentLanguage === "en" ? "he" : "en";

    // Change i18n language
    await i18n.changeLanguage(newLanguage);

    // Update document direction
    document.documentElement.dir = newLanguage === "he" ? "rtl" : "ltr";

    // Save to database if user is logged in
    if (user) {
      try {
        await updateUserLanguage({ language: newLanguage });
      } catch (error) {
        console.error("Failed to update language preference:", error);
      }
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLanguageToggle}
      className="px-2 py-1 text-base"
      title={currentLanguage === "en" ? "Switch to Hebrew" : "Switch to English"}
    >
      {currentLanguage === "en" ? "🇬🇧" : "🇮🇱"}
    </Button>
  );
}
