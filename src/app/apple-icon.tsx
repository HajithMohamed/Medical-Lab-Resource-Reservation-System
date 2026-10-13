import { ImageResponse } from "next/og";
import { BRAND_COLORS } from "@/config/brand";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: BRAND_COLORS.navy,
        borderRadius: 40,
      }}
    >
      <svg width="120" height="120" viewBox="0 0 32 32">
        <rect width="32" height="32" rx="8" fill="#ffffff" fillOpacity="0.12" />
        <path
          d="M9 7v18M16 7v18M23 7v18"
          stroke={BRAND_COLORS.line}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <rect x="13" y="15" width="6" height="8" rx="2" fill={BRAND_COLORS.slot} />
      </svg>
    </div>,
    {
      ...size,
    },
  );
}
