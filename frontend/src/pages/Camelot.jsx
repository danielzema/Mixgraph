import { useState } from 'react'

// Camelot wheel compatibility checker
function isInKey(key1, key2) {
  if (!key1 || !key2) return null
  
  const parse = (key) => {
    const match = key.match(/^(\d{1,2})([ABab])$/i)
    if (!match) return null
    return { num: parseInt(match[1]), letter: match[2].toUpperCase() }
  }
  
  const k1 = parse(key1)
  const k2 = parse(key2)
  
  if (!k1 || !k2) return null
  
  if (k1.num === k2.num && k1.letter === k2.letter) return true
  if (k1.num === k2.num && k1.letter !== k2.letter) return true
  if (k1.letter === k2.letter) {
    const diff = Math.abs(k1.num - k2.num)
    if (diff === 1 || diff === 11) return true
  }
  
  return false
}

// Camelot wheel keys
const camelotKeys = [
  { camelot: '1A', musical: 'A♭m' },
  { camelot: '2A', musical: 'E♭m' },
  { camelot: '3A', musical: 'B♭m' },
  { camelot: '4A', musical: 'Fm' },
  { camelot: '5A', musical: 'Cm' },
  { camelot: '6A', musical: 'Gm' },
  { camelot: '7A', musical: 'Dm' },
  { camelot: '8A', musical: 'Am' },
  { camelot: '9A', musical: 'Em' },
  { camelot: '10A', musical: 'Bm' },
  { camelot: '11A', musical: 'F♯m' },
  { camelot: '12A', musical: 'D♭m' },
  { camelot: '1B', musical: 'B' },
  { camelot: '2B', musical: 'F♯' },
  { camelot: '3B', musical: 'D♭' },
  { camelot: '4B', musical: 'A♭' },
  { camelot: '5B', musical: 'E♭' },
  { camelot: '6B', musical: 'B♭' },
  { camelot: '7B', musical: 'F' },
  { camelot: '8B', musical: 'C' },
  { camelot: '9B', musical: 'G' },
  { camelot: '10B', musical: 'D' },
  { camelot: '11B', musical: 'A' },
  { camelot: '12B', musical: 'E' },
]

const SELECTED_COLOR = '#a78bfa' // Purple accent

