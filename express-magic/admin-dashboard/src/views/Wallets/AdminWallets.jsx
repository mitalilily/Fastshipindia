import {
  Avatar,
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Spinner,
  Stack,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tooltip,
  Tr,
  useDisclosure,
  useToast,
} from '@chakra-ui/react'
import {
  IconArrowDownCircle,
  IconArrowsSort,
  IconArrowUpCircle,
  IconChevronLeft,
  IconChevronRight,
  IconHistory,
  IconWallet,
} from '@tabler/icons-react'
import {
  AdminStack,
  DataTable,
  Metric,
  PageIntro,
  SearchInput,
  SoftBadge,
  ToolbarCard,
} from 'components/AdminUI/AdminPage'
import Pagination from 'components/Tables/Pagination'
import OrderDetailsModal from 'components/Tables/OrderDetailsModal'
import {
  useAdminWallets,
  useAdminWalletTransactions,
  useAdjustWalletBalance,
} from 'hooks/useWallet'
import { useMemo, useState } from 'react'
import {
  OTHER_WALLET_REASON,
  resolveWalletAdjustmentReason,
  WALLET_ADJUSTMENT_REASONS,
} from 'utils/walletAdjustmentReasons'

const HISTORY_LIMIT = 25

const formatBalance = (balance) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(Number(balance || 0))

const sellerName = (row) =>
  row?.userName ||
  row?.companyInfo?.contactPerson ||
  row?.companyInfo?.brandName ||
  row?.companyInfo?.businessName ||
  row?.userEmail ||
  row?.userPhone ||
  'Seller'

const businessName = (row) =>
  row?.companyInfo?.businessName || row?.companyInfo?.brandName || '—'

const errorMessage = (error) =>
  error?.response?.data?.message || error?.message || 'Please try again.'

const formatDateTime = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-IN')
}

