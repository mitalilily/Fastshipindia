import { Box, Button, Dialog, IconButton, Stack, Typography, type SxProps, type Theme } from '@mui/material'
import { useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  TbBox,
  TbCalendar,
  TbChevronDown,
  TbDownload,
  TbEdit,
  TbEye,
  TbFilter,
  TbPrinter,
  TbRefresh,
  TbSettings,
  TbTrash,
  TbTruckDelivery,
  TbUpload,
} from 'react-icons/tb'

const teal = '#0789ad'
const ink = '#071d35'
const border = '#dbe4ee'
const head = '#e9eff5'
const page = '#f4f7fb'
const soft = '#dce7f3'

type Cell = ReactNode

const cardSx: SxProps<Theme> = {
  bgcolor: '#fff',
  border: `1px solid ${border}`,
  borderRadius: '10px',
  overflow: 'hidden',
}

function PanelPage({ title, actions, children }: { title?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <Box sx={{ minHeight: 'calc(100vh - 68px)', bgcolor: page, p: 2 }}>
      {(title || actions) && (
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ ...cardSx, minHeight: 72, px: 2.5, mb: 2 }}>
          <Typography sx={{ fontSize: 20, fontWeight: 800, color: ink }}>{title}</Typography>
          <Stack direction="row" spacing={1} alignItems="center">{actions}</Stack>
        </Stack>
      )}
      {children}
      <Footer />
    </Box>
  )
}

function Footer() {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ mt: 2, color: ink, fontSize: 14 }}>
      <Box>Copyright © 2026 Shipmozo, All rights reserved.</Box>
      <Stack direction="row" spacing={2.4} sx={{ color: '#105efb', fontWeight: 700 }}>
        <Box>Privacy Policy</Box>
        <Box>Refund & Cancellation</Box>
        <Box>Terms and Conditions</Box>
      </Stack>
    </Stack>
  )
}

function PrimaryButton({ children, icon, href, onClick }: { children: ReactNode; icon?: ReactNode; href?: string; onClick?: () => void }) {
  return (
    <Button href={href} onClick={onClick} startIcon={icon} sx={{ bgcolor: teal, color: '#fff', textTransform: 'none', fontWeight: 800, borderRadius: '10px', px: 2.2, height: 40, '&:hover': { bgcolor: '#057899' } }}>
      {children}
    </Button>
  )
}

function GhostButton({ children, icon, href }: { children: ReactNode; icon?: ReactNode; href?: string }) {
  return (
    <Button href={href} startIcon={icon} sx={{ bgcolor: soft, color: ink, textTransform: 'none', fontWeight: 800, borderRadius: '10px', px: 2, height: 44 }}>
      {children}
    </Button>
  )
}

function IconTool({ children }: { children: ReactNode }) {
  return <IconButton sx={{ width: 62, height: 44, bgcolor: soft, borderRadius: '10px', color: ink, '&:hover': { bgcolor: '#cfdae8' } }}>{children}</IconButton>
}

function DateBox() {
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState('2026-07-10')
  const [to, setTo] = useState('2026-08-10')
  const format = (value: string) => value.split('-').reverse().join('-')

  return (
    <Box sx={{ position: 'relative', width: 288 }}>
      <Box onClick={() => setOpen((prev) => !prev)} sx={{ cursor: 'pointer' }}>
        <InputBox icon={<TbCalendar size={22} />} text={`${format(from)} to ${format(to)}`} w={288} />
      </Box>
      {open && (
        <Stack spacing={1.2} sx={{ position: 'absolute', left: 0, top: 58, zIndex: 20, width: 288, bgcolor: '#fff', border: `1px solid ${border}`, borderRadius: '10px', p: 1.4, boxShadow: '0 16px 34px rgba(7, 29, 53, 0.16)' }}>
          <Box component="input" type="date" value={from} onChange={(event) => setFrom(event.currentTarget.value)} sx={{ height: 38, border: `1px solid ${border}`, borderRadius: '8px', px: 1.2, color: ink }} />
          <Box component="input" type="date" value={to} onChange={(event) => setTo(event.currentTarget.value)} sx={{ height: 38, border: `1px solid ${border}`, borderRadius: '8px', px: 1.2, color: ink }} />
          <PrimaryButton onClick={() => setOpen(false)}>Apply</PrimaryButton>
        </Stack>
      )}
    </Box>
  )
}

function InputBox({ text, icon, w = 250 }: { text: string; icon?: ReactNode; w?: number }) {
  const [value, setValue] = useState('')
  const hasMenu = text === 'Active' || text === 'Channels' || text === 'Forward' || text === 'All' || text.startsWith('Status')

  return (
    <Stack direction="row" alignItems="center" sx={{ width: w, height: 52, border: `1px solid ${border}`, borderRadius: '10px', overflow: 'hidden', bgcolor: '#fff', '&:focus-within': { borderColor: teal, boxShadow: '0 0 0 3px rgba(7,137,173,.12)' } }}>
      {icon && <Box sx={{ width: 54, height: '100%', display: 'grid', placeItems: 'center', bgcolor: '#eef3f8', color: ink }}>{icon}</Box>}
      <Box
        component="input"
        value={value}
        onChange={(event) => setValue(event.currentTarget.value)}
        placeholder={text}
        readOnly={hasMenu}
        sx={{
          flex: 1,
          minWidth: 0,
          height: '100%',
          border: 0,
          outline: 0,
          px: 1.6,
          color: ink,
          bgcolor: '#fff',
          fontSize: 14,
          cursor: hasMenu ? 'pointer' : 'text',
          '&::placeholder': { color: text.startsWith('Search') || text.startsWith('Enter') ? '#6b7788' : ink, opacity: 1 },
        }}
      />
      {hasMenu && <TbChevronDown style={{ marginLeft: 'auto', marginRight: 14 }} />}
    </Stack>
  )
}

function FilterBar({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1.6, bgcolor: '#fff' }}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">{children}</Stack>
      <Stack direction="row" spacing={1} alignItems="center">{right}</Stack>
    </Stack>
  )
}

function Tabs({ items, active }: { items: string[]; active: string }) {
  return (
    <Stack direction="row" sx={{ bgcolor: '#fff', border: `1px solid ${border}`, borderRadius: '10px', overflow: 'hidden', width: 'fit-content' }}>
      {items.map((item) => (
        <Button key={item} href={['Products', 'Packaging'].includes(item) ? `#/${itemToPath(item)}` : undefined} sx={{ height: 38, px: 2.4, bgcolor: item === active ? teal : '#fff', color: item === active ? '#fff' : ink, textTransform: 'none', fontWeight: 800, borderRadius: item === active ? '9px' : 0 }}>
          {item}
        </Button>
      ))}
    </Stack>
  )
}

function itemToPath(item: string) {
  if (item === 'Products') return 'other/products'
  if (item === 'Packaging') return 'other/packaging'
  return item.toLowerCase().replace(/\s+/g, '-')
}

function SectionTabs({ items, active, base }: { items: string[]; active: string; base: string }) {
  return (
    <Stack direction="row" sx={{ ...cardSx, bgcolor: head, mb: 2, minHeight: 62, overflowX: 'auto' }}>
      {items.map((item) => (
        <Button key={item} href={sectionHref(base, item)} sx={{ minWidth: 160, color: item === active ? teal : ink, borderBottom: item === active ? `2px solid ${teal}` : '2px solid transparent', borderRadius: 0, textTransform: 'none', fontWeight: item === active ? 900 : 700 }}>
          {item}
        </Button>
      ))}
    </Stack>
  )
}

