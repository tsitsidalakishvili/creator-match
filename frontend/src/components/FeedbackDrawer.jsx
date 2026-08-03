import { Alert, Button, Drawer, Group, Stack, Text, TextInput, Textarea } from '@mantine/core'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../api.js'

const STATUS_TEXT = {
  sent: { color: 'green', text: 'Thanks! Your feedback was sent.' },
  failed: { color: 'red', text: 'Saved, but the email could not be sent.' },
  not_configured: { color: 'blue', text: 'Saved. (Email delivery is not configured on the server.)' },
}

export default function FeedbackDrawer({ opened, onClose }) {
  const location = useLocation()
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [status, setStatus] = useState(null)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setStatus(null)
    setError('')
    if (!form.message.trim()) {
      setError('Please write a message first.')
      return
    }
    setSending(true)
    try {
      const response = await api.sendFeedback({
        name: form.name.trim(),
        email: form.email.trim(),
        message: form.message.trim(),
        page: location.pathname,
        channel: 'sidebar_feedback',
      })
      setStatus(STATUS_TEXT[response?.email_status] || STATUS_TEXT.not_configured)
      setForm({ name: '', email: '', message: '' })
    } catch (err) {
      setError(err.message || 'Could not send feedback.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="md"
      title="Send feedback"
      transitionProps={{ duration: 0 }}
    >
      <form onSubmit={submit} aria-busy={sending}>
        <Stack>
          <Text size="sm" c="dimmed">
            Share what you were trying to do, what happened, and what you expected.
          </Text>
          <TextInput
            label="Name"
            placeholder="Jane Doe"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <TextInput
            label="Email"
            placeholder="jane@email.com"
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          />
          <Textarea
            label="Message"
            placeholder="Tell us what happened..."
            value={form.message}
            onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
            minRows={5}
            required
          />
          <Group justify="flex-end">
            <Button type="submit" loading={sending}>
              {sending ? 'Sending…' : 'Send feedback'}
            </Button>
          </Group>
          {error && <Alert color="red">{error}</Alert>}
          {status && <Alert color={status.color}>{status.text}</Alert>}
        </Stack>
      </form>
    </Drawer>
  )
}
