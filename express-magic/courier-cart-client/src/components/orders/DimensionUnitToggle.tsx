import { alpha, ButtonBase, Stack, Typography, useTheme } from '@mui/material'

export type DimensionUnit = 'cm' | 'inch'

const CM_PER_INCH = 2.54

const dimensionUnits: Array<{ value: DimensionUnit; label: string }> = [
  { value: 'cm', label: 'CM' },
  { value: 'inch', label: 'INCH' },
]

export const getDimensionUnitLabel = (unit: DimensionUnit) => (unit === 'inch' ? 'inch' : 'cm')

export const formatDimensionForUnit = (valueCm: unknown, unit: DimensionUnit) => {
  const cm = Number(valueCm || 0)
  if (!Number.isFinite(cm) || cm <= 0) return ''

  const displayValue = unit === 'inch' ? cm / CM_PER_INCH : cm
  return Number(displayValue.toFixed(2))
}

export const parseDimensionToCm = (value: string | number, unit: DimensionUnit) => {
  if (value === '') return 0

  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 0

  const cmValue = unit === 'inch' ? numericValue * CM_PER_INCH : numericValue
  return Number(cmValue.toFixed(2))
}

type DimensionUnitToggleProps = {
  value: DimensionUnit
  onChange: (value: DimensionUnit) => void
}

export default function DimensionUnitToggle({ value, onChange }: DimensionUnitToggleProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const accent = '#0D3B8E'
  const muted = isDark ? '#9AA9BD' : '#64748B'

  return (
    <Stack direction="row" alignItems="center" spacing={0.6} sx={{ flexShrink: 0 }}>
      <Typography
        sx={{
          color: muted,
          fontSize: '0.72rem',
          fontWeight: 800,
          letterSpacing: 0,
          textTransform: 'uppercase',
        }}
      >
        Unit
      </Typography>
      <Stack
        direction="row"
        role="group"
        aria-label="Dimension unit"
        sx={{
          p: 0.25,
          borderRadius: '8px',
          border: `1px solid ${alpha(accent, isDark ? 0.3 : 0.16)}`,
          bgcolor: isDark ? alpha('#FFFFFF', 0.04) : '#FFFFFF',
        }}
      >
        {dimensionUnits.map((unit) => {
          const selected = value === unit.value

          return (
            <ButtonBase
              key={unit.value}
              onClick={() => onChange(unit.value)}
              aria-pressed={selected}
              sx={{
                minWidth: 52,
                height: 30,
                px: 1,
                borderRadius: '7px',
                color: selected ? '#FFFFFF' : accent,
                bgcolor: selected ? accent : 'transparent',
                fontSize: '0.76rem',
                fontWeight: 800,
                lineHeight: 1,
                transition: 'background-color 140ms ease, color 140ms ease',
                '&:hover': {
                  bgcolor: selected ? accent : alpha(accent, isDark ? 0.18 : 0.08),
                },
                '&:focus-visible': {
                  outline: `2px solid ${alpha(accent, 0.5)}`,
                  outlineOffset: 1,
                },
              }}
            >
              {unit.label}
            </ButtonBase>
          )
        })}
      </Stack>
    </Stack>
  )
}
