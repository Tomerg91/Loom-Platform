import HighlightedFeature from "./components/HighlightedFeature";
import SomaticBodyMap from "../client/components/SomaticBodyMap";
import { useTranslation } from "react-i18next";

export default function BodyMapShowcase() {
  const { t } = useTranslation();

  return (
    <HighlightedFeature
      name={t("landing.bodyMapShowcase.title")}
      description={t("landing.bodyMapShowcase.description")}
      highlightedComponent={
        <div className="w-full h-full flex justify-center p-4 md:p-8 bg-gradient-to-br from-slate-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 rounded-lg">
          <SomaticBodyMap />
        </div>
      }
      direction="row"
    />
  );
}
