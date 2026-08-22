import {
  alpha,
  Box,
  Button,
  CircularProgress,
  ClickAwayListener,
  Grow,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Popper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import React, { useRef, useState, type KeyboardEvent } from 'react'
import { FiChevronDown } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import type { GlobalSearchResult } from '../../api/globalSearch.api'
import { useGlobalSearch } from '../../hooks/useGlobalSearch'

const INK = '#171310'
const CLAY = '#D97943'
const SURFACE = '#FFFDF8'
type SearchMode = 'lrn' | 'mawb' | 'order_id'

const SEARCH_MODES: Array<{ value: SearchMode; label: string; placeholder: string }> = [
  { value: 'lrn', label: 'LRN', placeholder: 'Search up to 25 LRNs' },
  { value: 'mawb', label: 'MAWB', placeholder: 'Search MAWB number' },
  { value: 'order_id', label: 'Order ID', placeholder: 'Search Order ID' },
]

const getMetadataAwb = (metadata?: Record<string, unknown>) => {
  const value = metadata?.awb ?? metadata?.awb_number ?? metadata?.awbNumber
  return typeof value === 'string' ? value.trim() : ''
}

const getClientTrackingPathFromLegacyLink = (link: string) => {
  try {
    const url = new URL(link, window.location.origin)
    if (url.pathname === '/tracking') {
      return `/tools/order_tracking${url.search || ''}`
    }
  } catch {
    return null
  }

  return null
}

const GlobalSearch = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMode, setSearchMode] = useState<SearchMode>('lrn')
  const [open, setOpen] = useState(false)
  const [popperReady, setPopperReady] = useState(false)
  const [modeAnchor, setModeAnchor] = useState<HTMLElement | null>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const activeMode = SEARCH_MODES.find((mode) => mode.value === searchMode) || SEARCH_MODES[0]
  const shouldSearch = open && searchQuery.trim().length >= 2
  const { data: searchResults, isLoading, isFetching } = useGlobalSearch(searchQuery, shouldSearch)

  // Delay popper rendering to ensure DOM is ready
  React.useEffect(() => {
    if (open && anchorRef.current) {
      // Small delay to ensure DOM is ready before transition
      const timer = setTimeout(() => {
        setPopperReady(true)
      }, 10)
      return () => {
        clearTimeout(timer)
        setPopperReady(false)
      }
    } else {
      setPopperReady(false)
    }
  }, [open])

  const handleClickAway = () => {
    setOpen(false)
  }

  const normalizeSearchTokens = (value: string) =>
    value
      .split(/[\s,]+/)
      .map((token) => token.trim())
      .filter(Boolean)
      .slice(0, 25)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    // Keep dropdown open when typing
    if (value.trim().length >= 2 || open) {
      setOpen(true)
    }
  }

  const handleResultClick = (result: GlobalSearchResult) => {
    const awb = getMetadataAwb(result.metadata)
    const legacyTrackingPath = getClientTrackingPathFromLegacyLink(result.link)

    if (result.type === 'order' && awb) {
      navigate(`/tools/order_tracking?awb=${encodeURIComponent(awb)}`)
    } else if (legacyTrackingPath) {
      navigate(legacyTrackingPath)
    } else {
      navigate(result.link)
    }
    setSearchQuery('')
    setOpen(false)
  }

  const runSearch = () => {
    const trimmedQuery = searchQuery.trim()
    if (!trimmedQuery) {
      setOpen(true)
      return
    }

    const searchTokens = normalizeSearchTokens(trimmedQuery)
    const primaryTrackingId = (searchTokens[0] || trimmedQuery).toUpperCase()

    if (searchMode === 'lrn' || searchMode === 'mawb') {
      navigate(`/tools/order_tracking?awb=${encodeURIComponent(primaryTrackingId)}`)
    } else if (searchMode === 'order_id') {
      navigate(`/orders/list?search=${encodeURIComponent(trimmedQuery)}`)
    } else if (searchResults?.results && searchResults.results.length > 0) {
      handleResultClick(searchResults.results[0])
      return
    } else {
      navigate(`/orders/list?search=${encodeURIComponent(trimmedQuery)}`)
    }

    setSearchQuery('')
    setOpen(false)
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      runSearch()
    }
    if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      order: 'Order',
      invoice: 'Invoice',
      ndr: 'NDR',
      rto: 'RTO',
      weight_discrepancy: 'Weight Discrepancy',
    }
    return labels[type] || type
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      order: INK,
      invoice: '#56C0A5',
      ndr: CLAY,
      rto: '#DE350B',
      weight_discrepancy: '#74685D',
    }
    return colors[type] || '#74685D'
  }

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <Box
        ref={anchorRef}
        sx={{
          display: 'grid',
          gridTemplateColumns: '82px minmax(0, 1fr) 86px',
          alignItems: 'center',
          height: 44,
          width: '100%',
          bgcolor: '#FFFFFF',
          border: `1px solid ${alpha(INK, 0.12)}`,
          borderRadius: 1,
          boxShadow: `0 8px 18px ${alpha(INK, 0.06)}`,
          overflow: 'hidden',
          '&:focus-within': {
            borderColor: alpha('#4D63FF', 0.72),
            boxShadow: `0 0 0 3px ${alpha('#4D63FF', 0.12)}`,
          },
        }}
      >
        <Button
          type="button"
          onClick={(event) => setModeAnchor(event.currentTarget)}
          endIcon={<FiChevronDown size={14} />}
          sx={{
            height: '100%',
            minWidth: 0,
            borderRadius: 0,
            borderRight: `1px solid ${alpha(INK, 0.1)}`,
            color: INK,
            bgcolor: alpha('#F8FAFC', 0.9),
            fontSize: 13,
            fontWeight: 700,
            textTransform: 'none',
            '&:hover': { bgcolor: '#F1F5F9' },
          }}
        >
          {activeMode.label}
        </Button>

        <Menu
          anchorEl={modeAnchor}
          open={Boolean(modeAnchor)}
          onClose={() => setModeAnchor(null)}
          PaperProps={{
            elevation: 0,
            sx: {
              mt: 0.5,
              minWidth: 130,
              borderRadius: 1,
              border: `1px solid ${alpha(INK, 0.1)}`,
              boxShadow: `0 16px 34px ${alpha(INK, 0.14)}`,
            },
          }}
        >
          {SEARCH_MODES.map((mode) => (
            <MenuItem
              key={mode.value}
              selected={mode.value === searchMode}
              onClick={() => {
                setSearchMode(mode.value)
                setModeAnchor(null)
              }}
              sx={{ fontSize: 14, fontWeight: 600 }}
            >
              {mode.label}
            </MenuItem>
          ))}
        </Menu>

        <TextField
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          onFocus={() => {
            setOpen(true)
          }}
          placeholder={activeMode.placeholder}
          size="small"
          fullWidth
          sx={{
            '& .MuiOutlinedInput-root': {
              height: 42,
              bgcolor: '#FFFFFF',
              borderRadius: 0,
              '& fieldset': { borderColor: 'transparent' },
              '&:hover fieldset': { borderColor: 'transparent' },
              '&.Mui-focused fieldset': { borderColor: 'transparent' },
            },
            '& .MuiOutlinedInput-input': {
              py: 0,
              px: 1.5,
              fontSize: '14px',
              fontWeight: 600,
              color: INK,
              '&::placeholder': {
                color: alpha(INK, 0.42),
                opacity: 1,
              },
            },
          }}
        />

        <Button
          type="button"
          onClick={runSearch}
          disabled={isLoading || isFetching}
          sx={{
            height: '100%',
            minWidth: 0,
            borderRadius: 0,
            color: '#4D63FF',
            fontSize: 13,
            fontWeight: 800,
            textTransform: 'none',
            '&:hover': { bgcolor: alpha('#4D63FF', 0.08) },
          }}
        >
          {isLoading || isFetching ? <CircularProgress size={16} /> : 'Search'}
        </Button>
      </Box>

      <Popper
        open={popperReady && shouldSearch}
        anchorEl={anchorRef.current}
        placement="bottom-start"
        transition
        sx={{
          zIndex: 2200,
          width: anchorRef.current?.offsetWidth,
        }}
      >
        {({ TransitionProps }) => (
          <Grow {...TransitionProps} style={{ transformOrigin: 'top left' }}>
            <Box>
              <ClickAwayListener onClickAway={handleClickAway}>
                <Paper
                  elevation={0}
                  sx={{
                    mt: 1,
                    borderRadius: 3,
                    bgcolor: SURFACE,
                    border: `1px solid ${alpha(INK, 0.08)}`,
                    boxShadow: `0 18px 34px ${alpha(INK, 0.1)}`,
                    overflow: 'hidden',
                    maxHeight: '450px',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <Box sx={{ p: 1.5, bgcolor: alpha(INK, 0.03) }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        color: alpha(INK, 0.5),
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                      }}
                    >
                      {isFetching ? 'Refreshing Network...' : 'Global Results'}
                    </Typography>
                  </Box>

                  <List sx={{ p: 0.5, overflowY: 'auto' }}>
                    {searchResults?.results?.length === 0 ? (
                      <ListItem sx={{ py: 4, justifyContent: 'center' }}>
                        <Typography variant="body2" color="text.secondary" fontWeight={500}>
                          No matches found for "{searchQuery}"
                        </Typography>
                      </ListItem>
                    ) : (
                      searchResults?.results?.map((result, idx) => (
                        <ListItemButton
                          key={`${result.type}-${idx}`}
                          onClick={() => handleResultClick(result)}
                          sx={{
                            borderRadius: 2.5,
                            py: 1.25,
                            px: 1.5,
                            mb: 0.5,
                            '&:hover': {
                              bgcolor: alpha(CLAY, 0.08),
                              '& .MuiListItemText-primary': { color: INK },
                            },
                          }}
                        >
                          <ListItemText
                            primary={
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Box
                                  sx={{
                                    px: 0.8,
                                    py: 0.2,
                                    borderRadius: 0.5,
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    bgcolor: alpha(getTypeColor(result.type), 0.1),
                                    color: getTypeColor(result.type),
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  {getTypeLabel(result.type)}
                                </Box>
                                <Typography variant="body2" fontWeight={500}>
                                  {result.title}
                                </Typography>
                              </Stack>
                            }
                            secondary={result.subtitle}
                            primaryTypographyProps={{
                              component: 'div',
                            }}
                            secondaryTypographyProps={{
                              fontSize: '12px',
                              fontWeight: 500,
                              noWrap: true,
                              sx: { mt: 0.5 },
                            }}
                          />
                        </ListItemButton>
                      ))
                    )}
                  </List>
                </Paper>
              </ClickAwayListener>
            </Box>
          </Grow>
        )}
      </Popper>
    </Box>
  )
}

export default GlobalSearch
