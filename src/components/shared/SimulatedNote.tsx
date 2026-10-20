// The label every sleeve-backed figure carries: these are simulated paper results
// from the engine's sleeve ledgers (research sizing), never real fills.

export function SimulatedNote({ className = '' }: { className?: string }) {
  return (
    <p className={`t-description ${className}`} data-testid="simulated-note">
      <span className="font-semibold">Simulated</span> — paper results from the engine&apos;s sleeve ledgers
      (research sizing); no real orders.
    </p>
  )
}
