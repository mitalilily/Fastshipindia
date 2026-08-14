import {
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Input,
  Stack,
  Switch,
  Textarea,
} from '@chakra-ui/react'
import { useCreatePlan, useUpdatePlan } from 'hooks/usePlans'
import { useEffect, useState } from 'react'

const slugify = (value) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const emptyForm = {
  name: '',
  slug: '',
  description: '',
  sort_order: 0,
  is_active: true,
  is_default: false,
}

const PlanForm = ({ plan, onClose }) => {
  const createPlan = useCreatePlan()
  const updatePlan = useUpdatePlan()
  const [slugTouched, setSlugTouched] = useState(false)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (plan) {
      setForm({
        name: plan.name || '',
        slug: plan.slug || slugify(plan.name || ''),
        description: plan.description || '',
        sort_order: plan.sort_order ?? 0,
        is_active: plan.is_active !== false,
        is_default: Boolean(plan.is_default),
      })
      setSlugTouched(true)
    } else {
      setForm(emptyForm)
      setSlugTouched(false)
    }
  }, [plan])

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const pending = createPlan.isPending || updatePlan.isPending
  const valid = form.name.trim().length >= 2 && form.slug.trim().length > 0

  const handleSubmit = () => {
    const payload = {
      ...form,
      name: form.name.trim(),
      slug: slugify(form.slug),
      description: form.description.trim(),
      sort_order: Number(form.sort_order || 0),
      is_active: form.is_default ? true : form.is_active,
    }

    if (plan) {
      updatePlan.mutate({ id: plan.id, data: payload }, { onSuccess: onClose })
    } else {
      createPlan.mutate(payload, { onSuccess: onClose })
    }
  }

  return (
    <Stack spacing={5}>
      <FormControl isRequired>
        <FormLabel>Plan name</FormLabel>
        <Input
          value={form.name}
          placeholder="e.g. Gold"
          onChange={(event) => {
            const name = event.target.value
            setForm((current) => ({
              ...current,
              name,
              slug: slugTouched ? current.slug : slugify(name),
            }))
          }}
        />
      </FormControl>

      <FormControl isRequired>
        <FormLabel>Slug</FormLabel>
        <Input
          value={form.slug}
          placeholder="gold"
          onChange={(event) => {
            setSlugTouched(true)
            setField('slug', slugify(event.target.value))
          }}
        />
        <FormHelperText>Used internally for pricing and plan identification.</FormHelperText>
      </FormControl>

      <FormControl>
        <FormLabel>Description</FormLabel>
        <Textarea
          value={form.description}
          maxLength={255}
          placeholder="Short description shown to admins"
          onChange={(event) => setField('description', event.target.value)}
        />
      </FormControl>

      <FormControl>
        <FormLabel>Sort order</FormLabel>
        <Input
          type="number"
          min="0"
          value={form.sort_order}
          onChange={(event) => setField('sort_order', event.target.value)}
        />
        <FormHelperText>Lower numbers appear first in plan selectors.</FormHelperText>
      </FormControl>

      <HStack justify="space-between">
        <FormLabel mb="0">Active plan</FormLabel>
        <Switch
          colorScheme="purple"
          isChecked={form.is_active || form.is_default}
          isDisabled={form.is_default}
          onChange={(event) => setField('is_active', event.target.checked)}
        />
      </HStack>

      <HStack justify="space-between">
        <FormLabel mb="0">Default plan</FormLabel>
        <Switch
          colorScheme="blue"
          isChecked={form.is_default}
          isDisabled={Boolean(plan?.is_default)}
          onChange={(event) => {
            const isDefault = event.target.checked
            setForm((current) => ({
              ...current,
              is_default: isDefault,
              is_active: isDefault ? true : current.is_active,
            }))
          }}
        />
      </HStack>

      <Button
        colorScheme="purple"
        isDisabled={!valid}
        isLoading={pending}
        onClick={handleSubmit}
      >
        {plan ? 'Update Plan' : 'Create Plan'}
      </Button>
    </Stack>
  )
}

export default PlanForm
