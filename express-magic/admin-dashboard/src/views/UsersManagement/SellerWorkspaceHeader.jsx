import { ChevronDownIcon } from '@chakra-ui/icons'
import {
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Switch,
  Text,
  useDisclosure,
  useToast,
} from '@chakra-ui/react'
import {
  IconArrowDownCircle,
  IconArrowLeft,
  IconArrowUpCircle,
  IconHistory,
  IconCrown,
  IconKey,
  IconWallet,
} from '@tabler/icons-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useResetUserPassword } from 'hooks/useUser'
import { useUpdateUserApproval } from 'hooks/useUsers'
import {
  useAdminWallet,
  useAdminWalletTransactions,
  useAdjustWalletBalance,
} from 'hooks/useWallet'
import { useEffect, useMemo, useState } from 'react'
import { useHistory } from 'react-router-dom'
import { PlansService } from 'services/plan.service'
import {
  OTHER_WALLET_REASON,
  resolveWalletAdjustmentReason,
  WALLET_ADJUSTMENT_REASONS,
} from 'utils/walletAdjustmentReasons'

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(Number(value || 0))

const statusLabel = (status) => {
  if (status === 'verified') return 'KYC Verified'
  if (status === 'rejected') return 'KYC Rejected'
  if (status === 'verification_in_progress') return 'KYC Pending Review'
  return 'KYC Not Started'
}

const statusColor = (status) => {
  if (status === 'verified') return 'green'
  if (status === 'rejected') return 'red'
  if (status === 'verification_in_progress') return 'orange'
  return 'gray'
}

const planColor = (plan) => {
  const slug = String(plan?.slug || plan?.name || '').toLowerCase()
  if (slug.includes('gold')) return '#F5C400'
  if (slug.includes('diamond')) return '#18CED0'
  if (slug.includes('platinum')) return '#8F0895'
  if (slug.includes('silver')) return '#F59E0B'
  return '#8A8F98'
}

