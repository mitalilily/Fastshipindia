import {
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  HStack,
  SimpleGrid,
  Text,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react'
import { ContentState, convertFromHTML, convertToRaw, EditorState } from 'draft-js'
import draftToHtml from 'draftjs-to-html'
import { useStaticPage, useUpdateStaticPage } from 'hooks/useStaticPage'
import { useEffect, useState } from 'react'
import { Editor } from 'react-draft-wysiwyg'
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css'
import { FiCheck, FiRefreshCcw } from 'react-icons/fi'

const PAGE_CONFIG = {
  b2c: {
    slug: 'rate_calculator_terms_b2c',
    label: 'B2C Terms & Conditions',
    title: 'Rate Calculator Terms & Conditions (B2C)',
    template: `
      <ul>
        <li>Above shared commercials are exclusive of GST.</li>
        <li>Pricing is subject to change when a courier company updates its commercials.</li>
        <li>Volumetric or dead weight, whichever is higher, will be charged.</li>
        <li>Return charges are the same as forward charges where special RTO pricing is not shared.</li>
        <li>Fixed COD charge or COD percentage of the order value, whichever is higher, will apply.</li>
        <li>Other applicable charges, including address correction charges, will be charged extra.</li>
        <li>Prohibited items must not be shipped. Any resulting penalty will be charged to the seller.</li>
        <li>No claim will be entertained for glassware, fragile products, concealed damage, or improper packaging.</li>
        <li>A weight dispute caused by an incorrect weight declaration cannot be claimed.</li>
        <li>Chargeable weight is volumetric or actual weight, whichever is higher (L x B x H / 5000).</li>
        <li>Delhivery 2 kg, 5 kg, and 10 kg accounts use a 4000 volumetric divisor.</li>
        <li>Reverse QC liability is limited to INR 2,000 or the product value, whichever is lower.</li>
      </ul>
    `,
  },
  b2b: {
    slug: 'rate_calculator_terms_b2b',
    label: 'B2B Terms & Conditions',
    title: 'Rate Calculator Terms & Conditions (B2B)',
    template: `
      <ul>
        <li>Above shared commercials are exclusive of GST.</li>
        <li>Pricing is subject to change when a courier company updates its commercials.</li>
        <li>Volumetric or dead weight, whichever is higher, will be charged.</li>
        <li>Other applicable charges, including address correction charges, will be charged extra.</li>
        <li>Prohibited items must not be shipped. Any resulting penalty will be charged to the seller.</li>
        <li>No claim will be entertained for glassware, fragile products, concealed damage, or improper packaging.</li>
        <li>A weight dispute caused by an incorrect weight declaration cannot be claimed.</li>
        <li>Chargeable weight is volumetric or actual weight, whichever is higher.</li>
        <li>Delhivery volumetric calculation: (L x B x H / 27000) x CFT.</li>
        <li>Delhivery B2B transporter ID: 06AAPCS9575E1ZR.</li>
      </ul>
    `,
  },
}

const createEditorState = (html) => {
  const blocks = convertFromHTML(html)
  const contentState = ContentState.createFromBlockArray(blocks.contentBlocks, blocks.entityMap)
  return EditorState.createWithContent(contentState)
}

function TermsEditorCard({ type, page, isLoading, content, editorState, error, onChange, onReset }) {
  const config = PAGE_CONFIG[type]
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const previewBg = useColorModeValue('gray.50', 'gray.900')

  return (
    <Box borderWidth="1px" borderColor={borderColor} borderRadius="xl" bg={useColorModeValue('white', 'gray.800')} p={5}>
      <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} gap={3} mb={4} direction={{ base: 'column', md: 'row' }}>
        <Box>
          <Heading size="sm">{config.label}</Heading>
          <Text mt={1} fontSize="sm" color="gray.500">
            Shown below calculated {type.toUpperCase()} courier rates.
          </Text>
        </Box>
        <HStack>
          {page?.updated_at ? (
            <Badge colorScheme="green">Updated {new Date(page.updated_at).toLocaleDateString()}</Badge>
          ) : (
            <Badge colorScheme="orange">Using template</Badge>
          )}
          <Button size="sm" variant="outline" leftIcon={<FiRefreshCcw />} onClick={onReset} isDisabled={isLoading}>
            Reset template
          </Button>
        </HStack>
      </Flex>

      <FormControl isRequired isInvalid={Boolean(error)}>
        <FormLabel fontSize="sm">Content</FormLabel>
        <Box border="1px solid" borderColor={borderColor} borderRadius="md" bg="white" color="gray.800">
          <Editor
            editorState={editorState}
            onEditorStateChange={onChange}
            toolbar={{
              options: ['inline', 'blockType', 'list', 'textAlign', 'link', 'history'],
              list: { inDropdown: false },
              textAlign: { inDropdown: true },
              link: { inDropdown: true },
            }}
            editorStyle={{ minHeight: '260px', padding: '12px 16px' }}
            placeholder={`Write ${type.toUpperCase()} rate calculator terms...`}
          />
        </Box>
        {error ? <FormErrorMessage>{error}</FormErrorMessage> : null}
      </FormControl>

      <Box mt={5} p={4} borderRadius="lg" bg={previewBg}>
        <Text fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="wide" color="gray.500" mb={2}>
          Live preview
        </Text>
        <Box
          fontSize="sm"
          sx={{
            '& p': { mb: 2, lineHeight: 1.7 },
            '& ul, & ol': { pl: 5 },
            '& li': { mb: 1.5, lineHeight: 1.6 },
            '& a': { color: 'blue.500', textDecoration: 'underline' },
          }}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </Box>
    </Box>
  )
}

