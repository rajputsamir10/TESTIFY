import { GraduationCap } from 'lucide-react'

function LoadingSpinner({ fullscreen = false, text = 'Loading', showCap = true }) {
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
        {showCap ? <GraduationCap className="loading-hat-icon" /> : null}
      </div>
      <span className="loading-spinner-text">{text}</span>
      {fullscreen ? (
        <div className="loading-skeleton-stack" aria-hidden="true">
          <span className="loading-skeleton-line loading-skeleton-line-lg" />
          <span className="loading-skeleton-line" />
          <span className="loading-skeleton-line loading-skeleton-line-sm" />
        </div>
      ) : null}
    </div>
  )
}

export default LoadingSpinner
