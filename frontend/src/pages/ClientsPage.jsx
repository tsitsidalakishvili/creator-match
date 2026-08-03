import {
  Badge,
  Box,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconDatabase, IconPencil, IconPlus, IconTrash, IconUpload } from '@tabler/icons-react'
import Papa from 'papaparse'
import { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'

function DataSection({ brand }) {
  const [datasets, setDatasets] = useState([])
  const fileRef = useRef(null)

  const load = () => api.listDatasets(brand.id).then(setDatasets).catch(() => {})
  useEffect(() => { load() }, [brand.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const detectSource = (name) => {
    const n = name.toLowerCase()
    if (n.includes('face') || n.includes('fb')) return 'facebook'
    if (n.includes('insta') || n.includes('ig')) return 'instagram'
    if (n.includes('linked')) return 'linkedin'
    return 'csv'
  }

  const handleFile = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        const rows = result.data
        if (!rows.length) {
          notifications.show({ color: 'red', message: 'No rows found in the file.' })
          return
        }
        try {
          await api.uploadDataset(brand.id, {
            source: detectSource(file.name),
            filename: file.name,
            columns: result.meta.fields || Object.keys(rows[0]),
            rows,
          })
          notifications.show({ color: 'green', message: `Imported ${rows.length} rows for ${brand.name}.` })
          load()
        } catch (e) {
          notifications.show({ color: 'red', title: 'Upload failed', message: e.message })
        }
      },
      error: (err) => notifications.show({ color: 'red', title: 'Parse failed', message: err.message }),
    })
    event.target.value = ''
  }

  return (
    <Box mt="sm">
      <Group justify="space-between" mb={4}>
        <Group gap={4}>
          <IconDatabase size={14} color="var(--mantine-color-dimmed)" />
          <Text size="xs" c="dimmed" fw={600} tt="uppercase">Page data</Text>
        </Group>
        <Button variant="subtle" size="compact-xs" leftSection={<IconUpload size={12} />}
          onClick={() => fileRef.current?.click()}>
          Upload CSV
        </Button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleFile} />
      </Group>
      {datasets.length === 0 ? (
        <Text size="xs" c="dimmed">
          No data yet — export post/page stats from Meta Business Suite or LinkedIn as CSV and
          upload. The strategist grounds campaigns in it.
        </Text>
      ) : (
        <Stack gap={4}>
          {datasets.map((d) => (
            <Group key={d.id} justify="space-between" gap="xs">
              <Badge size="xs" variant="light" color="cyan" style={{ textTransform: 'none' }}>
                {d.source} · {d.filename} · {d.row_count} rows
              </Badge>
              <Button variant="subtle" color="red" size="compact-xs"
                onClick={() => api.deleteDataset(brand.id, d.id).then(load)}>
                <IconTrash size={12} />
              </Button>
            </Group>
          ))}
        </Stack>
      )}
    </Box>
  )
}

const FIELDS = [
  ['name', 'Name'],
  ['emoji', 'Emoji'],
  ['description', 'Industry / description'],
  ['tone', 'Tone'],
  ['audience', 'Audience'],
  ['key_message', 'Key message'],
  ['georgian_tagline', 'Georgian tagline'],
  ['visual_style', 'Visual style'],
  ['color_palette', 'Color palette'],
]

const empty = Object.fromEntries(FIELDS.map(([k]) => [k, '']))

export default function ClientsPage() {
  const [brands, setBrands] = useState(null)
  const [editing, setEditing] = useState(null) // brand object or 'new'
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  const load = () => api.listBrands().then(setBrands).catch((e) =>
    notifications.show({ color: 'red', title: 'API error', message: e.message }))

  useEffect(() => { load() }, [])

  const openEdit = (brand) => {
    setForm(brand === 'new' ? { ...empty, emoji: '✨' } : { ...brand })
    setEditing(brand)
  }

  const save = async () => {
    if (!form.name.trim()) {
      notifications.show({ color: 'yellow', message: 'Name is required' })
      return
    }
    setSaving(true)
    try {
      if (editing === 'new') await api.createBrand(form)
      else await api.updateBrand(editing.id, form)
      notifications.show({ color: 'green', message: 'Client saved' })
      setEditing(null)
      load()
    } catch (e) {
      notifications.show({ color: 'red', title: 'Could not save', message: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <Box>
          <Title order={2}>Clients</Title>
          <Text c="dimmed" size="sm">
            Each client has a Brand DNA profile — every pipeline agent reads it on every run, so
            campaigns stay on-brand automatically.
          </Text>
        </Box>
        <Button leftSection={<IconPlus size={16} />} onClick={() => openEdit('new')}>
          Add client
        </Button>
      </Group>

      {!brands ? (
        <Loader />
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {brands.map((b) => (
            <Card key={b.id} withBorder radius="lg" padding="lg"
              style={{ borderTop: '3px solid var(--mantine-color-violet-5)' }}>
              <Group justify="space-between" mb="sm">
                <Group gap="xs">
                  <Text fz={24}>{b.emoji}</Text>
                  <Box>
                    <Text fw={700}>{b.name}</Text>
                    <Text size="xs" c="dimmed">{b.description}</Text>
                  </Box>
                </Group>
                <Badge size="xs" variant="light" color="green">Live</Badge>
              </Group>
              <Stack gap={6}>
                {[['Tone', b.tone], ['Audience', b.audience], ['Key message', b.key_message],
                  ['Georgian tagline', b.georgian_tagline], ['Visual style', b.visual_style],
                  ['Colors', b.color_palette]].map(([label, value]) => (
                  <Box key={label}>
                    <Text size="xs" c="dimmed" fw={600} tt="uppercase">{label}</Text>
                    <Text size="sm">{value || '—'}</Text>
                  </Box>
                ))}
              </Stack>
              <DataSection brand={b} />
              <Button
                variant="light" size="xs" mt="md" fullWidth
                leftSection={<IconPencil size={14} />}
                onClick={() => openEdit(b)}
              >
                Edit DNA
              </Button>
            </Card>
          ))}
        </SimpleGrid>
      )}

      <Modal
        opened={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Add client' : `Edit ${form.name}`}
        size="lg"
      >
        <Stack gap="sm">
          {FIELDS.map(([key, label]) =>
            key === 'tone' || key === 'visual_style' ? (
              <Textarea key={key} label={label} autosize minRows={1}
                value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.currentTarget.value })} />
            ) : (
              <TextInput key={key} label={label}
                value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.currentTarget.value })} />
            ),
          )}
          <Button onClick={save} loading={saving}>Save client</Button>
        </Stack>
      </Modal>
    </Stack>
  )
}
