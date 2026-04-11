import { GraduationCap } from 'lucide-react'

function LoadingSpinner({ fullscreen = false, text = 'Loading' }) {
  return (
    <div
      className={[
        'loading-spinner-wrap',
        fullscreen ? 'loading-spinner-fullscreen' : 'loading-spinner-inline',
      ].join(' ')}
      role="status"
      aria-live="polite"
      aria-label={text}
    >
      <div className="loading-hat-core">
        <span className="loading-hat-ring" />
        <GraduationCap className="loading-hat-icon" />
      </div>
      <span className="loading-spinner-text">{text}</span>
    </div>
  )
}

export default LoadingSpinner
