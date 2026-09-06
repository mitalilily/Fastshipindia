import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Container,
  Divider,
  FormControlLabel,
  FormGroup,
  Grid,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { MdKeyboardArrowDown } from 'react-icons/md'
import { downloadCustomReportCsv } from '../../api/reports.api'
import PageHeading from '../../components/UI/heading/PageHeading'
import { toast } from '../../components/UI/Toast'

type ReportField = {
  key: string
  label: string
}

type FieldGroup = {
  key: 'orders' | 'shipment' | 'ndr'
  label: string
  fields: ReportField[]
}

const GROUPS: FieldGroup[] = [
  {
    key: 'orders',
    label: 'Orders',
    fields: [
      { key: 'order_number', label: 'order_number' },
      { key: 'order_date', label: 'order_date' },
      { key: 'order_amount', label: 'order_amount' },
      { key: 'order_type', label: 'order_type' },
      { key: 'buyer_name', label: 'buyer_name' },
      { key: 'buyer_phone', label: 'buyer_phone' },
      { key: 'buyer_email', label: 'buyer_email' },
      { key: 'address', label: 'address' },
      { key: 'city', label: 'city' },
      { key: 'state', label: 'state' },
      { key: 'pincode', label: 'pincode' },
      { key: 'weight', label: 'weight' },
      { key: 'length', label: 'length' },
      { key: 'height', label: 'height' },
      { key: 'breadth', label: 'breadth' },
      { key: 'order_status', label: 'order_status' },
      { key: 'freight_charges', label: 'freight_charges' },
      { key: 'discount', label: 'discount' },
      { key: 'products', label: 'products' },
    ],
  },
  {
    key: 'shipment',
    label: 'Shipment',
    fields: [
      { key: 'shipment_date', label: 'shipment_date' },
      { key: 'awb_number', label: 'awb_number' },
      { key: 'shipment_status', label: 'shipment_status' },
      { key: 'remittance_id', label: 'remittance_id' },
      { key: 'pickup_time', label: 'pickup_time' },
      { key: 'delivered_time', label: 'delivered_time' },
      { key: 'charged_weight', label: 'charged_weight' },
      { key: 'zone', label: 'zone' },
      { key: 'last_status_updated', label: 'last_status_updated' },
    ],
  },
  {
    key: 'ndr',
    label: 'Ndr',
    fields: [{ key: 'ndr_attempts_info', label: 'ndr_attempts_info' }],
  },
]

const ALL_FIELD_KEYS = GROUPS.flatMap((group) => group.fields.map((f) => f.key))

const formatUiDate = (value: string) => {
  if (!value) return ''
  const [y, m, d] = value.split('-')
  if (!y || !m || !d) return value
  return `${d}/${m}/${y}`
}

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getToday = () => toDateInputValue(new Date())
const getPastDate = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return toDateInputValue(d)
}
const getMonthStart = () => {
  const d = new Date()
  d.setDate(1)
  return toDateInputValue(d)
}
const getLastMonthRange = () => {
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const lastDay = new Date(today.getFullYear(), today.getMonth(), 0)
  return { fromDate: toDateInputValue(firstDay), toDate: toDateInputValue(lastDay) }
}

const DATE_PRESETS = [
  { label: 'Today', getRange: () => ({ fromDate: getToday(), toDate: getToday() }) },
  { label: 'Last 7 Days', getRange: () => ({ fromDate: getPastDate(7), toDate: getToday() }) },
  { label: 'This Month', getRange: () => ({ fromDate: getMonthStart(), toDate: getToday() }) },
  { label: 'Last Month', getRange: getLastMonthRange },
  { label: 'Last 15 Days', getRange: () => ({ fromDate: getPastDate(15), toDate: getToday() }) },
  { label: 'Last 30 Days', getRange: () => ({ fromDate: getPastDate(30), toDate: getToday() }) },
]

