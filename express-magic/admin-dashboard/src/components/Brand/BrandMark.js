import { Box, Flex, Stack, Text, useColorModeValue } from '@chakra-ui/react'
import { BRAND } from '../../constants/brand'

export default function BrandMark({
  compact = false,
  showTagline = false,
  align = 'center',
  size = 40,
  markOnly = false,
}) {
  const titleColor = useColorModeValue(BRAND.colors.ink, 'white')

  if (markOnly) {
    return (
      <Box
        as="img"
        src={BRAND.mark}
        alt={BRAND.name}
        w={`${Math.round(size * 2.8)}px`}
        h={`${size}px`}
        objectFit="contain"
        objectPosition="left center"
      />
    )
  }

  return (
    <Flex align="center" justify={align} gap={compact ? '10px' : '14px'}>
      <Box
        as="img"
        src={BRAND.logo}
        alt={BRAND.name}
        w={`${Math.round(size * 3.2)}px`}
        h={`${Math.round(size * 1.25)}px`}
        objectFit="contain"
        objectPosition="left center"
        borderRadius="0"
        bg="transparent"
        p="0"
      />
      <Stack spacing={0.5} align={align === 'center' ? 'center' : 'start'}>
        <Text fontSize={compact ? 'sm' : 'md'} fontWeight="800" color={titleColor} letterSpacing="-0.02em">
          {showTagline ? 'Admin Console' : BRAND.name}
        </Text>
      </Stack>
    </Flex>
  )
}
