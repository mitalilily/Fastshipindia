import { Box } from '@mui/material'
import Checkbox, { type CheckboxProps } from '@mui/material/Checkbox'

// Compact tick stays inside the checkbox, so selected rows do not bleed into table edges.
const CustomTick = ({ checked }: { checked?: boolean }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#FFFFFF"
    strokeWidth="3.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: checked ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -50%) scale(0.8)',
      pointerEvents: 'none',
      opacity: checked ? 1 : 0,
      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    }}
  >
    <polyline points="4 12 9 17 20 6" />
  </svg>
)

export default function CustomCheckbox(props: CheckboxProps) {
  const { sx, ...checkboxProps } = props

  return (
    <Checkbox
      {...checkboxProps}
      disableRipple={false}
      color="primary"
      icon={
        <Box
          sx={{
            width: 20,
            height: 20,
            borderRadius: '6px',
            border: '2px solid #E0E6ED',
            boxSizing: 'border-box',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            backgroundColor: '#FFFFFF',
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: '#333369',
              boxShadow: '0 0 0 3px rgba(51, 51, 105, 0.08)',
            },
          }}
        />
      }
      checkedIcon={
        <Box
          sx={{
            width: 20,
            height: 20,
            borderRadius: '6px',
            border: '2px solid #0B3A78',
            boxSizing: 'border-box',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            backgroundColor: '#0B3A78',
            transition: 'all 0.2s ease',
            overflow: 'hidden',
            '&:hover': {
              borderColor: '#0B3A78',
              boxShadow: '0 0 0 3px rgba(11, 58, 120, 0.12)',
            },
          }}
        >
          <CustomTick checked />
        </Box>
      }
      sx={[
        {
          padding: '8px',
          overflow: 'hidden',
          '&:hover': {
            backgroundColor: 'rgba(51, 51, 105, 0.04)',
          },
          '&.Mui-focusVisible': {
            outline: '2px solid #333369',
            outlineOffset: '2px',
            borderRadius: '4px',
          },
          '& .MuiTouchRipple-root': {
            color: 'rgba(51, 51, 105, 0.3)',
          },
          '& svg': {
            overflow: 'hidden',
          },
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    />
  )
}
