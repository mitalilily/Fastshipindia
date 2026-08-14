import {
  Badge,
  Box,
  Button,
  Divider,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Select,
  Spinner,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react'
import { IconMessageCircle, IconPaperclip, IconSend } from '@tabler/icons-react'
import {
  useAdminTicket,
  useAdminTicketMessages,
  useReplyToTicket,
  useUpdateTicket,
} from 'hooks/useTickets'
import moment from 'moment'
import { useEffect, useMemo, useState } from 'react'

const labelize = (value = '') =>
  String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())

const formatDate = (value) => (value ? moment(value).format('DD MMM YYYY, hh:mm A') : '—')

export default function AdminTicketDetailsDrawer({ isOpen, onClose, ticketId }) {
  const [reply, setReply] = useState('')
  const { data: ticket, isLoading: isTicketLoading } = useAdminTicket(ticketId)
  const { data: messages = [], isLoading: areMessagesLoading } =
    useAdminTicketMessages(ticketId)
  const replyMutation = useReplyToTicket()
  const updateMutation = useUpdateTicket()

  useEffect(() => {
    setReply('')
  }, [ticketId])

  const sellerName = useMemo(
    () =>
      ticket?.sellerCompanyInfo?.contactPerson ||
      ticket?.sellerCompanyInfo?.businessName ||
      ticket?.sellerEmail ||
      'Seller',
    [ticket],
  )

  const sendReply = async () => {
    const message = reply.trim()
    if (!message || !ticketId) return
    await replyMutation.mutateAsync({ ticketId, message })
    setReply('')
  }

  const updateStatus = (status) => {
    if (!ticketId || !status) return
    updateMutation.mutate({ ticketId, data: { status } })
  }

  return (
    <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="xl">
      <DrawerOverlay bg="blackAlpha.500" />
      <DrawerContent>
        <DrawerCloseButton top="18px" />
        <DrawerHeader borderBottomWidth="1px" pr="52px">
          <HStack spacing="10px">
            <Box color="#6C5CE7">
              <IconMessageCircle size={23} />
            </Box>
            <Box minW={0}>
              <Text fontSize="20px" noOfLines={1}>
                {ticket?.subject || 'Ticket details'}
              </Text>
              <Text fontSize="12px" color="#607397" fontWeight="500">
                {ticketId}
              </Text>
            </Box>
          </HStack>
        </DrawerHeader>

        <DrawerBody bg="#F8FAFD" py="20px">
          {isTicketLoading ? (
            <Flex minH="320px" align="center" justify="center">
              <Spinner color="#6C5CE7" />
            </Flex>
          ) : ticket ? (
            <Stack spacing="18px">
              <Box bg="white" border="1px solid #E5EAF3" borderRadius="14px" p="16px">
                <Flex gap="16px" justify="space-between" wrap="wrap">
                  <Box>
                    <Text fontSize="12px" color="#607397">Seller</Text>
                    <Text fontWeight="700">{sellerName}</Text>
                    <Text fontSize="13px" color="#607397">{ticket.sellerEmail || '—'}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="12px" color="#607397">Category</Text>
                    <Text fontWeight="700">{labelize(ticket.category)}</Text>
                    <Text fontSize="13px" color="#607397">{labelize(ticket.subcategory)}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="12px" color="#607397">AWB number</Text>
                    <Text fontWeight="700">{ticket.awbNumber || 'Not provided'}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="12px" color="#607397">Created</Text>
                    <Text fontWeight="700">{formatDate(ticket.createdAt)}</Text>
                  </Box>
                </Flex>

                <Divider my="14px" />

                <FormControl maxW="210px">
                  <FormLabel fontSize="12px" color="#607397" mb="5px">Ticket status</FormLabel>
                  <Select
                    size="sm"
                    value={ticket.status || 'open'}
                    onChange={(event) => updateStatus(event.target.value)}
                    isDisabled={updateMutation.isPending}
                    bg="white"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">Pending / In progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </Select>
                </FormControl>

                {ticket.attachments?.length ? (
                  <HStack mt="14px" spacing="8px" align="flex-start">
                    <IconPaperclip size={17} />
                    <Box>
                      <Text fontSize="12px" color="#607397">Attachments</Text>
                      {ticket.attachments.map((attachment) => (
                        <Text key={attachment} fontSize="13px" overflowWrap="anywhere">
                          {attachment}
                        </Text>
                      ))}
                    </Box>
                  </HStack>
                ) : null}
              </Box>

              <Box bg="white" border="1px solid #E5EAF3" borderRadius="14px" p="16px">
                <Text fontWeight="800" mb="14px">Conversation</Text>
                <Stack spacing="14px">
                  <Flex justify="flex-start">
                    <Box maxW="88%">
                      <HStack mb="5px">
                        <Text fontSize="12px" fontWeight="700">{sellerName}</Text>
                        <Badge colorScheme="gray" textTransform="none">Original issue</Badge>
                        <Text fontSize="11px" color="#8190A8">{formatDate(ticket.createdAt)}</Text>
                      </HStack>
                      <Box bg="#F1F4F9" borderRadius="4px 14px 14px 14px" px="14px" py="11px">
                        <Text whiteSpace="pre-wrap" overflowWrap="anywhere">
                          {ticket.description || 'No description provided.'}
                        </Text>
                      </Box>
                    </Box>
                  </Flex>

                  {areMessagesLoading ? (
                    <Flex justify="center" py="14px"><Spinner size="sm" /></Flex>
                  ) : (
                    messages.map((message) => {
                      const isAdmin = message.senderRole === 'admin'
                      const author = isAdmin
                        ? 'FastShip Support'
                        : message.senderCompanyInfo?.contactPerson || message.senderEmail || sellerName
                      return (
                        <Flex key={message.id} justify={isAdmin ? 'flex-end' : 'flex-start'}>
                          <Box maxW="88%">
                            <HStack mb="5px" justify={isAdmin ? 'flex-end' : 'flex-start'}>
                              <Text fontSize="12px" fontWeight="700">{author}</Text>
                              <Text fontSize="11px" color="#8190A8">{formatDate(message.createdAt)}</Text>
                            </HStack>
                            <Box
                              bg={isAdmin ? '#6C5CE7' : '#F1F4F9'}
                              color={isAdmin ? 'white' : '#0F172A'}
                              borderRadius={isAdmin ? '14px 4px 14px 14px' : '4px 14px 14px 14px'}
                              px="14px"
                              py="11px"
                            >
                              <Text whiteSpace="pre-wrap" overflowWrap="anywhere">{message.message}</Text>
                            </Box>
                          </Box>
                        </Flex>
                      )
                    })
                  )}

                  {!areMessagesLoading && messages.length === 0 ? (
                    <Text color="#8190A8" fontSize="13px" textAlign="center" py="8px">
                      No replies yet. Send the first response below.
                    </Text>
                  ) : null}
                </Stack>
              </Box>
            </Stack>
          ) : (
            <Text color="red.500">Ticket could not be loaded.</Text>
          )}
        </DrawerBody>

        <DrawerFooter borderTopWidth="1px" display="block" bg="white">
          <FormControl>
            <FormLabel fontSize="13px" mb="6px">Reply to seller</FormLabel>
            <Textarea
              value={reply}
              onChange={(event) => setReply(event.target.value.slice(0, 4000))}
              placeholder="Write a helpful reply about this issue..."
              resize="vertical"
              minH="92px"
              isDisabled={!ticket || replyMutation.isPending}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') sendReply()
              }}
            />
            <Flex justify="space-between" align="center" mt="8px" gap="12px">
              <Text fontSize="11px" color="#8190A8">Ctrl + Enter to send · {reply.length}/4000</Text>
              <Button
                leftIcon={<IconSend size={17} />}
                bg="#6C5CE7"
                color="white"
                _hover={{ bg: '#5B4BD5' }}
                onClick={sendReply}
                isLoading={replyMutation.isPending}
                isDisabled={!reply.trim() || !ticket}
              >
                Send reply
              </Button>
            </Flex>
          </FormControl>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