export default function SellerWorkspaceHeader({ user, userId }) {
  const history = useHistory()
  const toast = useToast()
  const queryClient = useQueryClient()
  const adjustModal = useDisclosure()
  const historyModal = useDisclosure()
  const passwordModal = useDisclosure()
  const [adjustmentType, setAdjustmentType] = useState('credit')
  const [amount, setAmount] = useState('')
  const [reasonOption, setReasonOption] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [notes, setNotes] = useState('')
  const [tempPassword, setTempPassword] = useState('')
  const [selectedPlan, setSelectedPlan] = useState(user?.currentPlanId || '')

  const company = user?.companyInfo || {}
  const name = company.contactPerson || company.brandName || company.businessName || user?.email || 'Seller'
  const kycStatus = user?.domesticKyc?.status || 'pending'
  const approved = user?.approved === true
  const onboarded = user?.onboardingComplete === true

  const { data: walletResponse, isLoading: walletLoading } = useAdminWallet(userId)
  const wallet = walletResponse?.data
  const { data: transactionsResponse, isLoading: transactionsLoading } =
    useAdminWalletTransactions(userId, { page: 1, limit: 50 }, historyModal.isOpen)
  const transactions = transactionsResponse?.transactions || []
  const adjustWallet = useAdjustWalletBalance()
  const updateApproval = useUpdateUserApproval()
  const resetPassword = useResetUserPassword()

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => PlansService.getPlans(),
  })

  const activePlans = useMemo(
    () =>
      plans
        .filter((plan) => plan.is_active !== false)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [plans],
  )
  const selectedPlanRecord = activePlans.find((plan) => plan.id === selectedPlan)
  const reason = resolveWalletAdjustmentReason(reasonOption, customReason)
  const assignPlan = useMutation({
    mutationFn: (planId) => PlansService.assignPlanToUser(userId, planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userInfo', userId] })
      queryClient.invalidateQueries({ queryKey: ['users-with-role-user'] })
      toast({ status: 'success', title: 'Seller plan updated' })
    },
    onError: (error) => {
      setSelectedPlan(user?.currentPlanId || '')
      toast({
        status: 'error',
        title: 'Plan update failed',
        description: error?.response?.data?.message || error.message,
      })
    },
  })

  useEffect(() => {
    setSelectedPlan(user?.currentPlanId || '')
  }, [user?.currentPlanId])

  const handleApproval = async (nextApproved) => {
    try {
      await updateApproval.mutateAsync({ userId, approved: nextApproved })
      toast({
        status: 'success',
        title: nextApproved ? 'Account approved and activated' : 'Account deactivated',
      })
    } catch (error) {
      toast({
        status: 'error',
        title: 'Account approval update failed',
        description: error?.response?.data?.message || error.message,
      })
    }
  }

  const openAdjustment = (type) => {
    setAdjustmentType(type)
    setAmount('')
    setReasonOption('')
    setCustomReason('')
    setNotes('')
    adjustModal.onOpen()
  }

  const submitAdjustment = async () => {
    try {
      await adjustWallet.mutateAsync({
        userId,
        type: adjustmentType,
        amount: Number(amount),
        reason,
        notes: notes.trim(),
      })
      toast({
        status: 'success',
        title: `Wallet ${adjustmentType === 'credit' ? 'credited' : 'debited'}`,
      })
      adjustModal.onClose()
    } catch (error) {
      toast({
        status: 'error',
        title: 'Wallet adjustment failed',
        description: error?.response?.data?.message || error.message,
      })
    }
  }

  const handleResetPassword = async () => {
    try {
      const password = await resetPassword.mutateAsync(userId)
      setTempPassword(password)
      passwordModal.onOpen()
    } catch (error) {
      toast({
        status: 'error',
        title: 'Password reset failed',
        description: error?.response?.data?.message || error.message,
      })
    }
  }

  return (
    <Stack spacing="14px" mb="18px">
      <Button
        leftIcon={<IconArrowLeft size={18} />}
        variant="ghost"
        alignSelf="flex-start"
        color="#536786"
        onClick={() => history.push('/admin/users-management')}
      >
        Back to sellers
      </Button>

      <Box bg="white" border="1px solid #E4EAF3" borderRadius="20px" p={{ base: 4, md: 6 }}>
        <Flex justify="space-between" gap={5} wrap="wrap">
          <HStack align="flex-start" spacing="16px">
            <Avatar name={name} src={company.profilePicture} size="lg" bg="#F0EDFF" color="#6C5CE7" />
            <Box>
              <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="800" color="#111C33">
                {name}
              </Text>
              <HStack spacing="8px" mt="7px" wrap="wrap">
                <Badge colorScheme={approved ? 'green' : 'red'} borderRadius="7px" px="9px" py="4px">
                  {approved ? 'Account Approved' : 'Approval Pending'}
                </Badge>
                <Badge colorScheme={user?.emailVerified ? 'cyan' : 'gray'} borderRadius="7px" px="9px" py="4px">
                  {user?.emailVerified ? 'Verified' : 'Email Unverified'}
                </Badge>
                <Badge colorScheme={onboarded ? 'blue' : 'orange'} borderRadius="7px" px="9px" py="4px">
                  {onboarded ? 'Onboarded' : 'Not Onboarded'}
                </Badge>
                <Badge colorScheme={statusColor(kycStatus)} borderRadius="7px" px="9px" py="4px">
                  {statusLabel(kycStatus)}
                </Badge>
              </HStack>
            </Box>
          </HStack>

          <Stack minW={{ base: '100%', md: '265px' }} align={{ base: 'stretch', md: 'flex-end' }}>
            <HStack justify={{ base: 'space-between', md: 'flex-end' }}>
              <Text fontSize="sm" color="#607397" fontWeight="700">
                Account approval
              </Text>
              <Switch
                colorScheme="purple"
                size="lg"
                isChecked={approved}
                isDisabled={updateApproval.isPending}
                onChange={(event) => handleApproval(event.target.checked)}
              />
            </HStack>
            <FormControl maxW={{ md: '245px' }}>
              <FormLabel fontSize="xs" color="#607397" mb="4px">
                Assigned plan
              </FormLabel>
              {plansLoading ? (
                <Spinner size="sm" />
              ) : (
                <Menu placement="bottom-end">
                  <MenuButton
                    as={Button}
                    size="sm"
                    w="100%"
                    variant="outline"
                    borderColor="#B9AAFF"
                    borderRadius="9px"
                    textAlign="left"
                    leftIcon={<IconCrown size={17} color="#F59E0B" />}
                    rightIcon={<ChevronDownIcon />}
                    isLoading={assignPlan.isPending}
                  >
                    {selectedPlanRecord?.name || 'Select plan'}
                  </MenuButton>
                  <MenuList borderRadius="12px" p="6px" minW="190px" boxShadow="xl">
                    {activePlans.map((plan) => {
                      const selected = plan.id === selectedPlan
                      return (
                        <MenuItem
                          key={plan.id}
                          borderRadius="8px"
                          bg={selected ? '#F0EDFF' : 'transparent'}
                          fontWeight={selected ? '800' : '600'}
                          onClick={() => {
                            if (selected) return
                            setSelectedPlan(plan.id)
                            assignPlan.mutate(plan.id)
                          }}
                        >
                          <Flex align="center" gap="9px">
                            <Box w="10px" h="10px" borderRadius="full" bg={planColor(plan)} />
                            <Text>{plan.name}</Text>
                            {plan.is_default ? <Badge colorScheme="blue">Default</Badge> : null}
                          </Flex>
                        </MenuItem>
                      )
                    })}
                  </MenuList>
                </Menu>
              )}
            </FormControl>
          </Stack>
        </Flex>

        <Divider my="18px" />

        <Flex justify="space-between" align="center" gap={4} wrap="wrap">
          <HStack spacing="10px">
            <IconWallet size={21} color="#6C5CE7" />
            <Text color="#536786">Wallet Balance:</Text>
            <Text fontWeight="800" color="#111C33">
              {walletLoading ? 'Loading...' : money(wallet?.balance)}
            </Text>
          </HStack>
          <HStack spacing="9px" wrap="wrap">
            <Button size="sm" variant="outline" leftIcon={<IconHistory size={17} />} onClick={historyModal.onOpen}>
              History
            </Button>
            <Button
              size="sm"
              colorScheme="green"
              variant="outline"
              leftIcon={<IconArrowUpCircle size={17} />}
              onClick={() => openAdjustment('credit')}
            >
              Credit
            </Button>
            <Button
              size="sm"
              colorScheme="red"
              variant="outline"
              leftIcon={<IconArrowDownCircle size={17} />}
              onClick={() => openAdjustment('debit')}
            >
              Debit
            </Button>
            <Button
              size="sm"
              colorScheme="orange"
              variant="outline"
              leftIcon={<IconKey size={17} />}
              isLoading={resetPassword.isPending}
              onClick={handleResetPassword}
            >
              Reset password
            </Button>
          </HStack>
        </Flex>
      </Box>

      <Modal isOpen={adjustModal.isOpen} onClose={adjustModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{adjustmentType === 'credit' ? 'Credit' : 'Debit'} seller wallet</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Amount</FormLabel>
                <Input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
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
                  <Input
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
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={adjustModal.onClose}>Cancel</Button>
            <Button
              colorScheme={adjustmentType === 'credit' ? 'green' : 'red'}
              isDisabled={!Number(amount) || reason.length < 2}
              isLoading={adjustWallet.isPending}
              onClick={submitAdjustment}
            >
              Confirm {adjustmentType}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={historyModal.isOpen} onClose={historyModal.onClose} size="3xl" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Wallet history</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {transactionsLoading ? (
              <Flex justify="center" py={10}><Spinner /></Flex>
            ) : transactions.length ? (
              <Stack divider={<Divider />} spacing={0}>
                {transactions.map((transaction) => (
                  <Flex key={transaction.id} justify="space-between" py={3} gap={3}>
                    <Box>
                      <Text fontWeight="700">{transaction.reason || 'Wallet adjustment'}</Text>
                      <Text fontSize="sm" color="#607397">
                        {transaction.created_at ? new Date(transaction.created_at).toLocaleString('en-IN') : '—'}
                      </Text>
                    </Box>
                    <Text fontWeight="800" color={transaction.type === 'credit' ? 'green.600' : 'red.600'}>
                      {transaction.type === 'credit' ? '+' : '-'}{money(transaction.amount)}
                    </Text>
                  </Flex>
                ))}
              </Stack>
            ) : (
              <Text textAlign="center" color="#607397" py={10}>No wallet transactions yet.</Text>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      <Modal isOpen={passwordModal.isOpen} onClose={passwordModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Temporary password generated</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text color="#607397" mb={3}>Share this securely with the seller. It is also sent to their email.</Text>
            <Box bg="#F6F4FF" borderRadius="10px" p={4} fontFamily="mono" fontWeight="800">
              {tempPassword}
            </Box>
          </ModalBody>
          <ModalFooter><Button colorScheme="purple" onClick={passwordModal.onClose}>Done</Button></ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  )
}
