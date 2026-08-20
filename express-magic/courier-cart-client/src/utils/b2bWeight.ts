export const b2bBoxWeightInputToKg = (value: unknown) => {
  const parsed = Number(value ?? 0)
  if (!Number.isFinite(parsed) || parsed <= 0) return 0
  return parsed
}
