interface HUDProps {
  items: { label: string; value: string | number }[]
  position?: 'top-left' | 'top-right' | 'top-center'
}

export function HUD({ items, position = 'top-left' }: HUDProps) {
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
  }

  return (
    <div className={`absolute ${positionClasses[position]} z-20 flex flex-col gap-1`}>
      {items.map((item) => (
        <div key={item.label} className="text-sm sm:text-base font-bold text-shadow-gold">
          <span className="text-gold-DEFAULT">{item.label}: </span>
          <span className="text-white">{item.value}</span>
        </div>
      ))}
    </div>
  )
}
