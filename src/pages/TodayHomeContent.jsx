import { Link } from 'react-router-dom'
import { ArrowRIcon, CheckIcon, LayersIcon } from '../components/Icons'
import EmptyState from '../components/EmptyState'
import { todayJourney } from '../lib/derive/today'
import { S } from '../lib/strings'

const T = S.home.today

function todayLabel() {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date())
}

function primaryCopy(primary) {
  if (!primary) return null
  if (primary.kind === 'resume') return T.resumeAction[primary.key]
  return T.startAction[primary.key]
}

function stageMeta(stage) {
  if (stage.interrupted) {
    if (stage.key === 'reading' && stage.progress != null) return T.readingProgress(stage.title, stage.progress)
    return T.resumeStage(stage.title)
  }
  if (stage.count > 0) return T.stageCount[stage.key](stage.count)
  return T.cleared
}

export default function TodayHomeContent() {
  const journey = todayJourney()

  if (!journey.hasMaterial) {
    return (
      <div className="scr scr-empty today-empty">
        <EmptyState
          centered
          icon={<LayersIcon size={30} />}
          title={T.emptyTitle}
          hint={T.emptyHint}
        >
          <Link to="/import" state={{ returnTo: '/' }} className="btn btn-primary">{T.importAction}</Link>
          <Link to="/?view=materials" className="btn btn-ghost">{T.openMaterials}</Link>
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="scr today-screen">
      <section className={`today-focus${journey.isComplete ? ' complete' : ''}`}>
        <span className="today-date">{todayLabel()}</span>
        <div className="today-heading">
          <div>
            <h2>{journey.isComplete ? T.completeTitle : T.pendingTitle(journey.totalItems)}</h2>
            <p>{journey.isComplete ? T.completeHint : T.primaryHint(journey.primary)}</p>
          </div>
          {journey.isComplete && <span className="today-check" aria-hidden="true"><CheckIcon size={18} /></span>}
        </div>
        {journey.primary && (
          <Link to={journey.primary.route} state={{ returnTo: '/' }} className="today-primary">
            <span>
              <em>{T.nextLabel}</em>
              {primaryCopy(journey.primary)}
            </span>
            <ArrowRIcon size={17} />
          </Link>
        )}
      </section>

      <section className="today-path" aria-labelledby="today-path-title">
        <div className="list-head">
          <span className="t" id="today-path-title">{T.pathTitle}</span>
          <span className="today-path-note">{T.pathNote}</span>
        </div>
        <ol>
          {journey.stages.map((stage) => {
            const isNext = journey.primary?.key === stage.key
            const isClear = !stage.route
            return (
              <li key={stage.key} className={`${isNext ? 'next ' : ''}${isClear ? 'clear' : ''}`}>
                <span className="today-stage-mark" aria-hidden="true" />
                <span className="today-stage-copy">
                  <strong>{T.stageLabel[stage.key]}</strong>
                  <span>{stageMeta(stage)}</span>
                </span>
                <span className="today-stage-state">{isNext ? T.nextLabel : isClear ? T.cleared : T.later}</span>
              </li>
            )
          })}
        </ol>
      </section>

      <Link to="/?view=materials" className="today-materials-link">
        <span>{T.materialsLink}</span>
        <ArrowRIcon size={14} />
      </Link>
    </div>
  )
}
