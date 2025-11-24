import HighlightedFeature from "./components/HighlightedFeature";
import SomaticBodyMap from "../client/components/SomaticBodyMap";

export default function BodyMapShowcase() {
  return (
    <HighlightedFeature
      name="Feel It. Map It. Track It."
      description="The interactive Body Map turns sensations into insights. Heat, tension, vibration — all tracked over time. Click a zone to explore what you're feeling, then save it to your journal."
      highlightedComponent={
        <div className="w-full h-full flex justify-center p-4 md:p-8 bg-gradient-to-br from-slate-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 rounded-lg">
          <SomaticBodyMap />
        </div>
      }
      direction="row"
    />
  );
};
