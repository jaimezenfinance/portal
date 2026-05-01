export default function Mascot({ size = 180, animate = false }: { size?: number; animate?: boolean }) {
  return (
    <div
      className="inline-block"
      style={{
        width: size,
        height: size,
        animation: animate ? 'breathe 3.5s ease-in-out infinite' : undefined,
      }}
    >
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.07); }
        }
      `}</style>
      <img
        src="/mascota zen.jpg"
        alt="Zen mascot"
        style={{ width: size, height: size, objectFit: 'contain' }}
        onError={(e) => {
          const el = e.target as HTMLImageElement
          el.style.display = 'none'
          const parent = el.parentElement!
          parent.style.display = 'flex'
          parent.style.alignItems = 'center'
          parent.style.justifyContent = 'center'
          parent.style.fontSize = `${size * 0.5}px`
          parent.innerHTML = '🧘‍♀️'
        }}
      />
    </div>
  )
}