function Camelot() {
  const [selectedKey, setSelectedKey] = useState(null)
  
  const handleKeyClick = (key) => {
    if (selectedKey?.camelot === key.camelot) {
      setSelectedKey(null)
    } else {
      setSelectedKey(key)
    }
  }
  
  const getKeyPosition = (index, isOuter) => {
    const angle = (index * 30 - 90) * (Math.PI / 180)
    const radius = isOuter ? 42 : 28
    return {
      x: 50 + radius * Math.cos(angle),
      y: 50 + radius * Math.sin(angle)
    }
  }
  
  const getKeyState = (key) => {
    if (!selectedKey) return 'default'
    if (selectedKey.camelot === key.camelot) return 'selected'
    return isInKey(selectedKey.camelot, key.camelot) ? 'compatible' : 'incompatible'
  }

  return (
    <div className="camelot-page">
      <div className="camelot-header">
        <h2>Camelot Wheel</h2>
        <p>Click a key to see compatible keys</p>
      </div>
      
      <div className="camelot-wheel-wrapper">
        <div className="camelot-wheel-glow"></div>
        <svg viewBox="0 0 100 100" className="camelot-wheel">
          {/* Background rings */}
          <circle cx="50" cy="50" r="48" fill="none" stroke="var(--border-subtle)" strokeWidth="0.3" />
          <circle cx="50" cy="50" r="35" fill="none" stroke="var(--border-subtle)" strokeWidth="0.3" />
          <circle cx="50" cy="50" r="21" fill="none" stroke="var(--border-subtle)" strokeWidth="0.3" />
          
          {/* Center */}
          <circle cx="50" cy="50" r="12" fill="var(--surface-base)" stroke="var(--border-default)" strokeWidth="0.3" />
          <text x="50" y="48" textAnchor="middle" fill="var(--text-tertiary)" fontSize="2.5" fontWeight="500">MAJOR</text>
          <text x="50" y="51" textAnchor="middle" fill="var(--text-tertiary)" fontSize="1.8">(outer)</text>
          <text x="50" y="54" textAnchor="middle" fill="var(--text-tertiary)" fontSize="1.8">MINOR</text>
          <text x="50" y="57" textAnchor="middle" fill="var(--text-tertiary)" fontSize="1.8">(inner)</text>
          
          {/* Outer ring (B keys - Major) */}
          {camelotKeys.slice(12).map((key, i) => {
            const pos = getKeyPosition(i, true)
            const state = getKeyState(key)
            
            let fill, stroke, strokeWidth, textFill, subTextFill
            if (state === 'selected') {
              fill = SELECTED_COLOR
              stroke = SELECTED_COLOR
              strokeWidth = 0.8
              textFill = 'var(--surface-base)'
              subTextFill = 'var(--surface-base)'
            } else if (state === 'compatible') {
              fill = 'rgba(34, 197, 94, 0.3)'
              stroke = '#22c55e'
              strokeWidth = 0.6
              textFill = '#22c55e'
              subTextFill = '#22c55e'
            } else if (state === 'incompatible') {
              fill = 'rgba(239, 68, 68, 0.15)'
              stroke = '#ef4444'
              strokeWidth = 0.4
              textFill = '#ef4444'
              subTextFill = 'rgba(239, 68, 68, 0.7)'
            } else {
              fill = 'var(--surface-elevated)'
              stroke = 'var(--border-default)'
              strokeWidth = 0.4
              textFill = 'var(--text-primary)'
              subTextFill = 'var(--text-tertiary)'
            }
            
            return (
              <g 
                key={key.camelot} 
                onClick={() => handleKeyClick(key)} 
                className="camelot-key"
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="5.5"
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  style={{ 
                    filter: state === 'selected' ? `drop-shadow(0 0 4px ${SELECTED_COLOR})` : 'none',
                    transition: 'all 0.2s ease'
                  }}
                />
                <text
                  x={pos.x}
                  y={pos.y - 0.6}
                  textAnchor="middle"
                  fill={textFill}
                  fontSize="3.2"
                  fontWeight="600"
                  style={{ transition: 'fill 0.2s ease', pointerEvents: 'none' }}
                >
                  {key.camelot}
                </text>
                <text
                  x={pos.x}
                  y={pos.y + 2.4}
                  textAnchor="middle"
                  fill={subTextFill}
                  fontSize="2"
                  style={{ transition: 'fill 0.2s ease', pointerEvents: 'none' }}
                >
                  {key.musical}
                </text>
              </g>
            )
          })}
          
          {/* Inner ring (A keys - Minor) */}
          {camelotKeys.slice(0, 12).map((key, i) => {
            const pos = getKeyPosition(i, false)
            const state = getKeyState(key)
            
            let fill, stroke, strokeWidth, textFill, subTextFill
            if (state === 'selected') {
              fill = SELECTED_COLOR
              stroke = SELECTED_COLOR
              strokeWidth = 0.8
              textFill = 'var(--surface-base)'
              subTextFill = 'var(--surface-base)'
            } else if (state === 'compatible') {
              fill = 'rgba(34, 197, 94, 0.3)'
              stroke = '#22c55e'
              strokeWidth = 0.6
              textFill = '#22c55e'
              subTextFill = '#22c55e'
            } else if (state === 'incompatible') {
              fill = 'rgba(239, 68, 68, 0.15)'
              stroke = '#ef4444'
              strokeWidth = 0.4
              textFill = '#ef4444'
              subTextFill = 'rgba(239, 68, 68, 0.7)'
            } else {
              fill = 'var(--surface-elevated)'
              stroke = 'var(--border-default)'
              strokeWidth = 0.4
              textFill = 'var(--text-primary)'
              subTextFill = 'var(--text-tertiary)'
            }
            
            return (
              <g 
                key={key.camelot} 
                onClick={() => handleKeyClick(key)} 
                className="camelot-key"
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="4.5"
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  style={{ 
                    filter: state === 'selected' ? `drop-shadow(0 0 4px ${SELECTED_COLOR})` : 'none',
                    transition: 'all 0.2s ease'
                  }}
                />
                <text
                  x={pos.x}
                  y={pos.y - 0.3}
                  textAnchor="middle"
                  fill={textFill}
                  fontSize="2.8"
                  fontWeight="600"
                  style={{ transition: 'fill 0.2s ease', pointerEvents: 'none' }}
                >
                  {key.camelot}
                </text>
                <text
                  x={pos.x}
                  y={pos.y + 2}
                  textAnchor="middle"
                  fill={subTextFill}
                  fontSize="1.7"
                  style={{ transition: 'fill 0.2s ease', pointerEvents: 'none' }}
                >
                  {key.musical}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

export default Camelot
