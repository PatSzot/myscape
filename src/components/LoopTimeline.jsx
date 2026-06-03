export default function LoopTimeline({ loopS }) {
  return (
    <div className="ep-timeline ep-field">
      <div className="ep-timeline-track">
        <span
          className="ep-timeline-playhead"
          style={{ animationDuration: `${loopS}s` }}
        />
      </div>
    </div>
  )
}
