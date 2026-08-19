import ComingSoon from "@/components/ComingSoon"
import { COMING_SOON } from "@/lib/comingSoonCopy"

export default function Page() {
  const copy = COMING_SOON["news"]
  return <ComingSoon title={copy.title} desc={copy.desc} />
}