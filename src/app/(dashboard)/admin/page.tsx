import { redirect } from 'next/navigation'

// Legacy route — the Admin console was replaced by the System page; its two
// live panels (SystemHealth, RiskDashboard) were promoted there and to
// Survival. Removed entirely in M5.
export default function LegacyAdminPage() {
  redirect('/system')
}
