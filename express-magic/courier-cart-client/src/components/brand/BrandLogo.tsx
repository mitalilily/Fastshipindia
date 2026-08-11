import { Box, type BoxProps } from '@mui/material'
import { brandIdentity } from '../../theme/brand'

interface BrandLogoProps extends Omit<BoxProps, 'component'> {
  compact?: boolean
}

export default function BrandLogo({ compact = false, sx, ...rest }: BrandLogoProps) {
  return (
    <Box
      component="span"
      role="img"
      aria-label={brandIdentity.name}
      sx={{
        width: compact ? 56 : { xs: 132, sm: 156 },
        height: compact ? 32 : 'auto',
        aspectRatio: compact ? 'auto' : '3 / 1',
        flexShrink: 0,
        display: 'block',
        backgroundImage: `url(${compact ? brandIdentity.markSrc : brandIdentity.logoSrc})`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: compact ? '68px 68px' : 'cover',
        ...sx,
      }}
      {...rest}
    />
  )
}
