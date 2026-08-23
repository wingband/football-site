// Clerk 기본 UI는 밝은 테마라서 사이트(어두운 배경) 위에서 이질적으로 보인다.
// @clerk/themes를 따로 설치하지 않고 globals.css의 색값을 그대로 넘겨 맞춘다
const PITCH_NIGHT = "#0b1210"
const TURF_LINE = "#24492e"
const FLOODLIGHT = "#eaf6e9"
const SCORE_AMBER = "#f5b942"

export const clerkAuthAppearance = {
  variables: {
    colorPrimary: SCORE_AMBER,
    colorBackground: PITCH_NIGHT,
    colorText: FLOODLIGHT,
    colorTextSecondary: "rgba(234, 246, 233, 0.6)",
    colorInputBackground: "rgba(20, 48, 31, 0.6)",
    colorInputText: FLOODLIGHT,
    colorNeutral: FLOODLIGHT,
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: `bg-transparent shadow-none border border-[${TURF_LINE}]`,
    headerTitle: "text-[#eaf6e9]",
    headerSubtitle: "text-[#eaf6e9]/60",
    socialButtonsBlockButton: `border-[${TURF_LINE}] text-[#eaf6e9] hover:bg-[${TURF_LINE}]/40`,
    dividerLine: `bg-[${TURF_LINE}]`,
    dividerText: "text-[#eaf6e9]/40",
    formFieldLabel: "text-[#eaf6e9]/70",
    formButtonPrimary: `bg-[${SCORE_AMBER}] text-[${PITCH_NIGHT}] font-semibold hover:opacity-90`,
    footerActionText: "text-[#eaf6e9]/60",
    footerActionLink: `text-[${SCORE_AMBER}] hover:opacity-80`,
  },
} as const