export default function Reports() {
  const [fromDate, setFromDate] = useState<string>(getMonthStart())
  const [toDate, setToDate] = useState<string>(getToday())
  const [paymentType, setPaymentType] = useState<'all' | 'prepaid' | 'cod'>('all')
  const [selectedFields, setSelectedFields] = useState<string[]>(ALL_FIELD_KEYS)
  const [downloading, setDownloading] = useState(false)
  const [datePresetAnchorEl, setDatePresetAnchorEl] = useState<null | HTMLElement>(null)

  const allSelected = selectedFields.length === ALL_FIELD_KEYS.length
  const isDatePresetOpen = Boolean(datePresetAnchorEl)

  const selectedByGroup = useMemo(() => {
    const selectedSet = new Set(selectedFields)
    return GROUPS.reduce<Record<string, number>>((acc, group) => {
      acc[group.key] = group.fields.filter((f) => selectedSet.has(f.key)).length
      return acc
    }, {})
  }, [selectedFields])

  const toggleField = (key: string) => {
    setSelectedFields((prev) => {
      if (prev.includes(key)) return prev.filter((f) => f !== key)
      return [...prev, key]
    })
  }

  const toggleSelectAll = () => {
    setSelectedFields((prev) => (prev.length === ALL_FIELD_KEYS.length ? [] : ALL_FIELD_KEYS))
  }

  const applyDatePreset = (preset: (typeof DATE_PRESETS)[number]) => {
    const range = preset.getRange()
    setFromDate(range.fromDate)
    setToDate(range.toDate)
    setDatePresetAnchorEl(null)
  }

  const onDownload = async () => {
    if (!fromDate || !toDate) {
      toast.open({ message: 'Please select date range', severity: 'warning' })
      return
    }
    if (selectedFields.length === 0) {
      toast.open({ message: 'Please select at least one field', severity: 'warning' })
      return
    }
    setDownloading(true)
    try {
      const blob = await downloadCustomReportCsv({ fromDate, toDate, selectedFields, paymentType })
      const fileName = `custom_report_${fromDate}_to_${toDate}.csv`
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      window.URL.revokeObjectURL(url)
      toast.open({ message: 'Report downloaded', severity: 'success' })
    } catch (error: unknown) {
      const errObj = error as { response?: { data?: unknown } }
      const reader = new FileReader()
      reader.onload = () => {
        const text = String(reader.result || '')
        try {
          const parsed = JSON.parse(text)
          toast.open({
            message: parsed?.message || 'Failed to download report',
            severity: 'error',
          })
        } catch {
          toast.open({ message: 'Failed to download report', severity: 'error' })
        }
      }
      if (errObj.response?.data instanceof Blob) {
        reader.readAsText(errObj.response.data)
      } else {
        toast.open({ message: 'Failed to download report', severity: 'error' })
      }
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <PageHeading
          eyebrow="Reports Panel"
          title="Custom Reports"
          subtitle="Build exports, choose operational fields, and generate report files from a consistent utility workspace."
        />
      </Box>
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h5" fontWeight={700}>
              Reports - Custom Report
            </Typography>
            <Typography variant="h6" fontWeight={600}>
              Custom Reports
            </Typography>

            <Stack
              direction={{ xs: 'column', md: 'row' }}
              alignItems={{ xs: 'stretch', md: 'center' }}
              gap={2}
            >
              <Typography fontWeight={600}>Date Range:</Typography>
              <Box>
                <Button
                  size="small"
                  variant="outlined"
                  endIcon={<MdKeyboardArrowDown />}
                  onClick={(event) => setDatePresetAnchorEl(event.currentTarget)}
                  aria-controls={isDatePresetOpen ? 'report-date-range-menu' : undefined}
                  aria-haspopup="menu"
                  aria-expanded={isDatePresetOpen ? 'true' : undefined}
                  sx={{ textTransform: 'none', borderRadius: 99, minWidth: 150 }}
                >
                  Quick Range
                </Button>
                <Menu
                  id="report-date-range-menu"
                  anchorEl={datePresetAnchorEl}
                  open={isDatePresetOpen}
                  onClose={() => setDatePresetAnchorEl(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                  slotProps={{
                    paper: {
                      sx: {
                        mt: 0.75,
                        minWidth: 180,
                        borderRadius: 2,
                      },
                    },
                  }}
                >
                  {DATE_PRESETS.map((preset) => {
                    const range = preset.getRange()
                    const selected = fromDate === range.fromDate && toDate === range.toDate
                    return (
                      <MenuItem
                        key={preset.label}
                        selected={selected}
                        onClick={() => applyDatePreset(preset)}
                      >
                        {preset.label}
                      </MenuItem>
                    )
                  })}
                </Menu>
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
                <TextField
                  type="date"
                  size="small"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
                <TextField
                  type="date"
                  size="small"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </Stack>
              <Typography color="text.secondary">
                {formatUiDate(fromDate)} - {formatUiDate(toDate)}
              </Typography>
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              gap={2}
            >
              <Typography fontWeight={600}>Payment Type:</Typography>
              <TextField
                select
                size="small"
                value={paymentType}
                onChange={(event) => setPaymentType(event.target.value as 'all' | 'prepaid' | 'cod')}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="all">All Payments</MenuItem>
                <MenuItem value="prepaid">Prepaid</MenuItem>
                <MenuItem value="cod">COD</MenuItem>
              </TextField>
            </Stack>

            <Divider />

            <FormControlLabel
              control={<Checkbox checked={allSelected} onChange={toggleSelectAll} />}
              label="Select All"
            />

            <Grid container spacing={2}>
              {GROUPS.map((group) => (
                <Grid key={group.key} size={{ xs: 12, md: 4 }}>
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Typography variant="h6" fontWeight={700} gutterBottom>
                        {group.label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.2 }}>
                        {selectedByGroup[group.key] || 0} selected
                      </Typography>
                      <FormGroup>
                        {group.fields.map((field) => (
                          <FormControlLabel
                            key={field.key}
                            control={
                              <Checkbox
                                checked={selectedFields.includes(field.key)}
                                onChange={() => toggleField(field.key)}
                              />
                            }
                            label={field.label}
                          />
                        ))}
                      </FormGroup>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Box>
              <Button
                variant="contained"
                onClick={onDownload}
                disabled={downloading}
                startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : undefined}
              >
                {downloading ? 'Generating CSV...' : 'Download CSV'}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  )
}