export default function RateCalculatorTermsEditor() {
  const toast = useToast()
  const b2cPage = useStaticPage(PAGE_CONFIG.b2c.slug)
  const b2bPage = useStaticPage(PAGE_CONFIG.b2b.slug)
  const updateB2c = useUpdateStaticPage(PAGE_CONFIG.b2c.slug)
  const updateB2b = useUpdateStaticPage(PAGE_CONFIG.b2b.slug)
  const [b2cContent, setB2cContent] = useState(PAGE_CONFIG.b2c.template)
  const [b2bContent, setB2bContent] = useState(PAGE_CONFIG.b2b.template)
  const [b2cEditor, setB2cEditor] = useState(() => createEditorState(PAGE_CONFIG.b2c.template))
  const [b2bEditor, setB2bEditor] = useState(() => createEditorState(PAGE_CONFIG.b2b.template))
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (b2cPage.data?.content) {
      setB2cContent(b2cPage.data.content)
      setB2cEditor(createEditorState(b2cPage.data.content))
    }
  }, [b2cPage.data])

  useEffect(() => {
    if (b2bPage.data?.content) {
      setB2bContent(b2bPage.data.content)
      setB2bEditor(createEditorState(b2bPage.data.content))
    }
  }, [b2bPage.data])

  const updateEditor = (type, state) => {
    const html = draftToHtml(convertToRaw(state.getCurrentContent()))
    if (type === 'b2c') {
      setB2cEditor(state)
      setB2cContent(html)
    } else {
      setB2bEditor(state)
      setB2bContent(html)
    }
    setErrors((current) => ({ ...current, [type]: '' }))
  }

  const resetTemplate = (type) => {
    const template = PAGE_CONFIG[type].template
    if (type === 'b2c') {
      setB2cContent(template)
      setB2cEditor(createEditorState(template))
    } else {
      setB2bContent(template)
      setB2bEditor(createEditorState(template))
    }
  }

  const handleSave = async () => {
    const nextErrors = {
      b2c: b2cEditor.getCurrentContent().hasText() ? '' : 'B2C terms are required.',
      b2b: b2bEditor.getCurrentContent().hasText() ? '' : 'B2B terms are required.',
    }
    setErrors(nextErrors)
    if (nextErrors.b2c || nextErrors.b2b) return

    try {
      await Promise.all([
        updateB2c.mutateAsync({ title: PAGE_CONFIG.b2c.title, content: b2cContent }),
        updateB2b.mutateAsync({ title: PAGE_CONFIG.b2b.title, content: b2bContent }),
      ])
      toast({ title: 'Rate calculator terms saved', status: 'success', duration: 3000, isClosable: true })
    } catch (error) {
      toast({
        title: 'Failed to save terms',
        description: error?.response?.data?.message || error?.message || 'Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  const saving = updateB2c.isPending || updateB2b.isPending

  return (
    <Box pt={{ base: '120px', md: '75px' }} pb={10}>
      <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} gap={4} mb={6} direction={{ base: 'column', md: 'row' }}>
        <Box>
          <Heading size="md">Rate Calculator Terms & Conditions</Heading>
          <Text mt={2} color="gray.500">
            Edit the terms displayed below B2C and B2B calculated rates.
          </Text>
        </Box>
        <Button colorScheme="blue" leftIcon={<FiCheck />} onClick={handleSave} isLoading={saving} loadingText="Saving">
          Save all terms
        </Button>
      </Flex>

      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={6}>
        <TermsEditorCard
          type="b2c"
          page={b2cPage.data}
          isLoading={b2cPage.isLoading}
          content={b2cContent}
          editorState={b2cEditor}
          error={errors.b2c}
          onChange={(state) => updateEditor('b2c', state)}
          onReset={() => resetTemplate('b2c')}
        />
        <TermsEditorCard
          type="b2b"
          page={b2bPage.data}
          isLoading={b2bPage.isLoading}
          content={b2bContent}
          editorState={b2bEditor}
          error={errors.b2b}
          onChange={(state) => updateEditor('b2b', state)}
          onReset={() => resetTemplate('b2b')}
        />
      </SimpleGrid>
    </Box>
  )
}
