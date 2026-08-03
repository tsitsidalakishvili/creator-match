import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  MultiSelect,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconPlus, IconSearch, IconTrash } from '@tabler/icons-react'
import { useCallback, useEffect, useState } from 'react'
import { api } from '../api.js'
import { NICHES, PLATFORMS } from '../constants.js'

const emptyForm = {
  name: '',
  handle: '',
  bio: '',
  platforms: [],
  niches: [],
  languages: [],
  country: '',
  city: '',
  followers: 0,
  engagement_rate: 0,
  avg_views: 0,
  rate_per_post: 0,
  audience_age_min: 18,
  audience_age_max: 44,
  audience_top_geos: [],
}

export default function CreatorsPage() {
  const [creators, setCreators] = useState(null)
  const [search, setSearch] = useState('')
  const [niche, setNiche] = useState(null)
  const [platform, setPlatform] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    api
      .listCreators({ search, niche, platform })
      .then(setCreators)
      .catch((e) => notifications.show({ color: 'red', title: 'API error', message: e.message }))
  }, [search, niche, platform])

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  const save = async () => {
    if (!form.name || !form.handle) {
      notifications.show({ color: 'yellow', message: 'Name and handle are required' })
      return
    }
    setSaving(true)
    try {
      await api.createCreator({
        ...form,
        languages: form.languages,
        audience_top_geos: form.audience_top_geos,
      })
      notifications.show({ color: 'green', message: `${form.name} added` })
      setModalOpen(false)
      setForm(emptyForm)
      load()
    } catch (e) {
      notifications.show({ color: 'red', title: 'Could not save', message: e.message })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (creator) => {
    if (!window.confirm(`Delete ${creator.name}?`)) return
    await api.deleteCreator(creator.id)
    load()
  }

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Creators</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setModalOpen(true)}>
          Add creator
        </Button>
      </Group>

      <Group>
        <TextInput
          placeholder="Search name, handle, bio…"
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          w={260}
        />
        <Select placeholder="Niche" data={NICHES} value={niche} onChange={setNiche} clearable w={170} />
        <Select
          placeholder="Platform"
          data={PLATFORMS}
          value={platform}
          onChange={setPlatform}
          clearable
          w={170}
        />
      </Group>

      {!creators ? (
        <Loader />
      ) : (
        <Card withBorder radius="md" padding={0}>
          <Table.ScrollContainer minWidth={860}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Creator</Table.Th>
                  <Table.Th>Niches</Table.Th>
                  <Table.Th>Platforms</Table.Th>
                  <Table.Th>Followers</Table.Th>
                  <Table.Th>Engagement</Table.Th>
                  <Table.Th>Rate</Table.Th>
                  <Table.Th>Country</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {creators.map((c) => (
                  <Table.Tr key={c.id}>
                    <Table.Td>
                      <Text fw={600} size="sm">
                        {c.name}
                      </Text>
                      <Text c="dimmed" size="xs">
                        {c.handle}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        {c.niches.map((n) => (
                          <Badge key={n} size="xs" variant="light">
                            {n}
                          </Badge>
                        ))}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        {c.platforms.map((p) => (
                          <Badge key={p} size="xs" variant="outline" color="gray">
                            {p}
                          </Badge>
                        ))}
                      </Group>
                    </Table.Td>
                    <Table.Td>{c.followers.toLocaleString()}</Table.Td>
                    <Table.Td>{c.engagement_rate}%</Table.Td>
                    <Table.Td>${c.rate_per_post.toLocaleString()}</Table.Td>
                    <Table.Td>{c.country}</Table.Td>
                    <Table.Td>
                      <ActionIcon variant="subtle" color="red" onClick={() => remove(c)}>
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>
      )}

      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title="Add creator" size="lg">
        <Stack gap="sm">
          <Group grow>
            <TextInput label="Name" required value={form.name} onChange={(e) => set('name')(e.currentTarget.value)} />
            <TextInput
              label="Handle"
              required
              placeholder="@handle"
              value={form.handle}
              onChange={(e) => set('handle')(e.currentTarget.value)}
            />
          </Group>
          <Textarea label="Bio" value={form.bio} onChange={(e) => set('bio')(e.currentTarget.value)} />
          <Group grow>
            <MultiSelect label="Platforms" data={PLATFORMS} value={form.platforms} onChange={set('platforms')} />
            <MultiSelect label="Niches" data={NICHES} value={form.niches} onChange={set('niches')} searchable />
          </Group>
          <Group grow>
            <TextInput label="Country" value={form.country} onChange={(e) => set('country')(e.currentTarget.value)} />
            <TextInput label="City" value={form.city} onChange={(e) => set('city')(e.currentTarget.value)} />
          </Group>
          <MultiSelect
            label="Languages (codes)"
            data={['en', 'ka', 'es', 'fr', 'de', 'it', 'ko', 'ur', 'da']}
            value={form.languages}
            onChange={set('languages')}
            searchable
          />
          <MultiSelect
            label="Audience top geographies"
            data={[
              'Georgia', 'USA', 'Germany', 'France', 'Italy', 'Denmark', 'UK', 'Spain', 'Mexico',
              'Turkey', 'Armenia', 'Ukraine', 'Pakistan', 'India', 'South Korea', 'Japan', 'Canada',
            ]}
            value={form.audience_top_geos}
            onChange={set('audience_top_geos')}
            searchable
          />
          <Group grow>
            <NumberInput label="Followers" min={0} value={form.followers} onChange={set('followers')} />
            <NumberInput
              label="Engagement rate %"
              min={0}
              max={100}
              step={0.1}
              value={form.engagement_rate}
              onChange={set('engagement_rate')}
            />
            <NumberInput label="Rate per post ($)" min={0} value={form.rate_per_post} onChange={set('rate_per_post')} />
          </Group>
          <Group grow>
            <NumberInput label="Audience age min" min={13} value={form.audience_age_min} onChange={set('audience_age_min')} />
            <NumberInput label="Audience age max" min={13} value={form.audience_age_max} onChange={set('audience_age_max')} />
          </Group>
          <Button onClick={save} loading={saving}>
            Save creator
          </Button>
        </Stack>
      </Modal>
    </Stack>
  )
}
