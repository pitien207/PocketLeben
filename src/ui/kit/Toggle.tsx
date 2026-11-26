import { Switch } from 'radix-ui'

/** 1.47 UI kit: a chunky on/off switch (Radix Switch: role="switch", Space/Enter, labelled). */
export function Toggle({
  checked,
  onChange,
  label,
  testId,
  disabled,
}: {
  checked: boolean
  onChange: (on: boolean) => void
  label: string
  testId?: string
  disabled?: boolean
}) {
  return (
    <Switch.Root checked={checked} onCheckedChange={onChange} aria-label={label} data-testid={testId} disabled={disabled} className="ui-switch">
      <Switch.Thumb className="ui-switch-knob">
        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full transition-colors ${checked ? 'bg-jade' : 'bg-ink/25'}`} />
      </Switch.Thumb>
    </Switch.Root>
  )
}
