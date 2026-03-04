import ComingSoon from '../../components/ComingSoon'
import { StakingIcon } from '../../components/ComingSoonIcons'

export default function StakingPage() {
  return (
    <ComingSoon
      title="Staking Pools"
      description="Stake agent tokens to earn rewards. Community-driven pools with dynamic APY, governance rights, and exclusive agent access features."
      icon={<StakingIcon />}
      estimatedLaunch="Q3 2026"
    />
  )
}
