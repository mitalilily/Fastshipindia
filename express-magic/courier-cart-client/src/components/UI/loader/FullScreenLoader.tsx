import { Box, Typography } from '@mui/material'
import React from 'react'
import './loader.css'
import { brandIdentity } from '../../../theme/brand'

type Props = {
  night?: boolean
}

const FullScreenLoader: React.FC<Props> = ({ night = false }) => {
  return (
    <Box
      className={`loader-overlay ${night ? 'night' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={`Loading ${brandIdentity.name}`}
    >
      <Box className="loader-content">
        <div className="loader-stage" aria-hidden="true">
          <span className="loader-orbit loader-orbit-outer" />
          <span className="loader-orbit loader-orbit-inner" />
          <div className="loader-logo-stack">
            <span className="loader-logo-depth loader-logo-depth-back" />
            <span className="loader-logo-depth loader-logo-depth-mid" />
            <div className="loader-logo-face">
              <img src={brandIdentity.logoSrc} alt="" className="loader-logo" />
              <span className="loader-logo-shine" />
            </div>
          </div>
          <span className="loader-floor-shadow" />
        </div>
        <Typography
          component="div"
          className="loader-brand"
          sx={{
            fontWeight: 800,
            fontSize: '0.72rem',
            textTransform: 'uppercase',
          }}
        >
          {brandIdentity.name}
          <span className="loader-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </Typography>
      </Box>
    </Box>
  )
}

export default FullScreenLoader
