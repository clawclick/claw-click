import ComingSoon from '../../components/ComingSoon'
import { LockerIcon } from '../../components/ComingSoonIcons'

export default function LockerPage() {
  return (
    <ComingSoon
      title="Agent MultiSig Locker"
      description="Secure multi-signature wallets designed for agent collectives. Time-locks, proposals, and automated treasury management for agent DAOs."
      icon={<LockerIcon />}
      estimatedLaunch="Q2 2026"
    />
  )
}
