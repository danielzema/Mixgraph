import { useState, useEffect } from 'react'
import { getTransitions, deleteTransition, createTransition } from '../api'
import TrackBrowser from '../components/TrackBrowser'

function Transitions() {
  const [transitions, setTransitions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    loadTransitions()
  }, [])

  async function loadTransitions() {
    setLoading(true)
    const data = await getTransitions()
    setTransitions(data)
    setLoading(false)
  }

  async function handleDelete(id) {
    if (confirm('Remove this transition?')) {
      await deleteTransition(id)
      loadTransitions()
    }
  }

  async function handleCreate(data) {
    const result = await createTransition(data)
    if (result.error) {
      alert(result.error)
    } else {
      setShowModal(false)
      loadTransitions()
    }
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>All Transitions ({transitions.length})</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + New Transition
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : transitions.length === 0 ? (
        <div className="empty-state">
          <h3>No transitions yet</h3>
          <p>Create your first transition to get started</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>From</th>
                <th></th>
                <th>To</th>
                <th>Type</th>
                <th>Rating</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transitions.map(t => (
                <tr key={t.id}>
                  <td>
                    <div>{t.from_title}</div>
                    <small style={{ color: 'rgba(255,255,255,0.5)' }}>{t.from_artist}</small>
                  </td>
                  <td style={{ fontSize: '1.5rem', color: '#e94560' }}>→</td>
                  <td>
                    <div>{t.to_title}</div>
                    <small style={{ color: 'rgba(255,255,255,0.5)' }}>{t.to_artist}</small>
                  </td>
                  <td><span className="type-badge">{t.transition_type}</span></td>
                  <td><span className="stars">{'⭐'.repeat(t.rating)}</span></td>
                  <td>
                    {t.notes ? (
                      <span className="transition-notes">{t.notes}</span>
                    ) : (
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>—</span>
                    )}
                  </td>
                  <td className="actions">
                    <button 
                      className="btn btn-danger"
                      onClick={() => handleDelete(t.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <CreateTransitionModal 
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}


function CreateTransitionModal({ onClose, onCreate }) {
  const [fromTrack, setFromTrack] = useState(null)
  const [toTrack, setToTrack] = useState(null)
  const [selectingFor, setSelectingFor] = useState(null) // 'from' or 'to'
  const [rating, setRating] = useState(3)
  const [transitionType, setTransitionType] = useState('blend')
  const [notes, setNotes] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!fromTrack || !toTrack) {
      alert('Please select both tracks')
      return
    }
    onCreate({
      from_track_id: fromTrack.id,
      to_track_id: toTrack.id,
      rating,
      transition_type: transitionType,
      notes
    })
  }

  function handleTrackSelect(track) {
    if (selectingFor === 'from') {
      setFromTrack(track)
    } else {
      setToTrack(track)
    }
    setSelectingFor(null)
  }

  // Show track browser
  if (selectingFor) {
    return (
      <div className="modal-overlay" onClick={() => setSelectingFor(null)}>
        <div className="modal modal-large" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Select {selectingFor === 'from' ? 'Source' : 'Destination'} Track</h2>
            <button className="modal-close" onClick={() => setSelectingFor(null)}>×</button>
          </div>
          <TrackBrowser 
            onSelect={handleTrackSelect}
            excludeIds={selectingFor === 'to' && fromTrack ? [fromTrack.id] : []}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Create Transition</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>From Track</label>
            {fromTrack ? (
              <div className="selected-track">
                <div className="track-info">
                  <div className="track-title">{fromTrack.title}</div>
                  <div className="track-artist">{fromTrack.artist}</div>
                </div>
                <button 
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => setSelectingFor('from')}
                >
                  Change
                </button>
              </div>
            ) : (
              <button 
                type="button"
                className="btn btn-secondary select-track-btn"
                onClick={() => setSelectingFor('from')}
              >
                🔍 Browse & Select Track
              </button>
            )}
          </div>

          <div className="form-group">
            <label>To Track</label>
            {toTrack ? (
              <div className="selected-track">
                <div className="track-info">
                  <div className="track-title">{toTrack.title}</div>
                  <div className="track-artist">{toTrack.artist}</div>
                </div>
                <button 
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => setSelectingFor('to')}
                >
                  Change
                </button>
              </div>
            ) : (
              <button 
                type="button"
                className="btn btn-secondary select-track-btn"
                onClick={() => setSelectingFor('to')}
              >
                🔍 Browse & Select Track
              </button>
            )}
          </div>

          <div className="form-group">
            <label>Rating</label>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  className={`star-btn ${n <= rating ? 'active' : ''}`}
                  onClick={() => setRating(n)}
                >
                  ⭐
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Transition Type</label>
            <select 
              className="form-select"
              value={transitionType}
              onChange={e => setTransitionType(e.target.value)}
            >
              <option value="blend">Blend</option>
              <option value="echo_out">Echo Out</option>
              <option value="drop_swap">Drop Swap</option>
              <option value="wordplay">Wordplay</option>
              <option value="loop">Loop</option>
            </select>
          </div>

          <div className="form-group">
            <label>Notes (optional)</label>
            <textarea
              className="form-input"
              placeholder="E.g. 'Mix at the breakdown' or 'Match the snare hits'"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              style={{ resize: 'vertical', minHeight: '60px' }}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Transition
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


export default Transitions
