// Star rating display component
export function Stars({ rating, max = 5, size = 'normal' }) {
  const filled = Math.min(rating, max)
  const empty = max - filled
  const className = size === 'large' ? 'stars-large' : 'stars'
  
  return (
    <span className={className}>
      {[...Array(filled)].map((_, i) => (
        <span key={`filled-${i}`} className="icon-star"></span>
      ))}
      {[...Array(empty)].map((_, i) => (
        <span key={`empty-${i}`} className="icon-star-empty"></span>
      ))}
    </span>
  )
}

// Star rating input for forms
export function StarInput({ rating, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          className={`star-btn ${n <= rating ? 'active' : ''}`}
          onClick={() => onChange(n)}
        >
          <span className="icon-star"></span>
        </button>
      ))}
    </div>
  )
}