function slug(v: string) {
  return v.toLowerCase().replace(/&/g, '').replace(/\//g, '').replace(/\./g, '').replace(/\s+/g, '-')
}

function sectionHref(base: string, item: string) {
  if (!base) return undefined
  if (base === 'tools' && item === 'Manage Courier') return '#/tools/courier-manage'
  if (base === 'settings' || base.includes('branded-tracking-page')) return undefined
  return `#/${base}/${slug(item)}`
}

function TableView({ columns, rows, emptyText, minHeight = 420 }: { columns: string[]; rows?: Cell[][]; emptyText?: string; minHeight?: number }) {
  return (
    <Box sx={cardSx}>
      <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <Box component="thead" sx={{ bgcolor: head }}>
          <Box component="tr">
            {columns.map((col) => (
              <Box component="th" key={col} sx={{ p: 1.9, color: ink, fontSize: 16, fontWeight: 900, textAlign: 'left', borderBottom: `1px solid ${border}` }}>{col}</Box>
            ))}
          </Box>
        </Box>
        {rows?.length ? (
          <Box component="tbody">
            {rows.map((row, idx) => (
              <Box component="tr" key={idx} sx={{ borderBottom: `1px solid ${border}` }}>
                {row.map((cell, cIdx) => <Box component="td" key={cIdx} sx={{ p: 1.9, color: ink, fontSize: 14.2, verticalAlign: 'top' }}>{cell}</Box>)}
              </Box>
            ))}
          </Box>
        ) : null}
      </Box>
      {!rows?.length && emptyText && <EmptyState text={emptyText} minHeight={minHeight} />}
    </Box>
  )
}

function SortableTableView({ columns, rows, emptyText, minHeight = 420 }: { columns: string[]; rows?: Cell[][]; emptyText?: string; minHeight?: number }) {
  const [sortColumn, setSortColumn] = useState(columns[0])
  const [ascending, setAscending] = useState(true)
  const sortedRows = [...(rows ?? [])].sort((a, b) => {
    const index = Math.max(columns.indexOf(sortColumn), 0)
    const left = String(a[index] ?? '')
    const right = String(b[index] ?? '')
    return ascending ? left.localeCompare(right) : right.localeCompare(left)
  })

  return (
    <Box sx={cardSx}>
      <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <Box component="thead" sx={{ bgcolor: head }}>
          <Box component="tr">
            {columns.map((col) => (
              <Box component="th" key={col} sx={{ p: 1.9, color: ink, fontSize: 16, fontWeight: 900, textAlign: 'left', borderBottom: `1px solid ${border}` }}>
                <Button
                  onClick={() => {
                    setAscending((prev) => (sortColumn === col ? !prev : true))
                    setSortColumn(col)
                  }}
                  sx={{ p: 0, minWidth: 0, color: 'inherit', textTransform: 'none', fontSize: 16, fontWeight: 900 }}
                >
                  {col}{sortColumn === col ? (ascending ? ' ↑' : ' ↓') : ''}
                </Button>
              </Box>
            ))}
          </Box>
        </Box>
        {sortedRows.length ? (
          <Box component="tbody">
            {sortedRows.map((row, idx) => (
              <Box component="tr" key={idx} sx={{ borderBottom: `1px solid ${border}` }}>
                {row.map((cell, cIdx) => <Box component="td" key={cIdx} sx={{ p: 1.9, color: ink, fontSize: 14.2, verticalAlign: 'top' }}>{cell}</Box>)}
              </Box>
            ))}
          </Box>
        ) : null}
      </Box>
      {!sortedRows.length && emptyText && <EmptyState text={emptyText} minHeight={minHeight} />}
    </Box>
  )
}

function EmptyState({ text, minHeight = 420 }: { text: string; minHeight?: number }) {
  return (
    <Stack alignItems="center" justifyContent="center" sx={{ minHeight, color: ink }}>
      <Box sx={{ width: 98, height: 112, position: 'relative', mb: 1.4 }}>
        <Box sx={{ width: 70, height: 86, border: '5px solid #082b73', borderRadius: '10px', mx: 'auto', mt: 4, bgcolor: '#fff', '&:before': { content: '""', display: 'block', width: 32, height: 5, bgcolor: '#ff6a58', borderRadius: 4, mt: 2.4, ml: 1.8, boxShadow: '0 13px #ff6a58, 0 26px #ff6a58, 0 39px #ffd15a' } }} />
        <Box sx={{ position: 'absolute', right: 2, bottom: 4, width: 48, height: 48, borderRadius: '50%', bgcolor: '#63c7d3', border: '5px solid #082b73', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 28, fontWeight: 900 }}>x</Box>
      </Box>
      <Typography sx={{ fontSize: 18, color: ink }}>{text}</Typography>
    </Stack>
  )
}

function Pill({ children, color = '#13c7a6' }: { children: ReactNode; color?: string }) {
  return <Box sx={{ display: 'inline-flex', px: 1.4, py: 0.55, borderRadius: 99, bgcolor: color, color: '#fff', fontSize: 12, fontWeight: 900 }}>{children}</Box>
}

function SwitchMock({ on = false }: { on?: boolean }) {
  return <Box sx={{ width: 52, height: 28, borderRadius: 20, bgcolor: on ? '#85d9d5' : '#9fa3a7', position: 'relative', '&:after': { content: '""', position: 'absolute', width: 20, height: 20, borderRadius: '50%', top: 4, left: on ? 27 : 5, bgcolor: on ? '#18bfa9' : '#fff' } }} />
}

const toolsTabs = ['Rate Calculator', 'Shipment Price List', 'Activity Logs', 'Manage Courier', 'Reports Download']

function productTop(active: 'Products' | 'Packaging') {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ ...cardSx, px: 2, py: 1.5, mb: 2 }}>
      <Tabs items={['Products', 'Packaging']} active={active} />
      <Stack direction="row" spacing={1}>
        {active === 'Products' && <><GhostButton icon={<TbRefresh />}>Sync Products</GhostButton><GhostButton>Bulk Upload / Update</GhostButton></>}
        <PrimaryButton icon={<Box sx={{ fontSize: 24, lineHeight: 0 }}>+</Box>}>{active === 'Products' ? 'Add New' : 'Create New Package'}</PrimaryButton>
        <IconTool><TbRefresh /></IconTool>
      </Stack>
    </Stack>
  )
}

export function ShipmozoProductsPanel() {
  return (
    <PanelPage>
      {productTop('Products')}
      <Box sx={cardSx}>
        <FilterBar right={<><IconTool><TbDownload /></IconTool><IconTool><TbRefresh /></IconTool></>}>
          <InputBox text="Name" w={92} /><InputBox text="Search by name" w={190} /><InputBox text="Channels" w={288} /><InputBox text="Active" w={288} />
        </FilterBar>
        <TableView columns={['', 'Name', 'SKU', 'HSN', 'GST(%)', 'Quantity', 'Unit Price (₹)', 'Dimension & Weight', 'Package', 'Channel', 'Status', 'Action']} emptyText="No products found!" />
      </Box>
    </PanelPage>
  )
}

export function ShipmozoPackagingPanel() {
  return (
    <PanelPage>
      {productTop('Packaging')}
      <TableView
        columns={['Created At', 'Package Name', 'Package Dimensions(CM)', 'Weight (KG)', 'Package Type', 'Status', 'Action']}
        rows={[
          ['12 Jan 2026, 07:47 PM', 'INDUSTRIAL GOOD', 'L: 18 x W: 17 x H: 13', '3', 'SPS', <Pill>ACTIVE</Pill>, <Box sx={{ color: '#ff765d', fontSize: 24 }}><TbTrash /></Box>],
          ['28 Aug 2025, 05:44 PM', 'INDUSTRIAL GOOD', 'L: 64 x W: 37 x H: 16', '12.1', 'SPS', <Pill>ACTIVE</Pill>, <Box sx={{ color: '#ff765d', fontSize: 24 }}><TbTrash /></Box>],
        ]}
      />
    </PanelPage>
  )
}

export function ShipmozoOrderTagsPanel() {
  return (
    <PanelPage title="All Order Tags" actions={<PrimaryButton icon={<Box sx={{ fontSize: 24 }}>+</Box>}>Add New Tag</PrimaryButton>}>
      <Box sx={cardSx}>
        <FilterBar right={<IconTool><TbRefresh /></IconTool>}><InputBox text="Search by name" w={288} /></FilterBar>
        <TableView columns={['S.No.', 'Tag Name', 'Created At', 'Action']} emptyText="No tags found!" minHeight={430} />
      </Box>
    </PanelPage>
  )
}

