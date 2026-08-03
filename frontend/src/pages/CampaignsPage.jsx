import {
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Loader,
  Modal,
  MultiSelect,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconPlus } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { GEOS, NICHES, PLATFORMS } from '../constants.js'

const STATUS_COLORS = { draft: 'gray', active: 'teal', completed: 'blue' }

const emptyForm = {
  name: '',
  brand: '',
  description: '',
  objective: '',
  call_to_action: '',
  status: 'draft',
  niches: [],
  channels: [],
  target_geos: [],
  languages: [],
  target_age_min: 18,
  target_age_max: 44,
  budget_total: 0,
  budget_per_creator: 0,
  min_followers: 0,
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = () =>
    api
      .listCampaigns()
      .then(setCampaigns)
      .catch((e) => notifications.show({ color: 'red', title: 'API error', message: e.message }))

  useEffect(() => {
    load()
  }, [])

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  const save = async () => {
    if (!form.name) {
      notifications.show({ color: 'yellow', message: 'Campaign name is required' })
      return
    }
    setSaving(true)
    try {
      await api.createCampaign(form)
      notifications.show({ color: 'green', message: `Campaign "${form.name}" created` })
      setModalOpen(false)
      setForm(emptyForm)
      load()
    } catch (e) {
      notifications.show({ color: 'red', title: 'Could not save', message: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Campaigns</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setModalOpen(true)}>
          Create campaign
        </Button>
      </Group>

      {!campaigns ? (
        <Loader />
      ) : (
        <Grid>
          {campaigns.map((c) => (
            <Grid.Col key={c.id} span={{ base: 12, sm: 6, lg: 4 }}>
              <Card
                withBorder
                radius="md"
                padding="lg"
                component={Link}
                to={`/campaigns/${c.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <Group justify="space-between" mb="xs">
                  <Text fw={700}>{c.name}</Text>
                  <Badge color={STATUS_COLORS[c.status] || 'gray'} variant="light">
                    {c.status}
                  </Badge>
                </Group>
                <Text c="dimmed" size="sm" lineClamp={2}>
                  {c.description || 'No description'}
                </Text>
                <Group gap={4} mt="sm">
                  {c.niches.map((n) => (
                    <Badge key={n} size="xs" variant="light">
                      {n}
                    </Badge>
                  ))}
                </Group>
                <Group justify="space-between" mt="md">
                  <Text size="xs" c="dimmed">
                    {c.brand}
                  </Text>
                  <Text size="xs" c="dimmed">
                    ${c.budget_total.toLocaleString()} budget
                  </Text>
                </Group>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      )}

      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title="Create campaign" size="lg">
        <Stack gap="sm">
          <Group grow>
            <TextInput label="Name" required value={form.name} onChange={(e) => set('name')(e.currentTarget.value)} />
            <TextInput label="Brand" value={form.brand} onChange={(e) => set('brand')(e.currentTarget.value)} />
          </Group>
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => set('description')(e.currentTarget.value)}
          />
          <Group grow>
            <TextInput
              label="Objective"
              placeholder="e.g. 5,000 pre-orders"
              value={form.objective}
              onChange={(e) => set('objective')(e.currentTarget.value)}
            />
            <TextInput
              label="Call to action"
              value={form.call_to_action}
              onChange={(e) => set('call_to_action')(e.currentTarget.value)}
            />
          </Group>
          <Group grow>
            <Select
              label="Status"
              data={['draft', 'active', 'completed']}
              value={form.status}
              onChange={set('status')}
            />
            <MultiSelect label="Channels" data={PLATFORMS} value={form.channels} onChange={set('channels')} />
          </Group>
          <MultiSelect label="Niches" data={NICHES} value={form.niches} onChange={set('niches')} searchable />
          <MultiSelect
            label="Target geographies"
            data={GEOS}
            value={form.target_geos}
            onChange={set('target_geos')}
            searchable
          />
          <MultiSelect
            label="Languages (codes)"
            data={['en', 'ka', 'es', 'fr', 'de', 'it', 'ko', 'ur', 'da']}
            value={form.languages}
            onChange={set('languages')}
            searchable
          />
          <Group grow>
            <NumberInput label="Target age min" min={13} value={form.target_age_min} onChange={set('target_age_min')} />
            <NumberInput label="Target age max" min={13} value={form.target_age_max} onChange={set('target_age_max')} />
          </Group>
          <Group grow>
            <NumberInput label="Total budget ($)" min={0} value={form.budget_total} onChange={set('budget_total')} />
            <NumberInput
              label="Budget per creator ($)"
              min={0}
              value={form.budget_per_creator}
              onChange={set('budget_per_creator')}
            />
            <NumberInput label="Min followers" min={0} value={form.min_followers} onChange={set('min_followers')} />
          </Group>
          <Button onClick={save} loading={saving}>
            Create campaign
          </Button>
        </Stack>
      </Modal>
    </Stack>
  )
}
