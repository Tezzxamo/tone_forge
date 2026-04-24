import React from 'react'

interface SliderControlProps {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  shiftStep?: number
  onChange: (value: number) => void
  shiftPressed: boolean
  disabled?: boolean
  tooltip?: string
}

const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  shiftStep = 0.001,
  onChange,
  shiftPressed,
  disabled = false,
  tooltip
}) => {
  const currentStep = shiftPressed ? shiftStep : step
  const displayValue = value.toFixed(shiftPressed ? 3 : 2)

  return (
    <div className={`flex items-center gap-3 py-1 ${disabled ? 'opacity-40' : ''}`}>
      <div className="tf-tooltip shrink-0">
        <label className="text-tf-text-dim text-xs w-28 block cursor-help border-b border-dashed border-tf-text-dim/30">
          {label}
        </label>
        {tooltip && (
          <div className="tf-tooltip-content">{tooltip}</div>
        )}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={currentStep}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        className="flex-1 h-1.5 bg-tf-border rounded-lg appearance-none cursor-pointer accent-tf-accent hover:accent-tf-accent-hover"
      />
      <span className="text-tf-text text-xs w-14 text-right font-mono">{displayValue}</span>
    </div>
  )
}

export default SliderControl