const customerRows = [
  ['ACME MAGADH SOLAR POWER PVT LTD', '+91 7903454935', '--', 'MOJA KAKWARA , TOLA - SONARI , POST-BHAGWANGANG , BANKA , BIHAR, Banka, Bihar, India, 813118'],
  ['CLEMENT ENGINEERS PVT LTD', '+91 6291089174', '--', 'BC89 , SECTOR 1 , SALT LAKE CITY ,. KOLKATA , PIN CODE - 700064, Kolkata, West Bengal, India, 700064'],
  ['BVG INDIA LIMITED OD', '+91 6396573507', '--', 'KAMIRA BADALIAPADA , TEHSIL, KANTAMALA DIST. BOUDH ODISHA, PIN CODE 762014, Boudh, Odisha, India, 762014'],
  ['MOHIT MADAAN', '+91 9653969634', '--', 'JAIN WATCH MOBILE COMPANY BZAR NO. 4 NEAR PANDIT BAKERY FEROZEPUR, CANTT PUNJAB 152001'],
  ['SRR ENERGY AND AUTOMATION PVT LTD', '+91 9654480014', '--', 'GRONND FLOOR , PLOT NO. 21 , UDYOG KENDRA EXT N-1 , ECOTECH-III , GRETER NOIDA , GAUTAMBUDHHA NAGAR'],
]

export function ShipmozoCustomersPanel() {
  return (
    <PanelPage title="Customers" actions={<PrimaryButton icon={<Box sx={{ fontSize: 24 }}>+</Box>}>Add New</PrimaryButton>}>
      <Box sx={cardSx}>
        <FilterBar right={<IconTool><TbRefresh /></IconTool>}><InputBox text="Name" w={92} /><InputBox text="Search by name" w={190} /></FilterBar>
        <TableView columns={['Name', 'Phone', 'Email', 'Address', 'Channel', 'Action']} rows={customerRows.map((r) => [...r, 'Custom', <CircleAction />])} />
      </Box>
    </PanelPage>
  )
}

function CircleAction() {
  return <Box sx={{ width: 38, height: 38, borderRadius: '50%', bgcolor: teal, color: '#fff', display: 'grid', placeItems: 'center' }}><TbChevronDown /></Box>
}

export function ShipmozoWarehousePanel() {
  const rows = [
    ['1', '128461', <Blue>EXCEL WORLD WIDE PVT LTD</Blue>, <b>PARMOD KUMAR</b>, '160002', 'PLOT NO. 1064 , IND AREA PHASE -2 , CHANDIGARH -160002, Chandigarh, India, 160002'],
    ['2', '128068', <Blue>HEXALOG LOGISTICS INDIA PVT LTD</Blue>, <b>SHRAVAN</b>, '110077', 'PLOT NO. 36/3 VILLAGE AND POST BAMNOLI , DWARKA , SECTOR-28, NEW DELHI'],
    ['3', '127156', <Blue>HETALLS</Blue>, <b>SHRAVAN</b>, '302022', 'F-109 , RIICO SITAPURA , SANGANER , JAIPUR, RAJASTHAN- 302022'],
    ['4', '127029', <Blue>NIRAKSH VENTURES DS</Blue>, <b>SHRAVAN</b>, '122001', 'PRINCE KATARIA COMPLEX, GALI NO. 81A , LAXMAN VIHAR PHASE- 2 , GURGAON'],
  ]
  return (
    <PanelPage title="Warehouse / Pick-up Addresses" actions={<><GhostButton>Bulk Upload</GhostButton><PrimaryButton icon={<Box sx={{ fontSize: 24 }}>+</Box>}>Add New</PrimaryButton></>}>
      <Box sx={cardSx}>
        <FilterBar right={<><IconTool><TbDownload /></IconTool><IconTool><TbRefresh /></IconTool><IconTool><TbSettings /></IconTool></>}><InputBox text="Search by Address Title" w={250} /><InputBox text="Search by ID" w={250} /><GhostButton icon={<TbFilter />}>More Filters</GhostButton></FilterBar>
        <TableView columns={['S.No.', 'ID', 'Title', 'Contact Details', 'Pincode', 'Address', 'Created By', 'Created At', 'Status', 'Action']} rows={rows.map((r, i) => [...r, 'SHRAVAN KUMAR MAHTO', `${25 - i} Jun 2026, 03:45 PM`, <Pill>Active</Pill>, <Box sx={{ color: teal, fontSize: 24 }}><TbEdit /></Box>])} />
      </Box>
    </PanelPage>
  )
}

function Blue({ children }: { children: ReactNode }) {
  return <Box sx={{ color: '#105efb', fontWeight: 900 }}>{children}</Box>
}

function ToggleTabs({ items, active, onChange }: { items: string[]; active: string; onChange: (item: string) => void }) {
  return (
    <Stack direction="row" sx={{ bgcolor: '#fff', border: `1px solid ${border}`, borderRadius: '10px', overflow: 'hidden', width: 'fit-content' }}>
      {items.map((item) => (
        <Button key={item} onClick={() => onChange(item)} sx={{ height: 38, px: 2.4, bgcolor: item === active ? teal : '#fff', color: item === active ? '#fff' : ink, textTransform: 'none', fontWeight: 900, borderRadius: item === active ? '9px' : 0 }}>
          {item}
        </Button>
      ))}
    </Stack>
  )
}

export function ShipmozoUserAgreementsPanel() {
  const [active, setActive] = useState('User Agreements')
  const columns = active === 'User Agreements'
    ? ['Document Name', 'Version No.', 'Description', 'Doc Link', 'Acceptance Date', 'Published On', 'IP Address', 'Status']
    : ['SOP Name', 'Version No.', 'Description', 'Doc Link', 'Published On', 'Status']

  return (
    <PanelPage>
      <ToggleTabs items={['User Agreements', 'SOP']} active={active} onChange={setActive} />
      <Box sx={{ mt: 2 }}>
        <SortableTableView columns={columns} emptyText={active === 'User Agreements' ? 'No user-agreements found!' : 'No SOP found!'} minHeight={650} />
      </Box>
    </PanelPage>
  )
}

const profileTabs = ['My Profile', 'Documents', 'Change Password', 'Security', 'Other Details']

