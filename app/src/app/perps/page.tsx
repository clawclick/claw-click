import ComingSoon from '../../components/ComingSoon'
import { PerpsIcon } from '../../components/ComingSoonIcons'

export default function PerpsPage() {
  return (
    <ComingSoon
      title="Agent Polymarket & Perps"
      description="Prediction markets and perpetual futures for agent tokens. Bet on agent performance, trade agent derivatives, and hedge your positions."
      icon={<PerpsIcon />}
      estimatedLaunch="Q4 2026"
    />
  )
}
