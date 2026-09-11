import { deliveryStageIndex, deliveryStages, type DeliveryStage } from '../data/deliveryStages'

interface DeliveryStepperProps {
  stage: DeliveryStage
  variant: 'staff' | 'customer'
  timestamps?: Partial<Record<DeliveryStage, string | null | undefined>>
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) return null
  return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function DeliveryStepper({ stage, variant, timestamps }: DeliveryStepperProps) {
  const currentIndex = deliveryStageIndex(stage)

  return (
    <div className="rk-delivery-stepper">
      <style>{`
        .rk-delivery-stepper {
          display: flex;
          align-items: flex-start;
        }
        .rk-delivery-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          min-width: 0;
        }
        .rk-delivery-step-row {
          display: flex;
          align-items: center;
          width: 100%;
        }
        .rk-delivery-node {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-secondary);
          border: 2px solid var(--chip-border);
          color: var(--text-faint);
          font-size: 10px;
          font-weight: 800;
        }
        .rk-delivery-node-done {
          background: var(--accent-red);
          border-color: var(--accent-red);
        }
        .rk-delivery-node-current {
          border-color: var(--accent-red);
          color: var(--accent-red);
          background: var(--bg);
        }
        .rk-delivery-line {
          flex: 1;
          height: 2px;
          background: var(--chip-border);
          margin: 0 2px;
        }
        .rk-delivery-line-done {
          background: var(--accent-red);
        }
        .rk-delivery-step-label {
          margin-top: 0.5rem;
          font-size: 0.6875rem;
          font-weight: 700;
          text-align: center;
          color: var(--text-faint);
          line-height: 1.3;
        }
        .rk-delivery-step-label-active {
          color: var(--text);
        }
        .rk-delivery-step-time {
          margin-top: 0.125rem;
          font-size: 0.625rem;
          color: var(--text-faint);
          text-align: center;
        }
      `}</style>
      {deliveryStages.map((s, i) => {
        const done = i < currentIndex || (i === currentIndex && stage === 'received')
        const isCurrent = i === currentIndex && stage !== 'received'
        const time = formatTimestamp(timestamps?.[s.key])
        return (
          <div className="rk-delivery-step" key={s.key}>
            <div className="rk-delivery-step-row">
              {i > 0 && <div className={`rk-delivery-line ${i <= currentIndex ? 'rk-delivery-line-done' : ''}`} />}
              <div className={`rk-delivery-node ${done ? 'rk-delivery-node-done' : isCurrent ? 'rk-delivery-node-current' : ''}`}>
                {done ? <CheckIcon /> : i + 1}
              </div>
              {i < deliveryStages.length - 1 && <div className={`rk-delivery-line ${i < currentIndex ? 'rk-delivery-line-done' : ''}`} />}
            </div>
            <span className={`rk-delivery-step-label ${done || isCurrent ? 'rk-delivery-step-label-active' : ''}`}>
              {variant === 'staff' ? s.staffLabel : s.customerLabel}
            </span>
            {time && <span className="rk-delivery-step-time">{time}</span>}
          </div>
        )
      })}
    </div>
  )
}