function DetailCard({ title, rows, action }: { title: string; rows: Cell[][]; action?: ReactNode }) {
  return (
    <Box sx={cardSx}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${border}` }}>
        <Typography sx={{ color: ink, fontSize: 20, fontWeight: 900 }}>{title}</Typography>
        {action}
      </Stack>
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 28px' }}>
          {rows.map(([label, value]) => (
            <Box key={String(label)}>
              <Typography component="span" sx={{ color: ink, fontSize: 14 }}>{label}: </Typography>
              <Typography component="span" sx={{ color: ink, fontSize: 14, fontWeight: 900 }}>{value}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}

function SimpleTabPanel({ title, text }: { title: string; text: string }) {
  return (
    <Box sx={{ ...cardSx, p: 4, minHeight: 360 }}>
      <Typography sx={{ color: ink, fontSize: 22, fontWeight: 900, mb: 1 }}>{title}</Typography>
      <Typography sx={{ color: '#405066', fontSize: 16 }}>{text}</Typography>
    </Box>
  )
}

export function ShipmozoProfilePanel() {
  const [active, setActive] = useState('My Profile')
  const [showKey, setShowKey] = useState(false)
  const [editNote, setEditNote] = useState('')

  return (
    <PanelPage>
      <Box sx={{ ...cardSx, mb: 2 }}>
        <Box sx={{ height: 150, borderRadius: '10px 10px 0 0', background: 'linear-gradient(130deg, #c7f1ed 0%, #e7f4bd 43%, #f4c1e9 76%, #d7d0ff 100%)', position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', inset: 0, opacity: 0.45, background: 'radial-gradient(circle at 8% 90%, #89dce0 0 12%, transparent 13%), radial-gradient(circle at 75% -10%, #f1c5ee 0 22%, transparent 23%)' }} />
        </Box>
        <Box sx={{ minHeight: 145, position: 'relative', px: 3, pb: 2 }}>
          <Stack alignItems="center" sx={{ mt: -76 }}>
            <Box sx={{ width: 132, height: 132, borderRadius: '50%', bgcolor: '#1f1f1f', border: '7px solid #fff', outline: '6px solid #e45d78', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 58 }}>SM</Box>
            <IconButton onClick={() => setEditNote('Profile photo edit mode ready')} sx={{ mt: -4, ml: 14, bgcolor: '#e9f6fb', color: teal, '&:hover': { bgcolor: '#d7eef8' } }}><TbEdit /></IconButton>
            <Typography sx={{ mt: 1.5, fontSize: 18, fontWeight: 900, color: ink }}>SHRAVAN KUMAR MAHTO</Typography>
            <Typography sx={{ fontSize: 16, color: ink }}>ADMIN</Typography>
          </Stack>
          <Box sx={{ position: 'absolute', left: 250, top: 48, textAlign: 'center', color: ink }}>
            <Typography sx={{ fontSize: 24, fontWeight: 900 }}>₹269.75</Typography>
            <Typography>Wallet</Typography>
          </Box>
          <Stack direction="row" alignItems="center" spacing={1.4} sx={{ position: 'absolute', right: 130, top: 60 }}>
            <Typography sx={{ fontWeight: 900 }}>Profile Status:</Typography>
            <Pill>Approved</Pill>
          </Stack>
        </Box>
        <Stack direction="row" sx={{ bgcolor: head, px: 2, overflowX: 'auto' }}>
          {profileTabs.map((tab) => (
            <Button key={tab} onClick={() => setActive(tab)} sx={{ minWidth: 145, height: 62, color: active === tab ? teal : ink, borderBottom: active === tab ? `2px solid ${teal}` : '2px solid transparent', borderRadius: 0, textTransform: 'none', fontWeight: active === tab ? 900 : 700 }}>
              {tab}
            </Button>
          ))}
        </Stack>
      </Box>

      {editNote && <Box sx={{ mb: 2, color: teal, fontWeight: 800 }}>{editNote}</Box>}

      {active === 'My Profile' ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 540px', gap: 2 }}>
          <Stack spacing={2}>
            <DetailCard
              title="Contact Details"
              action={<IconTool><TbEdit /></IconTool>}
              rows={[
                ['Name', 'SHRAVAN KUMAR MAHTO'],
                ['Email', <><span>ritikaenterprises98@gmail.com </span><Pill color="#ff8067">Verify</Pill></>],
                ['Phone', '8285681158'],
                ['User type', 'BUSINESS'],
                ['Joined', '31 Jan 2025, 06:38 PM'],
              ]}
            />
            <DetailCard
              title="Address Details"
              action={<IconTool><TbEdit /></IconTool>}
              rows={[
                ['Address Line 1', 'F-60, PRAHLAD VIHAR, PRAHALADPUR BANGAR, North West Delhi'],
                ['Address Line 2', '--'],
                ['City', 'Delhi'],
                ['State', 'Delhi'],
                ['Country', 'India'],
                ['Pincode', '110042'],
                ['Company name', 'RITIKA ENTERPRISES'],
                ['Store name', 'RITIKA ENTERPRISES'],
                ['GSTIN', '07DJZPM0771B1ZY'],
              ]}
            />
            <DetailCard
              title="Bank Details"
              rows={[
                ['Bank Name', 'KOTAK MAHINDRA BANK'],
                ['Account Holder Name', 'SHRAVAN KUMAR MAHTO'],
                ['Account Number', '7645106081'],
                ['IFSC', 'KKBK0004261'],
                ['Branch Name', 'SECTOR'],
              ]}
            />
          </Stack>
          <Stack spacing={2}>
            <Box sx={cardSx}>
              <Typography sx={{ p: 2, borderBottom: `1px solid ${border}`, fontSize: 20, fontWeight: 900 }}>KYC using Aadhaar</Typography>
              <Stack spacing={2} sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between"><b>KYC Status</b><Pill color="#ff8067">Verify</Pill></Stack>
                <Stack direction="row" justifyContent="space-between"><b>Verified at</b><b>--</b></Stack>
              </Stack>
            </Box>
            <Box sx={cardSx}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2, borderBottom: `1px solid ${border}` }}>
                <Typography sx={{ fontSize: 20, fontWeight: 900 }}>API Details</Typography>
                <PrimaryButton icon={<TbRefresh />}>Rotate API Key</PrimaryButton>
              </Stack>
              <Stack spacing={2.4} sx={{ p: 2 }}>
                <Typography sx={{ fontWeight: 900 }}>Check latest version of API documentation <Blue>here</Blue></Typography>
                <Typography sx={{ fontWeight: 900 }}>PDF version of API documentation <Blue>here</Blue></Typography>
                <Stack direction="row" justifyContent="space-between"><b>Private Key</b><Stack direction="row" spacing={1} alignItems="center"><b style={{ color: '#00a69a' }}>{showKey ? 'private-key-demo-2026' : 'xxxxxxxxxxxxxxx'}</b><IconButton onClick={() => setShowKey((prev) => !prev)}><TbEye /></IconButton></Stack></Stack>
                <Stack direction="row" justifyContent="space-between"><b>Public Key</b><b>QtZvKTpXYym5FiSqEjnI</b></Stack>
              </Stack>
            </Box>
          </Stack>
        </Box>
      ) : active === 'Documents' ? (
        <SimpleTabPanel title="Documents" text="No documents are uploaded for this profile yet." />
      ) : active === 'Change Password' ? (
        <SimpleTabPanel title="Change Password" text="Password update form is ready for the next authentication flow." />
      ) : active === 'Security' ? (
        <SimpleTabPanel title="Security" text="Security controls and login history will appear here." />
      ) : (
        <SimpleTabPanel title="Other Details" text="Additional business details will appear here." />
      )}
    </PanelPage>
  )
}

function VideoRow({ title, time }: { title: string; time: string }) {
  return (
    <Stack direction="row" spacing={1.2} sx={{ color: '#fff' }}>
      <Box sx={{ width: 186, height: 94, borderRadius: '4px', bgcolor: '#d9f6fb', border: '1px solid #333', position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ position: 'absolute', inset: 10, bgcolor: '#e9fbff', borderRadius: '3px' }} />
        <Box sx={{ position: 'absolute', bottom: 4, right: 4, bgcolor: '#222', px: 0.6, borderRadius: '3px', fontSize: 12 }}>{time}</Box>
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 900, color: '#fff' }}>{title}</Typography>
        <Typography sx={{ fontSize: 12, color: '#aaa', mt: 0.5 }}>Shipmozo</Typography>
        <Typography sx={{ fontSize: 12, color: '#aaa' }}>11 days ago</Typography>
      </Box>
    </Stack>
  )
}

export function ShipmozoSupportPanel() {
  const [chatOpen, setChatOpen] = useState(false)
  const videos = [
    ['How to Add & Assign Orders in Shipmozo | Quick Tutorial', '3:58'],
    ['How to Create Auto Assign Rules in Shipmozo | Quick Tutorial', '5:44'],
    ['How to Integrate APIs with Shipmozo | Step-by-Step Guide', '0:49'],
    ['How to Set Up Admin & Sub Admin in Shipmozo | Quick Tutorial', '5:39'],
    ['How to Set Up a Branded Tracking Page in Shipmozo | Quick Tutorial', '3:50'],
  ]

  return (
    <PanelPage>
      <Stack alignItems="center" sx={{ pt: 7, pb: 4 }}>
        <Stack alignItems="center" justifyContent="center" spacing={2.1} sx={{ width: 'min(1125px, 100%)', minHeight: 548, bgcolor: '#cae7ef', borderRadius: '10px', p: 4, color: ink, textAlign: 'center' }}>
          <Box sx={{ fontSize: 58, color: '#696cff' }}>▰</Box>
          <Typography sx={{ fontSize: 30, fontWeight: 900 }}>Contact Us</Typography>
          <Typography sx={{ fontSize: 22 }}>Have any query or need help? Reach out to us at phone number or email.</Typography>
          <Box sx={{ mt: 2, fontSize: 18, lineHeight: 1.7 }}>
            <b>Phone: <Blue>+917375000072</Blue></b><br />
            <b>Email: <Blue>contact@shipmozo.com</Blue></b><br />
            Business Hours<br />
            9:00 AM to 6:30 PM (Mon to Sat)
          </Box>
          <Typography sx={{ mt: 2, fontWeight: 900 }}>OR</Typography>
          <PrimaryButton onClick={() => setChatOpen(true)}>Chat with us</PrimaryButton>
        </Stack>

        <Typography sx={{ mt: 6, mb: 2, fontSize: 30, fontWeight: 900, color: ink }}>Youtube Videos</Typography>
        <Box sx={{ width: 'min(1125px, 100%)', bgcolor: '#111', borderRadius: '10px', p: 1.4, display: 'grid', gridTemplateColumns: '350px 1fr', gap: 3, minHeight: 610 }}>
          <Stack sx={{ borderRadius: '10px', p: 3, background: 'linear-gradient(180deg, #265b64 0%, #0b2024 100%)', color: '#fff' }} justifyContent="space-between">
            <Box sx={{ height: 160, bgcolor: '#d8fbff', borderRadius: '8px', mb: 2 }} />
            <Box>
              <Typography sx={{ fontSize: 28, fontWeight: 900 }}>Panel Videos 2026</Typography>
              <Typography sx={{ color: '#ddd', mt: 1 }}>by Shipmozo</Typography>
              <Typography sx={{ color: '#aaa' }}>Playlist · 19 videos · 40 views</Typography>
              <Button sx={{ mt: 2, bgcolor: '#fff', color: '#000', textTransform: 'none', fontWeight: 900, px: 3, borderRadius: '22px' }}>Play all</Button>
            </Box>
          </Stack>
          <Stack spacing={1.4} sx={{ py: 1 }}>
            {videos.map(([title, time]) => <VideoRow key={title} title={title} time={time} />)}
          </Stack>
        </Box>
      </Stack>

      <Dialog open={chatOpen} onClose={() => setChatOpen(false)} PaperProps={{ sx: { width: 420, borderRadius: '10px', p: 3 } }}>
        <Typography sx={{ fontSize: 22, fontWeight: 900, mb: 1 }}>Shipmozo Support</Typography>
        <Typography sx={{ mb: 2 }}>Chat request ready. Our team can help on phone +917375000072 or email contact@shipmozo.com.</Typography>
        <PrimaryButton onClick={() => setChatOpen(false)}>Close</PrimaryButton>
      </Dialog>
    </PanelPage>
  )
}

export function ShipmozoTicketsPanel() {
  const [tab, setTab] = useState('Open')
  const columns = ['Ticket ID', 'Category/Msg.', 'Order Details', 'Status', 'Created At']

  return (
    <PanelPage>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        {[
          ['Open', '#fff0eb', '#ff775d'],
          ['Resolved', '#e1fbf4', '#06bfa7'],
          ['Closed', '#eaf3ff', '#4e8dff'],
          ['All', '#d6eef6', teal],
        ].map(([label, bg, color]) => (
          <Button
            key={label}
            onClick={() => setTab(label)}
            sx={{
              flex: 1,
              height: 104,
              bgcolor: tab === label ? bg : '#fff',
              color,
              border: `1px solid ${tab === label ? color : border}`,
              borderRadius: '10px',
              textTransform: 'none',
              fontSize: 18,
              fontWeight: 900,
              '&:hover': { bgcolor: bg },
            }}
          >
            {label}
          </Button>
        ))}
      </Stack>
      <Box sx={cardSx}>
        <FilterBar right={<><IconTool><TbDownload /></IconTool><IconTool><TbRefresh /></IconTool><IconTool><TbSettings /></IconTool></>}>
          <DateBox />
          <InputBox text="Search by order id" w={250} />
          <InputBox text="Search by awb" w={250} />
          <GhostButton icon={<TbFilter />}>More Filters</GhostButton>
        </FilterBar>
        <TableView columns={columns} emptyText="No data available for the applied filters. Please adjust the filter and try again." minHeight={430} />
      </Box>
    </PanelPage>
  )
}

function integrationCard(name: string, logo: ReactNode, onClick?: () => void) {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={2.5} sx={{ height: 310, border: `1px solid ${border}`, borderRadius: '10px', bgcolor: '#fff' }}>
      <Box sx={{ height: 130, display: 'grid', placeItems: 'center', fontSize: name === 'Amazon Channel' ? 88 : 58, fontWeight: 900, color: ink, textAlign: 'center' }}>{logo}</Box>
      <Typography sx={{ fontSize: 18, fontWeight: 900 }}>{name}</Typography>
      <GhostButton href={onClick ? undefined : '#'} icon={<Box sx={{ fontSize: 22 }}>→</Box>}>Integration Guide</GhostButton>
    </Stack>
  )
}

export function ShipmozoIntegrationChannelsPanel() {
  return (
    <PanelPage title="Order Channels">
      <Box sx={cardSx}>
        <Typography sx={{ p: 2, borderBottom: `1px solid ${border}`, fontSize: 18, fontWeight: 900 }}>Select the channel to integrate</Typography>
        <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 2 }}>
          {integrationCard('Shopify', <span style={{ color: '#111' }}>shopify</span>)}
          {integrationCard('WooCommerce', <span>WooCommerce</span>)}
          {integrationCard('CSCart', <span>CS cart</span>)}
          {integrationCard('OpenCart', <span style={{ color: '#22b8e8' }}>opencart</span>)}
          {integrationCard('Amazon Channel', <span>amazon</span>)}
        </Box>
      </Box>
    </PanelPage>
  )
}

export function ShipmozoIntegrationOmsPanel() {
  const [open, setOpen] = useState(false)
  return (
    <PanelPage title="OMS Integration">
      <Box sx={cardSx}>
        <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 2 }}>
          {['Omsguru', 'Easyecom', 'Unicommerce', 'DotPe', 'Vinculum', 'Pragma', 'Return-Prime', 'Clickpost'].map((name) => (
            <Box key={name} onClick={() => setOpen(true)}>{integrationCard(name, <span>{name}</span>, () => setOpen(true))}</Box>
          ))}
        </Box>
      </Box>
      <Dialog open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { borderRadius: '8px', width: 520, p: 3 } }}>
        <Stack alignItems="center" spacing={2.2}>
          <IconButton onClick={() => setOpen(false)} sx={{ alignSelf: 'flex-end' }}>x</IconButton>
          <Box sx={{ width: 82, height: 82, border: '4px solid #46bde6', borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 54, color: '#46bde6' }}>i</Box>
          <Typography sx={{ fontSize: 24, fontWeight: 900 }}>API Documentation</Typography>
          <Typography align="center" sx={{ fontSize: 18 }}>Check latest version of API documentation from<br />Swagger or download PDF</Typography>
          <Typography align="center" sx={{ fontSize: 18 }}>Public Key - QtZvKTpXYym5FiSqEjnI<br />Private Key - (click to copy)</Typography>
          <Stack direction="row" spacing={1}><PrimaryButton>PDF</PrimaryButton><PrimaryButton>Swagger</PrimaryButton></Stack>
        </Stack>
      </Dialog>
    </PanelPage>
  )
}

export function ShipmozoEddWidgetPanel() {
  return (
    <PanelPage>
      <Box sx={{ position: 'fixed', top: 78, left: '50%', transform: 'translateX(-50%)', bgcolor: '#fff', boxShadow: '0 4px 18px rgba(0,0,0,.14)', borderRadius: '10px', px: 2, py: 1.3, zIndex: 5 }}>User or widget not found</Box>
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 650 }}>
        <Stack alignItems="center" spacing={2} sx={{ width: 455, p: 5, bgcolor: '#fff', border: `1px solid ${border}`, borderRadius: '10px' }}>
          <Box sx={{ width: 156, height: 156, borderRadius: '50%', bgcolor: '#9bd9e7', display: 'grid', placeItems: 'center', fontSize: 62 }}><TbTruckDelivery /></Box>
          <Typography sx={{ fontSize: 22, fontWeight: 900 }}>Set Up EDD Widget</Typography>
          <Typography align="center">Show customers the exact delivery date based on their pincode and improve conversion rates.</Typography>
          <Typography align="center" sx={{ lineHeight: 2.1 }}>Improve customer trust<br />Reduce cart abandonment<br />Boost sales with accurate delivery dates</Typography>
          <PrimaryButton>Get Started</PrimaryButton>
        </Stack>
      </Stack>
    </PanelPage>
  )
}

export function ShipmozoSettingsEarlyCodPanel() {
  const plans = [['Delivered + 4 Days', '0.5', 'Transaction Charges: 0.5% of the COD amount'], ['Delivered + 3 Days', '0.75', 'Eligibility: 500 processed orders and 50%+ delivery ratio'], ['Delivered + 2 Days', '1', 'Transaction charge: 1.00% of the COD amount'], ['Delivered + 5 days Free', '0', 'No transaction charges']]
  return (
    <PanelPage title="Early COD Subscription" actions={<IconTool><TbRefresh /></IconTool>}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
        {plans.map((p, i) => (
          <Stack key={p[0]} spacing={3} sx={{ ...cardSx, p: 3, minHeight: 460, borderColor: i === 3 ? '#18c9ab' : border, borderWidth: i === 3 ? 2 : 1 }}>
            <Typography sx={{ fontSize: 24, fontWeight: 900 }}>{p[0]}</Typography>
            <Box><Typography component="span" sx={{ fontSize: 44, color: '#2d62f0', fontWeight: 900 }}>{p[1]}</Typography><b>%</b><br />of COD amount</Box>
            <Box sx={{ height: 1, bgcolor: border }} />
            <Typography>✓ {p[2]}</Typography><Typography>✓ COD Remittance: Monday to Friday</Typography>
            <Box sx={{ flex: 1 }} />
            <PrimaryButton>{i === 3 ? 'Current Plan' : 'Activate'}</PrimaryButton>
          </Stack>
        ))}
      </Box>
    </PanelPage>
  )
}

export function ShipmozoSettingsAutoAssignPanel() {
  return (
    <PanelPage title="Auto Assign Rules" actions={<PrimaryButton icon={<Box sx={{ fontSize: 24 }}>+</Box>}>Add Rule</PrimaryButton>}>
      <Box sx={cardSx}>
        <FilterBar right={<><GhostButton>Set Priority</GhostButton><IconTool><TbRefresh /></IconTool></>}><InputBox text="Active" w={288} /></FilterBar>
        <TableView columns={['S.No.', 'Name', 'Status', 'Created At', 'Action']} emptyText="No auto assign rules found!" minHeight={430} />
      </Box>
    </PanelPage>
  )
}

const notificationRows = ['Pickup Pending', 'Pickup Completed', 'In Transit', 'At Delivery Center', 'Out For Delivery', 'Delivered', 'Undelivered', 'Cancelled']

export function ShipmozoSettingsShippingNotificationPanel() {
  return (
    <PanelPage title="Shipping Notifications" actions={<><Box sx={{ fontWeight: 900 }}>Credit Balance: 0</Box><PrimaryButton>Buy Credit</PrimaryButton></>}>
      <SectionTabs base="" active="Email (Free)" items={['Email (Free)', 'SMS', 'Whatsapp', 'Webhook (Free)']} />
      <Box sx={cardSx}>
        <FilterBar right={<IconTool><TbRefresh /></IconTool>}><Stack direction="row" alignItems="center" spacing={1}><Typography sx={{ fontWeight: 800 }}>Turn Email Notifications</Typography><SwitchMock on /></Stack></FilterBar>
        <TableView columns={['Order Status', 'Enable/Disable', 'Template', 'Updated At', 'Action']} rows={notificationRows.map((name, i) => [name, <SwitchMock on={[1, 4, 5].includes(i)} />, `Dear Customer, Your order from {company_name} with {order_id} has been shipped. You can track your order using this link: {tracking_link} Thanks`, i % 3 === 1 ? '22 Nov 2025, 01:31 AM' : '--', <GhostButton>Edit</GhostButton>])} />
      </Box>
    </PanelPage>
  )
}

export function ShipmozoSettingsCodConfirmationPanel() {
  return (
    <PanelPage title="COD Confirmation" actions={<><Box sx={{ fontWeight: 900 }}>Credit Balance: 0</Box><PrimaryButton>Buy Credit</PrimaryButton></>}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 530px', gap: 2 }}>
        <Stack sx={{ ...cardSx, p: 4, minHeight: 680 }} spacing={3}>
          <Typography sx={{ color: teal, fontSize: 30, fontWeight: 900 }}>Whatsapp COD confirmation</Typography>
          <Typography>Reduce RTOs and Enhance the rate of successful deliveries.<br />( 1 Notification = 50 paise (2 credits) )</Typography>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ border: `1px solid ${border}`, borderRadius: '10px', width: 335, p: 2 }}><Typography sx={{ fontSize: 20, fontWeight: 800 }}>Send Confirmation Message</Typography><SwitchMock /></Stack>
          <Typography sx={{ fontWeight: 900 }}>Why Use COD Order Confirmations?</Typography>
          <Typography sx={{ lineHeight: 1.7 }}>Detect Fraudulent Orders: Spot and prevent fake or accidental purchases.<br />Minimize RTO Incidents: Significantly reduce return-to-origin cases.<br />Enhance Delivery Success: Improve successful delivery rates.</Typography>
          <Typography sx={{ fontWeight: 900 }}>Working Flow</Typography>
          <Typography sx={{ lineHeight: 1.7 }}>When an order is added, an automated WhatsApp message is sent to the customer. The customer can confirm or cancel the order with a 24-hour window.</Typography>
        </Stack>
        <Stack alignItems="center" justifyContent="center" sx={cardSx}><PhoneMock /></Stack>
      </Box>
    </PanelPage>
  )
}

function PhoneMock() {
  return <Box sx={{ width: 310, height: 600, border: '10px solid #2b2430', borderRadius: '48px', bgcolor: '#f7f7f7', p: 3, display: 'flex', alignItems: 'center' }}><Stack spacing={2}><Box sx={{ bgcolor: '#fff', p: 2, boxShadow: '0 8px 22px rgba(0,0,0,.12)' }}>Hello Neil Patel<br />Your order details Order ID: SHP/05/10/2023<br />Would you like to confirm the order?</Box><Box sx={{ bgcolor: '#bdfac2', p: 2 }}>Confirm Order</Box></Stack></Box>
}

function previewLabel(invoice = false) {
  return (
    <Box sx={{ border: '1px solid #000', bgcolor: '#fff', minHeight: 520, p: 2, color: ink }}>
      <Stack direction="row" justifyContent="space-between"><Box><b>Ship To:</b><br />Kunal Verma<br />House No. 45, Palm Enclave<br /><b>Mobile Number:</b> 1234567890</Box><Box sx={{ fontSize: 38, fontWeight: 900, mt: 3 }}>shipmozo</Box></Stack>
      <Box sx={{ borderTop: '1px solid #000', my: 2 }} />
      <Stack direction="row" justifyContent="space-between"><Box><b>Courier:</b> Delhivery<br /><Box sx={{ fontSize: 64, letterSpacing: 1 }}>| | || ||| || ||||</Box><b>AWB:</b> 123456789012</Box><Box><b>Dimensions:</b> 10x10x10 CM<br /><b>Weight:</b> 0.5Kg<br /><b>Payment:</b> Prepaid<br /><b>Invoice No:</b> 202411274572</Box></Stack>
      <Box sx={{ borderTop: '1px solid #000', my: 2 }} />
      <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}><tbody><tr><th>SKU</th><th>HSN</th><th>Item</th><th>Qty</th><th>Amount</th></tr><tr><td>1111</td><td>123456</td><td>Product 1</td><td>1</td><td>100</td></tr><tr><td>2222</td><td>123456</td><td>Product 2</td><td>1</td><td>100</td></tr></tbody></Box>
      {invoice && <Box sx={{ mt: 2, fontWeight: 900 }}>Grand Total INR 500</Box>}
    </Box>
  )
}

export function ShipmozoSettingsManageLabelPanel() {
  return (
    <PanelPage title="Manage Label" actions={<><GhostButton>Dismiss</GhostButton><PrimaryButton>Save</PrimaryButton></>}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '32% 1fr', gap: 2 }}>
        <Stack sx={{ ...cardSx, p: 2 }} spacing={2}><Typography sx={{ fontWeight: 900 }}>Select Label Types *</Typography><InputBox text="Standard     2 In One     4 In One     Thermal" w={520} /><InputBox text="Select image" icon={<TbUpload />} w={520} /><Typography sx={{ fontWeight: 900 }}>Show Hide components on the label</Typography>{['Logo', 'Customer Phone', 'Dimensions', 'Weight', 'Payment Type', 'Invoice Number', 'Invoice Date', 'Company Name', 'Company GSTIN', 'Pickup address', 'SKU', 'HSN', 'Product Name', 'Shipping Charges', 'GST Amount', 'Message'].map((x) => <Stack key={x} direction="row" justifyContent="space-between"><span>{x}</span><SwitchMock on /></Stack>)}</Stack>
        <Box sx={cardSx}><Typography sx={{ p: 2, fontSize: 18, fontWeight: 900, borderBottom: `1px solid ${border}` }}>Preview</Typography><Box sx={{ p: 2 }}>{previewLabel()}</Box></Box>
      </Box>
    </PanelPage>
  )
}

export function ShipmozoSettingsManageInvoicePanel() {
  return (
    <PanelPage title="Manage Invoice" actions={<><GhostButton>Dismiss</GhostButton><PrimaryButton>Save</PrimaryButton></>}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '32% 1fr', gap: 2 }}>
        <Stack sx={{ ...cardSx, p: 2 }} spacing={2}><InputBox text="Select image" icon={<TbUpload />} w={520} /><InputBox text="Select image" icon={<TbUpload />} w={520} /><Typography sx={{ fontWeight: 900 }}>Message *</Typography><Box sx={{ height: 70, border: `1px solid ${border}`, borderRadius: '10px' }} />{['Logo', 'Authorized Signature Logo', 'Company Name', 'Company phone', 'Company GSTIN', 'Payment Type', 'Message'].map((x) => <Stack key={x} direction="row" justifyContent="space-between"><span>{x}</span><SwitchMock /></Stack>)}</Stack>
        <Box sx={cardSx}><Typography sx={{ p: 2, fontSize: 18, fontWeight: 900, borderBottom: `1px solid ${border}` }}>Preview</Typography><Box sx={{ p: 2 }}>{previewLabel(true)}</Box></Box>
      </Box>
    </PanelPage>
  )
}

export function ShipmozoSettingsBrandedTrackingPanel() {
  return (
    <PanelPage title="Branded Tracking Page" actions={<><IconTool><TbRefresh /></IconTool><GhostButton icon={<TbEye />}>Preview</GhostButton><PrimaryButton>Save</PrimaryButton></>}>
      <SectionTabs base="" active="Favicon" items={['General', 'Favicon', 'Track Order', 'Banner', 'Social Icons', 'Embed Video', 'Custom Html']} />
      <Box sx={{ display: 'grid', gridTemplateColumns: '440px 1fr', gap: 2 }}>
        <Stack sx={{ ...cardSx, p: 2 }} spacing={2}><Typography sx={{ fontSize: 18, fontWeight: 900 }}>Favicon</Typography><InputBox text="Select image" icon={<TbUpload />} w={404} /><Typography>Page Title</Typography><InputBox text="Shipmozo" w={404} /></Stack>
        <Stack sx={cardSx}><Box sx={{ p: 1.5, bgcolor: '#dfdfe2' }}>Shipmozo &nbsp;&nbsp; https://panel.shipmozo.com/track-order?uid=public_key&awb=awb_number</Box><Stack alignItems="center" sx={{ m: 2, p: 4, border: `1px solid ${border}`, borderRadius: '10px' }}><TbBox size={72} /><Typography sx={{ fontSize: 26, fontWeight: 900 }}>Track Order</Typography><Typography>Check current status of your shipment</Typography><InputBox text="Enter AWB Number" w={375} /><PrimaryButton>Track Now</PrimaryButton></Stack></Stack>
      </Box>
    </PanelPage>
  )
}

function toolsPage(active: string, content: ReactNode) {
  return <PanelPage><SectionTabs base="tools" active={active} items={toolsTabs} />{content}</PanelPage>
}

export function ShipmozoToolsRateCalculatorPanel() {
  return toolsPage('Rate Calculator', <Stack sx={{ ...cardSx, width: 750, mx: 'auto', p: 1.8 }} spacing={2}><Tabs items={['Domestic', 'International']} active="Domestic" /><Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>{['Shipment Type *', 'Package Type *', 'Origin Pincode *', 'Delivery Area Pincode *', 'Payment Mode *', 'Approximate Weight *', 'Invoice Value *'].map((x) => <InputBox key={x} text={x.includes('Pincode') || x.includes('Value') ? 'Enter ' + x.replace(' *', '').toLowerCase() : x.replace(' *', '')} w={348} />)}</Box><Typography sx={{ fontSize: 20, fontWeight: 900 }}>Dimensions</Typography><Stack direction="row" spacing={1}><InputBox text="Enter length" w={174} /><InputBox text="Enter width" w={174} /><InputBox text="Enter height" w={174} /></Stack><PrimaryButton>Calculate</PrimaryButton></Stack>)
}

export function ShipmozoToolsShipmentPriceListPanel() {
  const rows = ['Delhivery Air', 'Delhivery Surface 0.5Kg', 'Delhivery Heavy MPS.', 'Delhivery Surface 5KG'].flatMap((c) => [[c, 'Forward', 'Per .50 kg', '34', '52', '55', '58', '72', '33 | 1.7', 'NA'], ['', '', 'additional Per .50 kg', '31', '35', '49', '49', '64', '33 | 1.7', 'NA']])
  return toolsPage('Shipment Price List', <Box sx={cardSx}><FilterBar right={<><IconTool><TbPrinter /></IconTool><IconTool><TbRefresh /></IconTool></>}><Tabs items={['B2C (Single Package)', 'B2B (Multiple Package)', 'International', 'Zone Matrix']} active="B2C (Single Package)" /></FilterBar><TableView columns={['Couriers', 'Mode', 'Weight', 'ZONE A', 'ZONE B', 'ZONE C', 'ZONE D', 'ZONE E', 'COD Charges / COD%', 'Other Charges']} rows={rows.map((r) => [<b>{r[0]}</b>, r[1], ...r.slice(2)])} /></Box>)
}

export function ShipmozoToolsActivityLogsPanel() {
  const items = ['All', 'Bulk Assign', 'Bulk Auto Assign', 'Bulk Order Label', 'Bulk Order Invoice', 'Bulk Order Label Invoice', 'Bulk Orders Import', 'Bulk B2B Orders Import', 'Bulk International Orders Import', 'Bulk Warehouse Import', 'Bulk Product Import', 'Bulk Order Update']
  return toolsPage('Activity Logs', <Box sx={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: 2 }}><Stack sx={{ ...cardSx, p: 1 }}><Typography sx={{ p: 1, fontSize: 18, fontWeight: 900 }}>Activity Types</Typography>{items.map((i, idx) => <Box key={i} sx={{ p: 1.3, bgcolor: idx === 0 ? '#cae7ef' : 'transparent', borderRadius: '8px' }}>{i}</Box>)}</Stack><Box sx={cardSx}><FilterBar right={<IconTool><TbRefresh /></IconTool>}><DateBox /></FilterBar><TableView columns={['Activity', 'Updated At', 'Total Records', 'Valid Records', 'Invalid Records', 'Status', 'Error Message', 'File']} emptyText="No activity logs found!" /></Box></Box>)
}

export function ShipmozoToolsCourierManagePanel() {
  const rows = ['Delhivery Air', 'Delhivery Surface 0.5Kg', 'Delhivery Heavy MPS.', 'Delhivery Surface 5KG', 'Delhivery Heavy MPS', 'Delhivery 2Kg', 'Delhivery 1Kg'].map((c, i) => [`${i + 1}`, c, <PrimaryButton>Download</PrimaryButton>, <SwitchMock on />])
  return toolsPage('Manage Courier', <Box sx={cardSx}><FilterBar right={<><PrimaryButton>Save</PrimaryButton><IconTool><TbRefresh /></IconTool></>}><span /></FilterBar><TableView columns={['Sr.No.', 'Courier', 'Serviceable Pincodes', 'Status']} rows={rows} /></Box>)
}

export function ShipmozoToolsReportsDownloadPanel() {
  return toolsPage('Reports Download', <Box sx={cardSx}><FilterBar right={<IconTool><TbRefresh /></IconTool>}><DateBox /></FilterBar><TableView columns={['Report Generated On', 'Title', 'Report Type', 'Status', 'Action']} rows={[[ '4 Aug 2026, 09:39 AM', 'Order Report', 'ORDER', 'COMPLETED', <PrimaryButton>Download</PrimaryButton> ]]} /></Box>)
}

export function ShipmozoToolsTrackOrderPanel() {
  const [searchParams] = useSearchParams()
  const [awb, setAwb] = useState(searchParams.get('awb') || '')
  const hasAwb = Boolean(awb.trim())

  return (
    <PanelPage title="Track Order">
      <Stack alignItems="center" spacing={2}>
        <Stack direction="row">
          <Box
            component="input"
            value={awb}
            onChange={(event) => setAwb(event.currentTarget.value)}
            placeholder="AWB Number"
            sx={{
              width: 295,
              height: 50,
              px: 2,
              border: `1px solid ${border}`,
              borderRight: 0,
              borderRadius: '10px 0 0 10px',
              outline: 0,
              color: ink,
              fontSize: 14,
              '&:focus': { borderColor: teal, boxShadow: '0 0 0 3px rgba(7,137,173,.12)' },
            }}
          />
          <PrimaryButton>Track</PrimaryButton>
          <GhostButton icon={<TbRefresh />}> </GhostButton>
        </Stack>
        <Typography>
          Courier: {hasAwb ? 'Delhivery' : '--'} &nbsp; | &nbsp; AWB Number: {hasAwb ? awb : '--'} &nbsp; | &nbsp; Order ID: {hasAwb ? '21750SM7429822881' : '--'} &nbsp; | &nbsp; Current Status: {hasAwb ? 'In Transit' : '--'} &nbsp; | &nbsp; Estimated Delivery: {hasAwb ? '10 Aug 2026' : '--'}
        </Typography>
      </Stack>
      <Box sx={{ ...cardSx, mt: 2 }}><EmptyState text={hasAwb ? 'Tracking timeline will appear here.' : 'No tracking data found!'} minHeight={430} /></Box>
    </PanelPage>
  )
}

export function ShipmozoToolsWeightDiscrepancyPanel() {
  const rows = ['21750SM6879453314', '21750SM3345103574', '21750SM1979556472'].map((id, i) => [`${4 - i} Aug 2026 | 05:13 PM`, <Blue>{id}</Blue>, 'Delhivery 1Kg\nAWB: 35692516897914', <b>Applied Wt: {i + 1}kg</b>, <b>Charged Wt: {i + 4}kg</b>, <b>Excess charge: ₹212.4</b>, '--', '--', <Pill color="#5a99ff">New Discrepancy</Pill>, <PrimaryButton>Raise Dispute</PrimaryButton>])
  return <PanelPage title="Weight Discrepancies" actions={<PrimaryButton>Manage Packaging</PrimaryButton>}><Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 2 }}>{['Total Weight Discrepancies 7', 'Disputes Pending by Courier 0', 'Disputes Accepted by Courier 0', 'Disputes Rejected by Courier 0'].map((x) => <Stack key={x} sx={{ ...cardSx, p: 2.5 }}><Typography sx={{ fontWeight: 900 }}>{x}</Typography></Stack>)}</Box><Box sx={cardSx}><FilterBar right={<><IconTool><TbDownload /></IconTool><IconTool><TbRefresh /></IconTool></>}><DateBox /><InputBox text="OrderID" w={288} /><InputBox text="Status - All" w={250} /></FilterBar><TableView columns={['Dispute Date', 'Order Details', 'Tracking Info', 'Entered Wt. & Dims.', 'Courier Wt. & Dims.', 'Excess Wt. & Charges', 'Comments', 'Admin Reply', 'Dispute Status', 'Action']} rows={rows} /></Box></PanelPage>
}

function reportPage(title: string, rows: Cell[][]) {
  return <PanelPage title={title} actions={<PrimaryButton>Export All</PrimaryButton>}><Box sx={cardSx}><FilterBar right={<IconTool><TbRefresh /></IconTool>}><DateBox /><InputBox text="Forward" w={250} /><InputBox text="All" w={250} /></FilterBar><TableView columns={['Order Status', 'Total Orders', 'Action']} rows={rows.map((r) => [r[0], r[1], <PrimaryButton>Export</PrimaryButton>])} /></Box></PanelPage>
}

export function ShipmozoReportsOrdersPanel() {
  return reportPage('Orders Reports', [['Scheduled', '38'], ['Cancelled', '6']])
}

export function ShipmozoReportsShipmentPanel() {
  return reportPage('Shipment Reports', [['At Delivery Center', '1'], ['Delivered', '29'], ['In Transit', '5'], ['Out For Delivery', '1'], ['RTO Delivered', '1'], ['Undelivered', '1']])
}

export function ShipmozoReportsNdrPanel() {
  return reportPage('NDR Reports', [['Delivered', '2'], ['Delivered to consignee', '1'], ['Delivered to consignee - Code Verified delivery', '3'], ['RETURN Accepted', '1'], ['Wrong Pincode', '1']])
}

export function ShipmozoReportsCustomPanel() {
  const fields = ['Order ID', 'Order Date', 'Scheduled Date', 'Order Status', 'Type', 'Reference Order Id', 'Office Name', 'Order Channel', 'Product Name', 'SKU', 'Product Quantity', 'Unit Price', 'HSN', 'Discount', 'Product Category', 'Product Amount', 'Payment Type', 'Customer Name', 'Customer Email', 'Customer Phone', 'Customer Address 1', 'Customer City', 'Customer State', 'Customer Pincode', 'COD Amount', 'Parcel Weight', 'Volumetric Weight', 'Dimension', 'Package Type', 'Reseller Name', 'GST Number', 'Courier Status', 'COD Verified', 'Shipment Type']
  return <PanelPage title="Custom Report"><Box sx={{ ...cardSx, p: 2 }}><Typography>Date Range</Typography><DateBox /><Typography sx={{ mt: 3, mb: 2 }}>Select Columns to generate a report</Typography><Typography sx={{ fontWeight: 900 }}>Orders</Typography><Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 2, mt: 2 }}>{fields.map((f) => <Stack direction="row" spacing={1} alignItems="center" key={f}><Box sx={{ width: 22, height: 22, border: `1px solid #a8b8ca`, borderRadius: '4px' }} /> <span>{f}</span></Stack>)}</Box></Box></PanelPage>
}
