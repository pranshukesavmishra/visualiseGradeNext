interface Props {
  index: number
  total: number
  playing: boolean
  speed: number
  onPlayPause: () => void
  onSeek: (index: number) => void
  onStepBack: () => void
  onStepForward: () => void
  onRestart: () => void
  onSpeed: (speed: number) => void
}

const SPEEDS = [
  { label: '0.5×', value: 0.5 },
  { label: '1×', value: 1 },
  { label: '2×', value: 2 },
  { label: '4×', value: 4 },
]

// Video-style transport: play/pause, step, restart, a scrubber, and speeds.
export default function Player({
  index,
  total,
  playing,
  speed,
  onPlayPause,
  onSeek,
  onStepBack,
  onStepForward,
  onRestart,
  onSpeed,
}: Props) {
  const lastIndex = Math.max(total - 1, 0)
  const atStart = index <= 0
  const atEnd = index >= lastIndex

  return (
    <div className="player">
      <div className="scrubber-row">
        <input
          type="range"
          className="scrubber"
          min={0}
          max={lastIndex}
          value={index}
          onChange={(e) => onSeek(Number(e.target.value))}
          aria-label="Step through the program"
        />
        <span className="step-count">
          Step {Math.min(index + 1, total)} / {total}
        </span>
      </div>

      <div className="transport">
        <button className="round-btn" onClick={onRestart} disabled={atStart} title="Back to start" aria-label="Restart">
          ⏮
        </button>
        <button className="round-btn" onClick={onStepBack} disabled={atStart} title="Step back" aria-label="Step back">
          ◀
        </button>
        <button className="round-btn play" onClick={onPlayPause} title={playing ? 'Pause' : 'Play'} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? '⏸' : '▶'}
        </button>
        <button
          className="round-btn"
          onClick={onStepForward}
          disabled={atEnd}
          title="Step forward"
          aria-label="Step forward"
        >
          ▶
        </button>

        <div style={{ flex: 1 }} />

        <div className="speed">
          <span>Speed</span>
          <div className="speed-buttons">
            {SPEEDS.map((s) => (
              <button
                key={s.value}
                className={`speed-btn ${speed === s.value ? 'active' : ''}`}
                onClick={() => onSpeed(s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