export default function AdminWallets() {
  const toast = useToast()
  const adjustmentModal = useDisclosure()
  const historyDrawer = useDisclosure()
  const orderModal = useDisclosure()
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('updatedAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [selectedWallet, setSelectedWallet] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [adjustmentType, setAdjustmentType] = useState('credit')
  const [amount, setAmount] = useState('')
  const [reasonOption, setReasonOption] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [notes, setNotes] = useState('')
  const [historyPage, setHistoryPage] = useState(1)
  const [historyType, setHistoryType] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data: walletsData, isLoading } = useAdminWallets({
    page,
    limit,
    search,
    sortBy,
    sortOrder,
  })
  const wallets = walletsData?.data || []
  const totalCount = walletsData?.totalCount || 0
  const summary = walletsData?.summary || { totalBalance: 0, withBalance: 0 }

  const historyQuery = useAdminWalletTransactions(
    selectedWallet?.userId,
    {
      page: historyPage,
      limit: HISTORY_LIMIT,
      type: historyType || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    },
    historyDrawer.isOpen,
  )
  const transactions = historyQuery.data?.transactions || []
  const historyTotal = historyQuery.data?.totalCount || 0
  const historyPages = Math.max(1, Math.ceil(historyTotal / HISTORY_LIMIT))
  const adjustWallet = useAdjustWalletBalance()

  const amountNumber = Number(amount || 0)
  const reason = resolveWalletAdjustmentReason(reasonOption, customReason)
  const projectedBalance = useMemo(() => {
    const current = Number(selectedWallet?.balance || 0)
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) return current
    return adjustmentType === 'credit' ? current + amountNumber : current - amountNumber
  }, [adjustmentType, amountNumber, selectedWallet?.balance])

  const openAdjustment = (wallet, type) => {
    setSelectedWallet(wallet)
    setAdjustmentType(type)
    setAmount('')
    setReasonOption('')
    setCustomReason('')
    setNotes('')
    adjustmentModal.onOpen()
  }

  const openHistory = (wallet) => {
    setSelectedWallet(wallet)
    setHistoryPage(1)
    setHistoryType('')
    setDateFrom('')
    setDateTo('')
    historyDrawer.onOpen()
  }

  const submitAdjustment = async () => {
    try {
      await adjustWallet.mutateAsync({
        userId: selectedWallet.userId,
        type: adjustmentType,
        amount: amountNumber,
        reason,
        notes: notes.trim(),
      })
      toast({
        status: 'success',
        title: `Wallet ${adjustmentType === 'credit' ? 'credited' : 'debited'}`,
        description: `${formatBalance(amountNumber)} recorded for ${sellerName(selectedWallet)}.`,
      })
      adjustmentModal.onClose()
    } catch (error) {
      toast({
        status: 'error',
        title: 'Wallet adjustment failed',
        description: errorMessage(error),
      })
    }
  }

  const toggleBalanceSort = () => {
    setPage(1)
    setSortBy('balance')
    setSortOrder((current) => (sortBy === 'balance' && current === 'desc' ? 'asc' : 'desc'))
  }

  const renderTransactionAwb = (txn) => {
    const awb = txn.awb_number || txn.order?.awb_number
    if (!awb) return <Text color="#607397">—</Text>
    if (!txn.order) return <Text fontWeight="600">{awb}</Text>

    return (
      <Button
        variant="link"
        color="#6C5CE7"
        fontSize="13px"
        onClick={() => {
          setSelectedOrder(txn.order)
          orderModal.onOpen()
        }}
      >
        {awb}
      </Button>
    )
  }

  return (
    <AdminStack>
      <PageIntro
        icon={IconWallet}
        title="Wallet Management"
        subtitle="View and manage merchant wallets"
        right={
          <HStack spacing="28px" wrap="wrap">
            <Metric icon={IconWallet} value={totalCount} label="total wallets" color="#2F80ED" />
            <Metric
              icon={IconWallet}
              value={formatBalance(summary.totalBalance)}
              label="total balance"
              color="#00A881"
            />
            <Metric
              icon={IconArrowsSort}
              value={summary.withBalance}
              label="with balance"
              color="#FF9C1A"
            />
          </HStack>
        }
      />

      <ToolbarCard>
        <Box>
          <Text color="#41557A" fontSize="14px" mb="7px">Search</Text>
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value)
              setPage(1)
            }}
            placeholder="Search by name, email, phone..."
            maxW="350px"
          />
        </Box>
      </ToolbarCard>

      <DataTable
        loading={isLoading}
        rows={wallets}
        emptyText="No merchant wallets found"
        columns={[
          {
            key: 'user',
            label: 'User',
            render: (_value, row) => (
              <HStack spacing="13px">
                <Avatar name={sellerName(row)} size="sm" bg="#F0EDFF" color="#6C5CE7" />
                <Box>
                  <Text fontWeight="700">{sellerName(row)}</Text>
                  <Text color="#607397" fontSize="13px">{row.userEmail || row.userPhone || '—'}</Text>
                </Box>
              </HStack>
            ),
          },
          {
            key: 'business',
            label: 'Business',
            render: (_value, row) => businessName(row),
          },
          {
            key: 'plan',
            label: 'Plan',
            render: (_value, row) => (
              <SoftBadge colorScheme={row.planName ? 'purple' : 'gray'}>
                {row.planName || 'Not assigned'}
              </SoftBadge>
            ),
          },
          {
            key: 'balance',
            label: (
              <Button
                variant="unstyled"
                h="auto"
                minW="auto"
                fontSize="12px"
                fontWeight="800"
                color="inherit"
                rightIcon={<IconArrowsSort size={15} />}
                onClick={toggleBalanceSort}
              >
                Balance
              </Button>
            ),
            align: 'right',
            render: (value) => (
              <Text fontWeight="800" color={Number(value || 0) > 0 ? '#009E72' : '#607397'}>
                {formatBalance(value)}
              </Text>
            ),
          },
          {
            key: 'status',
            label: 'Status',
            render: (_value, row) => (
              <SoftBadge colorScheme={row.approved ? 'green' : 'orange'}>
                {row.approved ? 'Active' : 'Pending approval'}
              </SoftBadge>
            ),
          },
        ]}
        actions={(row) => (
          <HStack justify="flex-end" spacing="4px">
            <Tooltip label="Transaction history" hasArrow>
              <IconButton
                aria-label="Transaction history"
                icon={<IconHistory size={18} />}
                variant="ghost"
                size="sm"
                color="#607397"
                onClick={() => openHistory(row)}
              />
            </Tooltip>
            <Tooltip label="Credit" hasArrow>
              <IconButton
                aria-label="Credit wallet"
                icon={<IconArrowUpCircle size={18} />}
                variant="ghost"
                size="sm"
                color="#009E72"
                onClick={() => openAdjustment(row, 'credit')}
              />
            </Tooltip>
            <Tooltip label="Debit" hasArrow>
              <IconButton
                aria-label="Debit wallet"
                icon={<IconArrowDownCircle size={18} />}
                variant="ghost"
                size="sm"
                color="#E53E3E"
                onClick={() => openAdjustment(row, 'debit')}
              />
            </Tooltip>
          </HStack>
        )}
        footer={
          <Box w="100%">
            <Pagination
              page={page}
              setPage={setPage}
              totalCount={totalCount}
              perPage={limit}
              setPerPage={setLimit}
              perPageOptions={[10, 20, 50, 100]}
            />
          </Box>
        }
        minW="1080px"
      />

      <Modal
        isOpen={adjustmentModal.isOpen}
        onClose={adjustWallet.isPending ? () => {} : adjustmentModal.onClose}
        isCentered
        size="lg"
      >
        <ModalOverlay bg="blackAlpha.500" backdropFilter="blur(2px)" />
        <ModalContent borderRadius="16px">
          <ModalHeader>Adjust Wallet</ModalHeader>
          <ModalCloseButton isDisabled={adjustWallet.isPending} />
          <ModalBody>
            <Stack spacing={5}>
              <HStack bg="#F8FAFD" border="1px solid #E5EAF3" borderRadius="13px" p={3}>
                <Avatar name={sellerName(selectedWallet)} size="sm" bg="#F0EDFF" color="#6C5CE7" />
                <Box>
                  <Text fontWeight="700">{sellerName(selectedWallet)}</Text>
                  <Text fontSize="13px" color="#607397">
                    Current: {formatBalance(selectedWallet?.balance)}
                  </Text>
                </Box>
              </HStack>

              <HStack>
                <Button
                  flex="1"
                  variant="outline"
                  colorScheme="green"
                  leftIcon={<IconArrowUpCircle size={19} />}
                  bg={adjustmentType === 'credit' ? 'green.50' : 'white'}
                  borderColor={adjustmentType === 'credit' ? 'green.300' : '#E5EAF3'}
                  onClick={() => {
                    setAdjustmentType('credit')
                    setReasonOption('')
                    setCustomReason('')
                  }}
                >
                  Credit
                </Button>
                <Button
                  flex="1"
                  variant="outline"
                  colorScheme="red"
                  leftIcon={<IconArrowDownCircle size={19} />}
                  bg={adjustmentType === 'debit' ? 'red.50' : 'white'}
                  borderColor={adjustmentType === 'debit' ? 'red.300' : '#E5EAF3'}
                  onClick={() => {
                    setAdjustmentType('debit')
                    setReasonOption('')
                    setCustomReason('')
                  }}
                >
                  Debit
                </Button>
              </HStack>

              <FormControl isRequired>
                <FormLabel>Amount (₹)</FormLabel>
                <InputGroup>
                  <InputLeftElement pointerEvents="none">₹</InputLeftElement>
                  <Input
                    type="number"
                    min="0.01"
                    max="9999999999.99"
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0.00"
                  />
                </InputGroup>
                {amountNumber > 0 ? (
                  <Text mt={1} fontSize="12px" color={projectedBalance < 0 ? 'red.500' : '#607397'}>
                    Balance after adjustment: {formatBalance(projectedBalance)}
                  </Text>
                ) : null}
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Reason</FormLabel>
                <Select
                  value={reasonOption}
                  onChange={(event) => {
                    setReasonOption(event.target.value)
                    if (event.target.value !== OTHER_WALLET_REASON) setCustomReason('')
                  }}
                  placeholder="Select a reason"
                >
                  {WALLET_ADJUSTMENT_REASONS[adjustmentType].map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                  <option value={OTHER_WALLET_REASON}>Other</option>
                </Select>
                {reasonOption === OTHER_WALLET_REASON ? (
                  <Textarea
                    mt={3}
                    value={customReason}
                    maxLength={128}
                    onChange={(event) => setCustomReason(event.target.value)}
                    placeholder="Enter the adjustment reason"
                    autoFocus
                  />
                ) : null}
              </FormControl>

              <FormControl>
                <FormLabel>Internal notes</FormLabel>
                <Textarea
                  value={notes}
                  maxLength={1000}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Optional notes visible to admins"
                />
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="outline" flex="1" onClick={adjustmentModal.onClose} isDisabled={adjustWallet.isPending}>
              Cancel
            </Button>
            <Button
              flex="1"
              colorScheme={adjustmentType === 'credit' ? 'green' : 'red'}
              isDisabled={!Number.isFinite(amountNumber) || amountNumber <= 0 || reason.length < 2}
              isLoading={adjustWallet.isPending}
              onClick={submitAdjustment}
            >
              {adjustmentType === 'credit' ? 'Credit' : 'Debit'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Drawer isOpen={historyDrawer.isOpen} placement="right" onClose={historyDrawer.onClose} size="xl">
        <DrawerOverlay bg="blackAlpha.500" />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader borderBottom="1px solid #E5EAF3">
            Transactions — {sellerName(selectedWallet)}
          </DrawerHeader>
          <DrawerBody py={5}>
            <Stack spacing={5}>
              <Flex gap={3} wrap="wrap">
                <Select
                  value={historyType}
                  onChange={(event) => {
                    setHistoryType(event.target.value)
                    setHistoryPage(1)
                  }}
                  maxW={{ base: '100%', md: '180px' }}
                >
                  <option value="">All types</option>
                  <option value="credit">Credit</option>
                  <option value="debit">Debit</option>
                </Select>
                <Input
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(event) => {
                    setDateFrom(event.target.value)
                    setHistoryPage(1)
                  }}
                  maxW={{ base: '100%', md: '180px' }}
                  aria-label="Start date"
                />
                <Input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(event) => {
                    setDateTo(event.target.value)
                    setHistoryPage(1)
                  }}
                  maxW={{ base: '100%', md: '180px' }}
                  aria-label="End date"
                />
                {(historyType || dateFrom || dateTo) ? (
                  <Button
                    variant="ghost"
                    color="#6C5CE7"
                    onClick={() => {
                      setHistoryType('')
                      setDateFrom('')
                      setDateTo('')
                      setHistoryPage(1)
                    }}
                  >
                    Clear filters
                  </Button>
                ) : null}
              </Flex>

              <Box border="1px solid #E5EAF3" borderRadius="16px" overflow="hidden">
                <TableContainer>
                  <Table minW="820px">
                    <Thead bg="#F4F1FF">
                      <Tr>
                        <Th>Date</Th>
                        <Th>Type</Th>
                        <Th isNumeric>Amount</Th>
                        <Th>Reason</Th>
                        <Th>AWB</Th>
                        <Th>Reference</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {historyQuery.isLoading ? (
                        <Tr><Td colSpan={6} py={16} textAlign="center"><Spinner /></Td></Tr>
                      ) : historyQuery.isError ? (
                        <Tr>
                          <Td colSpan={6} py={16} textAlign="center" color="red.500">
                            {errorMessage(historyQuery.error)}
                          </Td>
                        </Tr>
                      ) : transactions.length ? (
                        transactions.map((txn) => (
                          <Tr key={txn.id}>
                            <Td whiteSpace="nowrap">{formatDateTime(txn.created_at)}</Td>
                            <Td>
                              <SoftBadge colorScheme={txn.type === 'credit' ? 'green' : 'red'}>
                                {txn.type === 'credit' ? 'Credit' : 'Debit'}
                              </SoftBadge>
                            </Td>
                            <Td isNumeric fontWeight="800" color={txn.type === 'credit' ? 'green.600' : 'red.600'}>
                              {txn.type === 'credit' ? '+' : '-'}{formatBalance(txn.amount)}
                            </Td>
                            <Td>
                              <Text fontWeight="600">{txn.reason || 'Wallet transaction'}</Text>
                              {txn.meta?.notes ? (
                                <Text fontSize="12px" color="#607397" mt={1}>{txn.meta.notes}</Text>
                              ) : null}
                            </Td>
                            <Td>{renderTransactionAwb(txn)}</Td>
                            <Td color="#607397" fontSize="13px">{txn.ref || '—'}</Td>
                          </Tr>
                        ))
                      ) : (
                        <Tr>
                          <Td colSpan={6} py={20} textAlign="center" color="#607397">
                            No transactions found for these filters.
                          </Td>
                        </Tr>
                      )}
                    </Tbody>
                  </Table>
                </TableContainer>
                <Flex justify="space-between" align="center" px={4} py={3} borderTop="1px solid #E5EAF3">
                  <Text fontSize="13px" color="#607397">{historyTotal} transactions</Text>
                  <HStack>
                    <IconButton
                      aria-label="Previous transaction page"
                      icon={<IconChevronLeft size={18} />}
                      size="sm"
                      variant="outline"
                      isDisabled={historyPage <= 1}
                      onClick={() => setHistoryPage((current) => Math.max(1, current - 1))}
                    />
                    <Text fontSize="13px">{historyPage} / {historyPages}</Text>
                    <IconButton
                      aria-label="Next transaction page"
                      icon={<IconChevronRight size={18} />}
                      size="sm"
                      variant="outline"
                      isDisabled={historyPage >= historyPages}
                      onClick={() => setHistoryPage((current) => Math.min(historyPages, current + 1))}
                    />
                  </HStack>
                </Flex>
              </Box>
            </Stack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <OrderDetailsModal
        isOpen={orderModal.isOpen}
        onClose={orderModal.onClose}
        order={selectedOrder}
      />
    </AdminStack>
  )
}
