import type { Metadata } from 'next'
import { WalletPage } from '@/components/wallet/WalletPage'

export const metadata: Metadata = {
  title: 'Wallet — Probex',
  description: "The engine's capital — balance, allocation, and profit target progress.",
}

export default function WalletRoutePage() {
  return <WalletPage />
}
