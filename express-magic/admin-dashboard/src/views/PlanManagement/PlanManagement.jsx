import { AddIcon } from '@chakra-ui/icons'
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
  HStack,
  IconButton,
  Switch,
  Text,
  Tooltip,
  useDisclosure,
} from '@chakra-ui/react'
import { IconCrown, IconEdit, IconLayersIntersect, IconTrash } from '@tabler/icons-react'
import {
  AdminStack,
  DataTable,
  Metric,
  PageIntro,
  PrimaryButton,
  SoftBadge,
} from 'components/AdminUI/AdminPage'
import PlanModal from 'components/plans/PlanModal'
import { useDeletePlan, usePlans, useUpdatePlan } from 'hooks/usePlans'
import { useMemo, useRef, useState } from 'react'

const planColor = (slug = '') => {
  const colors = {
    basic: 'blue',
    silver: 'gray',
    gold: 'orange',
    diamond: 'cyan',
    platinum: 'purple',
  }
  return colors[slug.toLowerCase()] || 'gray'
}

const PlanManagement = () => {
  const { data: plans = [], isLoading } = usePlans()
  const deletePlan = useDeletePlan()
  const updatePlan = useUpdatePlan()
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [planToDelete, setPlanToDelete] = useState(null)
  const planModal = useDisclosure()
  const deleteDialog = useDisclosure()
  const cancelRef = useRef()

  const orderedPlans = useMemo(
    () => [...plans].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [plans],
  )

  const handleCreate = () => {
    setSelectedPlan(null)
    planModal.onOpen()
  }

  const handleEdit = (plan) => {
    setSelectedPlan(plan)
    planModal.onOpen()
  }

  const confirmDelete = (plan) => {
    setPlanToDelete(plan)
    deleteDialog.onOpen()
  }

  const handleDelete = async () => {
    if (!planToDelete) return
    try {
      await deletePlan.mutateAsync(planToDelete.id)
      setPlanToDelete(null)
      deleteDialog.onClose()
    } catch {
      // The mutation hook displays the API error and keeps the confirmation open.
    }
  }

  const handleActivate = (plan, isActive) => {
    updatePlan.mutate({ id: plan.id, data: { is_active: isActive } })
  }

  return (
    <AdminStack>
      <PageIntro
        icon={IconCrown}
        title="Plan Management"
        subtitle="Create and manage pricing plans for sellers"
        right={
          <Metric
            icon={IconLayersIntersect}
            value={orderedPlans.length}
            label="total plans"
            color="#6C5CE7"
          />
        }
      />

      <HStack justify="flex-end">
        <PrimaryButton leftIcon={<AddIcon />} onClick={handleCreate}>
          Add Plan
        </PrimaryButton>
      </HStack>

      <DataTable
        loading={isLoading}
        rows={orderedPlans}
        columns={[
          {
            key: 'name',
            label: 'Name',
            render: (value, row) => (
              <HStack spacing="10px">
                <Text fontWeight="700">{value}</Text>
                {row.is_default ? <SoftBadge colorScheme="blue">Default</SoftBadge> : null}
              </HStack>
            ),
          },
          {
            key: 'slug',
            label: 'Slug',
            render: (value, row) => (
              <SoftBadge colorScheme={planColor(value || row.name)}>
                {value || row.name?.toLowerCase()}
              </SoftBadge>
            ),
          },
          {
            key: 'description',
            label: 'Description',
            render: (value) => <Text color="#607397">{value || '—'}</Text>,
          },
          {
            key: 'sort_order',
            label: 'Sort Order',
            align: 'center',
            render: (value) => value ?? 0,
          },
          {
            key: 'is_active',
            label: 'Status',
            align: 'center',
            render: (value, row) => (
              <Tooltip label={row.is_default ? 'The default plan must stay active' : ''}>
                <Switch
                  colorScheme="purple"
                  isChecked={value !== false}
                  isDisabled={row.is_default || updatePlan.isPending}
                  onChange={(event) => handleActivate(row, event.target.checked)}
                />
              </Tooltip>
            ),
          },
        ]}
        actions={(row) => (
          <HStack spacing="8px" justify="flex-end">
            <IconButton
              aria-label="Edit plan"
              icon={<IconEdit size={20} />}
              size="sm"
              variant="ghost"
              color="#607397"
              onClick={() => handleEdit(row)}
            />
            {!row.is_default ? (
              <IconButton
                aria-label="Delete plan"
                icon={<IconTrash size={20} />}
                size="sm"
                variant="ghost"
                color="#607397"
                onClick={() => confirmDelete(row)}
              />
            ) : null}
          </HStack>
        )}
        minW="980px"
      />

      <PlanModal
        isOpen={planModal.isOpen}
        onClose={planModal.onClose}
        plan={selectedPlan}
      />

      <AlertDialog
        isOpen={deleteDialog.isOpen}
        leastDestructiveRef={cancelRef}
        onClose={deleteDialog.onClose}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">Delete plan</AlertDialogHeader>
            <AlertDialogBody>
              Delete <strong>{planToDelete?.name}</strong>? Assigned sellers will move to the
              default plan and this plan&apos;s pricing rows will also be removed.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={deleteDialog.onClose}>Cancel</Button>
              <Button colorScheme="red" ml={3} isLoading={deletePlan.isPending} onClick={handleDelete}>
                Delete Plan
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </AdminStack>
  )
}

export default PlanManagement
