const PALETTES = [
  ['#F4B9A6', '#E8735A'],
  ['#F3D29A', '#D9963B'],
  ['#C9D8B6', '#7E9F6A'],
  ['#F1E3B8', '#C9A24E'],
  ['#FBD38D', '#F08A4B'],
  ['#D7C6E8', '#9479B8'],
]

export function Cover({ emoji, palette, size = 'card' }: { emoji: string; palette: number; size?: 'card' | 'hero' }) {
  const [a, b] = PALETTES[palette % PALETTES.length]
  return (
    <div className={`cover cover-${size}`} style={{ background: `radial-gradient(120% 90% at 30% 20%, ${a}, ${b})` }}>
      <span className="cover-emoji" aria-hidden>{emoji}</span>
    </div>
  )
}

export const PALETTE_COUNT = PALETTES.length
