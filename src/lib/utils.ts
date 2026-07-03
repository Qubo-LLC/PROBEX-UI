import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  CURRENCY_FORMAT,
  COMPACT_CURRENCY_FORMAT,
  PLATFORM_FEE_BPS,
} from '@/config/constants'
import type { Bias, ConfidenceLevel, SignalLevel } from '@/types/consensus'
import type { SentimentBias } from '@/types/market'

// ─── Tailwind class merge ──────────────────────────────────────────────────

/**
 * Merges Tailwind class names, resolving conflicts correctly.
 * Use instead of plain `clsx` for all className props.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

// ─── Number formatting ────────────────────────────────────────────────────

/** Format a number as USD currency. */
export function formatCurrency(
  value: number,
  compact = false,
): string {
  return new Intl.NumberFormat('en-US', compact ? COMPACT_CURRENCY_FORMAT : CURRENCY_FORMAT).format(value)
}

/**
 * Format a signed USD amount for P&L display (institutional convention):
 * gains are explicitly marked, zero stays neutral.
 * e.g. 3.15 → "+$3.15" · -1.2 → "-$1.20" · 0 → "$0.00"
 */
export function formatSignedCurrency(value: number, compact = false): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${formatCurrency(value, compact)}`
}

/** Format a probability (0–1) as a percentage string. */
export function formatProbability(value: number, decimals = 0): string {
  return `${(value * 100).toFixed(decimals)}%`
}

/** Alias for formatProbability — formats 0-1 value as percentage string */
export function formatPercent(value: number, decimals = 0): string {
  return formatProbability(value, decimals)
}

/**
 * Format a price in cents (0–100) as a dollar display.
 * e.g. 67 → "67¢"  |  100 → "$1.00"
 */
export function formatCentPrice(cents: number): string {
  if (cents >= 100) return '$1.00'
  if (cents <= 0) return '0¢'
  return `${cents}¢`
}

/** Format a large number with K/M/B suffix. */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation:             'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

/** Format a number as a percentage delta with sign. e.g. +3.4% or -1.2% */
export function formatDelta(value: number, decimals = 1): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${(value * 100).toFixed(decimals)}%`
}

/** Format a number as basis points delta. e.g. +340bps */
export function formatBps(value: number): string {
  const bps = Math.round(value * 10_000)
  const sign = bps >= 0 ? '+' : ''
  return `${sign}${bps}bps`
}

// ─── Payout estimation ────────────────────────────────────────────────────

/**
 * Estimate payout for a YES order.
 * Payout = (amount / yesPrice) × 100, minus platform fee.
 */
export function estimateYesPayout(
  amountUsd: number,
  yesPrice:  number,  // cents
): number {
  if (yesPrice <= 0) return 0
  const gross    = (amountUsd / yesPrice) * 100
  const feeMulti = 1 - PLATFORM_FEE_BPS / 10_000
  return gross * feeMulti
}

/** Estimate contracts for a given USD amount at a given price. */
export function estimateContracts(amountUsd: number, priceInCents: number): number {
  if (priceInCents <= 0) return 0
  return amountUsd / (priceInCents / 100)
}

// ─── Date formatting ──────────────────────────────────────────────────────

/** Format an ISO 8601 date string as a short human-readable date. */
export function formatDate(isoString: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day:   'numeric',
    year:  'numeric',
  }).format(new Date(isoString))
}

/** Format an ISO 8601 date string as a short time. */
export function formatTime(isoString: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour:   'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(isoString))
}

/** Format as "Jun 10, 2026 · 2:34 PM" */
export function formatDateTime(isoString: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month:  'short',
    day:    'numeric',
    year:   'numeric',
    hour:   'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(isoString))
}

/** Human-readable relative time: "2m ago", "3h ago", "in 4d" */
export function formatRelativeTime(isoString: string): string {
  const now   = Date.now()
  const then  = new Date(isoString).getTime()
  const diffS = Math.round((now - then) / 1000)

  if (Math.abs(diffS) < 60)  return diffS >= 0 ? 'just now' : 'in a moment'
  if (Math.abs(diffS) < 3600) {
    const m = Math.round(Math.abs(diffS) / 60)
    return diffS >= 0 ? `${m}m ago` : `in ${m}m`
  }
  if (Math.abs(diffS) < 86400) {
    const h = Math.round(Math.abs(diffS) / 3600)
    return diffS >= 0 ? `${h}h ago` : `in ${h}h`
  }
  const d = Math.round(Math.abs(diffS) / 86400)
  return diffS >= 0 ? `${d}d ago` : `in ${d}d`
}

/** Time remaining until a date. e.g. "14d 6h" or "Expired" */
export function formatTimeRemaining(isoString: string): string {
  const diff = new Date(isoString).getTime() - Date.now()
  if (diff <= 0) return 'Expired'

  const days  = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff % 86_400_000) / 3_600_000)
  const mins  = Math.floor((diff % 3_600_000) / 60_000)

  if (days > 0)  return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

// ─── Wallet ───────────────────────────────────────────────────────────────

/** Truncate a wallet address: "0x4a3f...d92c" */
export function truncateAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 2) return address
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

// ─── Consensus / sentiment display ────────────────────────────────────────

/** Maps a bias value to a display string with direction indicator. */
export function formatBias(bias: Bias): string {
  switch (bias) {
    case 'bullish': return 'Bullish ↑'
    case 'bearish': return 'Bearish ↓'
    case 'neutral': return 'Neutral →'
  }
}

/** Returns the CSS color variable name for a bias value. */
export function biasColorVar(bias: Bias): string {
  switch (bias) {
    case 'bullish': return 'var(--probex-positive)'
    case 'bearish': return 'var(--probex-negative)'
    case 'neutral': return 'var(--probex-warning)'
  }
}

/** Returns the CSS color variable name for a sentiment value. */
export function sentimentColorVar(sentiment: SentimentBias): string {
  switch (sentiment) {
    case 'bullish': return 'var(--probex-positive)'
    case 'bearish': return 'var(--probex-negative)'
    case 'neutral': return 'var(--probex-warning)'
  }
}

/** Maps a confidence level to display label. */
export function formatConfidence(confidence: ConfidenceLevel): string {
  switch (confidence) {
    case 'high':   return 'High'
    case 'medium': return 'Medium'
    case 'low':    return 'Low'
  }
}

/** Maps a signal level to display label. */
export function formatSignal(signal: SignalLevel): string {
  switch (signal) {
    case 'strong':   return 'Strong'
    case 'moderate': return 'Moderate'
    case 'weak':     return 'Weak'
  }
}

/** Returns color var for consensus score (0–1). */
export function consensusScoreColorVar(score: number): string {
  if (score >= 0.75) return 'var(--probex-consensus-high)'
  if (score >= 0.50) return 'var(--probex-consensus-med)'
  return 'var(--probex-consensus-low)'
}

/** Themed color var for a YES probability (0–1). Display bands, not trading logic. */
export function probabilityColorVar(prob: number): string {
  if (prob >= 0.65) return 'var(--probex-positive)'
  if (prob >= 0.45) return 'var(--probex-warning)'
  return 'var(--probex-negative)'
}

// ─── Async result helpers ──────────────────────────────────────────────────

/** Discriminated union for async state. */
export type AsyncResult<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string }

export function isSuccess<T>(
  result: AsyncResult<T>,
): result is { status: 'success'; data: T } {
  return result.status === 'success'
}

export function isLoading<T>(result: AsyncResult<T>): boolean {
  return result.status === 'loading'
}

export function isError<T>(
  result: AsyncResult<T>,
): result is { status: 'error'; error: string } {
  return result.status === 'error'
}
