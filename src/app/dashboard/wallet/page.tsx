import { redirect } from 'next/navigation'

// Legacy route — the real balance is one field on the Execution console;
// wallet operations return with live-mode capital ops (P4-01). Removed in M5.
export default function LegacyWalletPage() {
  redirect('/dashboard/execution')
}
