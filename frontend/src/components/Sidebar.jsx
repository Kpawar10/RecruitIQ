export default function Sidebar() {
  const navItems = [
    { to: '/', label: 'Screener', icon: '⚡' },
    { to: '/dashboard', label: 'Dashboard', icon: '◫' },
    { to: '/analytics', label: 'Analytics', icon: '◈' },
  ]

  return (
    <aside style={{
      width: 220, background: 'var(--bg2)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', padding: '1.5rem 0', flexShrink: 0,
    }}>
      <nav style={{ padding: '0 0.75rem' }}>
        {navItems.map(({ to, label }) => (
          <div key={to}>{label}</div>
        ))}
      </nav>
    </aside>
  )
}