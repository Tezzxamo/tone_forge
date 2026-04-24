import React from 'react'

interface WaveformTypeProps {
  value: 0 | 1 | 2 | 3
  onChange: (value: 0 | 1 | 2 | 3) => void
}

const waveforms = [
  { id: 0 as const, label: '方波', icon: '⊓' },
  { id: 1 as const, label: '锯齿', icon: '∕' },
  { id: 2 as const, label: '正弦', icon: '∿' },
  { id: 3 as const, label: '噪声', icon: '*' }
]

const WaveformType: React.FC<WaveformTypeProps> = ({ value, onChange }) => {
  return (
    <div className="flex gap-2">
      {waveforms.map((wf) => (
        <button
          key={wf.id}
          onClick={() => onChange(wf.id)}
          className={`
            flex-1 py-2 px-1 rounded-md text-xs font-medium transition-all
            border border-tf-border
            ${value === wf.id
              ? 'bg-tf-accent text-tf-bg border-tf-accent shadow-[0_0_10px_rgba(0,229,255,0.3)]'
              : 'bg-tf-bg/50 text-tf-text-dim hover:text-tf-text hover:border-tf-accent/50'
            }
          `}
          title={wf.label}
        >
          <span className="text-lg block">{wf.icon}</span>
          <span className="block mt-0.5">{wf.label}</span>
        </button>
      ))}
    </div>
  )
}

export default WaveformType
