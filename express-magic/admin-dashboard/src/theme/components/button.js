export const buttonStyles = {
  components: {
    Button: {
      variants: {
        'no-hover': {
          _hover: {
            boxShadow: 'none',
          },
        },
        'transparent-with-icon': {
          bg: 'transparent',
          fontWeight: '600',
          borderRadius: '14px',
          cursor: 'pointer',
          _active: {
            bg: 'transparent',
            transform: 'none',
            borderColor: 'transparent',
          },
          _focus: {
            boxShadow: 'none',
          },
          _hover: {
            bg: 'rgba(6, 42, 91, 0.08)',
          },
        },
      },
      baseStyle: {
        borderRadius: '14px',
        fontWeight: '600',
        _focus: {
          boxShadow: 'none',
        },
      },
    },
  },
}
