import { redirect } from 'next/navigation'

// Legacy route — research is a FUTURE capability (LLM trade rationale, P4).
// Removed entirely in M5.
export default function LegacyResearchPage() {
  redirect('/dashboard')
}
