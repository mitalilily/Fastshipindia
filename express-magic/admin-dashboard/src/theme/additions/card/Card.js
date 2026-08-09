const Card = {
  baseStyle: {
    p: '22px',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    position: 'relative',
    minWidth: '0px',
    wordWrap: 'break-word',
    backgroundClip: 'border-box',
  },
  variants: {
    panel: (props) => ({
      bg: props.colorMode === 'dark' ? '#101D36' : 'white',
      width: '100%',
      border: props.colorMode === 'dark' ? '1px solid rgba(134, 168, 211, 0.18)' : '1px solid rgba(6, 42, 91, 0.10)',
      boxShadow:
        props.colorMode === 'dark'
          ? '0 18px 40px rgba(5, 4, 10, 0.35)'
          : '0 16px 36px rgba(6, 42, 91, 0.07)',
      borderRadius: '22px',
      overflow: 'hidden',
    }),
  },
  defaultProps: {
    variant: 'panel',
  },
}

export const CardComponent = {
  components: {
    Card,
  },
}
