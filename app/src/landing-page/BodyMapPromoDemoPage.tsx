/**
 * Promotional Body Map Demo Page
 * This page displays the Body Map with sample highlighted zones
 * Use this page to take screenshots for the landing page
 *
 * Visit: /demo-body-map
 */

import BodyMapSelector from "../client/components/BodyMapSelector";

export default function BodyMapPromoDemo() {
  // Demo data: Red chest is the star feature!
  const demoHighlights = [
    { zone: "CHEST" as const, intensity: 9 }, // Red - the signature selling point
    { zone: "ARMS" as const, intensity: 6 }, // Amber
    { zone: "THROAT" as const, intensity: 5 }, // Amber
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        {/* Light Mode Card */}
        <div className="bg-white rounded-lg shadow-2xl p-12 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            See What Your Clients Feel
          </h2>
          <p className="text-gray-600 mb-8">
            The interactive Body Map turns abstract sensations into concrete
            visuals. Heat, tension, vibration — all tracked over time.
          </p>
          <div className="flex justify-center">
            <BodyMapSelector
              mode="readonly"
              highlightedZones={demoHighlights}
            />
          </div>
        </div>

        {/* Dark Mode Card */}
        <div className="bg-slate-900 rounded-lg shadow-2xl p-12 border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-2">
            See What Your Clients Feel
          </h2>
          <p className="text-slate-300 mb-8">
            The interactive Body Map turns abstract sensations into concrete
            visuals. Heat, tension, vibration — all tracked over time.
          </p>
          <div className="flex justify-center">
            <BodyMapSelector
              mode="readonly"
              highlightedZones={demoHighlights}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
