import {
  Alert,
  Autocomplete,
  Badge,
  Box,
  Button,
  Card,
  Code,
  Collapse,
  Group,
  Loader,
  PasswordInput,
  ScrollArea,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Title,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconCheck,
  IconFileSpreadsheet,
  IconPlugConnected,
  IconSparkles,
  IconUpload,
  IconX,
} from '@tabler/icons-react'
import Papa from 'papaparse'
import { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import RunResults from '../components/RunResults.jsx'
import { useRoster } from '../rosterStore.jsx'
import { formatCompact, inferNiche, matchCreators } from '../talentMatchData'

const PLATFORMS = ['Instagram Feed', 'Instagram Story', 'Facebook Post', 'TikTok']
const OBJECTIVES = ['Drive Store Visits', 'New Collection Launch', 'Promotion', 'Brand Awareness']

const MODEL_SUGGESTIONS = {
  anthropic: ['claude-opus-4-8', 'claude-sonnet-5', 'claude-haiku-4-5'],
  openai: ['gpt-5.1', 'gpt-5', 'gpt-4.1', 'gpt-4o'],
  local: ['qwen/qwen3-4b', 'llama3.1', 'mistral'],
}

const AGENTS = [
  { key: 'strategy', label: '🎯 Strategy Agent' },
  { key: 'copy', label: '✍️ Copy — EN + Georgian' },
  { key: 'visual', label: '🔥 Visual Brief' },
  { key: 'audit', label: '🔍 Brand Audit' },
]

const STATUS_META = {
  running: { color: 'blue', label: 'Running' },
  awaiting_approval: { color: 'yellow', label: 'Awaiting approval' },
  approved: { color: 'green', label: 'Approved' },
  rejected: { color: 'red', label: 'Rejected' },
  failed: { color: 'red', label: 'Failed' },
}

function AgentRow({ agent, run }) {
  const done = run?.outputs?.[agent.key] != null
  const order = AGENTS.findIndex((a) => a.key === agent.key)
  const firstPending = AGENTS.findIndex((a) => !run?.outputs?.[a.key])
  const active = run?.status === 'running' && order === firstPending
  return (
    <Group
      gap="xs"
      p={8}
      style={{
        borderRadius: 8,
        border: '1px solid var(--mantine-color-default-border)',
        background: done
          ? 'var(--mantine-color-green-light)'
          : active
            ? 'var(--mantine-color-blue-light)'
            : undefined,
      }}
    >
      {active ? <Loader size={14} /> : done ? <IconCheck size={16} color="var(--mantine-color-green-6)" /> : <Box w={16} />}
      <Text size="sm" fw={done || active ? 600 : 400} c={done ? 'green' : active ? 'blue' : 'dimmed'}>
        {agent.label}
      </Text>
    </Group>
  )
}

function Connectors({ brandId, brandName }) {
  const [datasets, setDatasets] = useState([])
  const [igOpen, setIgOpen] = useState(false)
  const [apifyToken, setApifyToken] = useState('')
  const [igHandle, setIgHandle] = useState('')
  const [igLoading, setIgLoading] = useState(false)
  const fileRef = useRef(null)

  const load = () => brandId && api.listDatasets(brandId).then(setDatasets).catch(() => {})
  useEffect(() => { load() }, [brandId]) // eslint-disable-line react-hooks/exhaustive-deps

  const bySource = (source) => datasets.filter((d) => d.source === source)

  const handleFile = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        if (!result.data.length) return
        const name = file.name.toLowerCase()
        const source = name.includes('face') || name.includes('fb') ? 'facebook'
          : name.includes('insta') || name.includes('ig') ? 'instagram'
            : name.includes('linked') ? 'linkedin' : 'csv'
        try {
          await api.uploadDataset(brandId, {
            source, filename: file.name,
            columns: result.meta.fields || Object.keys(result.data[0]),
            rows: result.data,
          })
          notifications.show({ color: 'green', message: `Imported ${result.data.length} rows.` })
          load()
        } catch (e) {
          notifications.show({ color: 'red', title: 'Upload failed', message: e.message })
        }
      },
    })
    event.target.value = ''
  }

  const connectInstagram = async () => {
    if (!apifyToken.trim() || !igHandle.trim()) {
      notifications.show({ color: 'yellow', message: 'Apify token and Instagram handle are required.' })
      return
    }
    setIgLoading(true)
    try {
      const ds = await api.connectInstagram(brandId, {
        apify_token: apifyToken.trim(),
        handle: igHandle.trim(),
        results_limit: 30,
      })
      notifications.show({ color: 'green', message: `Pulled ${ds.row_count} posts from @${igHandle.replace('@', '')}.` })
      setIgOpen(false)
      load()
    } catch (e) {
      notifications.show({ color: 'red', title: 'Instagram connect failed', message: e.message })
    } finally {
      setIgLoading(false)
    }
  }

  const rows = [
    { source: 'instagram', label: 'Instagram', icon: IconBrandInstagram, color: 'grape', action: 'apify' },
    { source: 'facebook', label: 'Facebook / Meta', icon: IconBrandFacebook, color: 'blue', action: 'soon' },
    { source: 'linkedin', label: 'LinkedIn', icon: IconBrandLinkedin, color: 'cyan', action: 'csv' },
    { source: 'csv', label: 'CSV / Excel export', icon: IconFileSpreadsheet, color: 'teal', action: 'csv' },
  ]

  return (
    <Card withBorder radius="lg" padding="lg">
      <Group gap="xs" mb="xs">
        <IconPlugConnected size={16} />
        <Text fw={700} size="sm">Data connectors — {brandName}</Text>
      </Group>
      <Text size="xs" c="dimmed" mb="sm">
        Connected data grounds the strategist in the client's real performance.
      </Text>
      <Stack gap={6}>
        {rows.map((r) => {
          const connected = bySource(r.source)
          return (
            <Group key={r.source} justify="space-between" gap="xs">
              <Group gap={8}>
                <ThemeIcon variant="light" color={r.color} size="sm" radius="xl">
                  <r.icon size={14} />
                </ThemeIcon>
                <Text size="sm">{r.label}</Text>
                {connected.length > 0 && (
                  <Badge size="xs" variant="light" color="green">
                    {connected.reduce((s, d) => s + d.row_count, 0)} rows
                  </Badge>
                )}
              </Group>
              {r.action === 'apify' && (
                <Button size="compact-xs" variant="light" onClick={() => setIgOpen((v) => !v)}>
                  Connect via Apify
                </Button>
              )}
              {r.action === 'csv' && (
                <Button size="compact-xs" variant="light" leftSection={<IconUpload size={12} />}
                  onClick={() => fileRef.current?.click()}>
                  Upload CSV
                </Button>
              )}
              {r.action === 'soon' && (
                <Badge size="xs" variant="outline" color="gray">API soon — use CSV</Badge>
              )}
            </Group>
          )
        })}
      </Stack>
      <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleFile} />
      <Collapse in={igOpen}>
        <Stack gap="xs" mt="sm" p="sm" style={{ border: '1px dashed var(--mantine-color-default-border)', borderRadius: 8 }}>
          <Text size="xs" c="dimmed">
            Uses Apify's Instagram Scraper (~$1.50 per 1,000 posts; free plan includes $5/month).
            The token is used for this request only and never stored.
          </Text>
          <Group grow>
            <PasswordInput size="xs" label="Apify token" placeholder="apify_api_..." value={apifyToken}
              onChange={(e) => setApifyToken(e.currentTarget.value)} />
            <TextInput size="xs" label="Instagram handle" placeholder="@brandname" value={igHandle}
              onChange={(e) => setIgHandle(e.currentTarget.value)} />
          </Group>
          <Button size="xs" loading={igLoading} onClick={connectInstagram}>
            Pull last 30 posts
          </Button>
        </Stack>
      </Collapse>
    </Card>
  )
}

export default function StudioPage() {
  const { roster } = useRoster()
  const [brands, setBrands] = useState([])
  const [config, setConfig] = useState(null)
  const [brandId, setBrandId] = useState(null)
  const [brief, setBrief] = useState('')
  const [platform, setPlatform] = useState(PLATFORMS[0])
  const [objective, setObjective] = useState(OBJECTIVES[3])
  const [provider, setProvider] = useState('anthropic')
  const [model, setModel] = useState('claude-opus-4-8')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('http://127.0.0.1:1234/v1')
  const [run, setRun] = useState(null)
  const [starting, setStarting] = useState(false)
  const pollRef = useRef(null)

  useEffect(() => {
    api.listBrands().then((b) => {
      setBrands(b)
      if (b.length) setBrandId((prev) => prev || String(b[0].id))
    }).catch(() => {})
    api.pipelineConfig().then(setConfig).catch(() => {})
    return () => clearInterval(pollRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const changeProvider = (p) => {
    setProvider(p)
    setModel(config?.default_models?.[p] || MODEL_SUGGESTIONS[p][0])
    setApiKey('')
  }

  const serverHasKey = config?.server_keys?.[provider]
  const needsKey = provider !== 'local' && !serverHasKey
  const keyValid = provider === 'anthropic' ? apiKey.trim().startsWith('sk-ant') : apiKey.trim().length > 10
  const canRun = provider === 'local' ? baseUrl.trim().length > 0 : (!needsKey || keyValid)

  const poll = (id) => {
    clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const r = await api.getRun(id)
        setRun(r)
        if (r.status !== 'running') clearInterval(pollRef.current)
      } catch {
        clearInterval(pollRef.current)
      }
    }, 2500)
  }

  const startPipeline = async () => {
    if (!brandId || !brief.trim()) {
      notifications.show({ color: 'yellow', message: 'Pick a client and write a brief first.' })
      return
    }
    setStarting(true)
    try {
      const niche = inferNiche(brief)
      const suggested = matchCreators(roster, niche, brief, 3).map((c) => ({
        name: c.name, niche: c.niche, reach: formatCompact(c.total), score: c.score,
      }))
      const created = await api.createRun({
        brand_id: Number(brandId), brief, platform, objective,
        suggested_messengers: suggested,
        provider, model: model.trim(),
        base_url: provider === 'local' ? baseUrl.trim() : undefined,
        api_key: apiKey.trim() || undefined,
      })
      setRun(created)
      poll(created.id)
    } catch (e) {
      notifications.show({ color: 'red', title: 'Could not start pipeline', message: e.message })
    } finally {
      setStarting(false)
    }
  }

  const decide = async (decision) => {
    try {
      const updated = await api.decideRun(run.id, decision)
      setRun(updated)
      notifications.show({
        color: decision === 'approved' ? 'green' : 'red',
        message: decision === 'approved'
          ? "Approved — the creation now shows on the client's page."
          : 'Rejected — adjust the brief and run again.',
      })
    } catch (e) {
      notifications.show({ color: 'red', message: e.message })
    }
  }

  const brand = brands.find((b) => String(b.id) === brandId)
  const statusMeta = run ? STATUS_META[run.status] : null

  return (
    <Stack gap="lg">
      <Box>
        <Title order={2}>Studio</Title>
        <Text c="dimmed" size="sm">
          Your AI marketing team: connect client data, send a brief, and the agent pipeline
          produces strategy, bilingual copy, visual prompts, and a brand audit — approved
          creations appear on the client's page.
        </Text>
      </Box>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Stack gap="sm">
          <Card withBorder radius="lg" padding="lg">
            <Stack gap="sm">
              <Select
                label="Client"
                data={brands.map((b) => ({ value: String(b.id), label: `${b.emoji} ${b.name} — ${b.description}` }))}
                value={brandId}
                onChange={setBrandId}
                allowDeselect={false}
              />
              <Textarea
                label="Campaign brief"
                placeholder="e.g. Summer collection launch June 15. Lightweight fabrics, effortless style. Drive store visits and Instagram engagement."
                minRows={3}
                autosize
                value={brief}
                onChange={(e) => setBrief(e.currentTarget.value)}
              />
              <Group grow>
                <Select label="Platform" data={PLATFORMS} value={platform} onChange={(v) => v && setPlatform(v)} allowDeselect={false} />
                <Select label="Objective" data={OBJECTIVES} value={objective} onChange={(v) => v && setObjective(v)} allowDeselect={false} />
              </Group>

              <Box>
                <Text size="sm" fw={500} mb={4}>AI model</Text>
                <SegmentedControl
                  fullWidth
                  size="xs"
                  value={provider}
                  onChange={changeProvider}
                  data={[
                    { value: 'anthropic', label: 'Claude' },
                    { value: 'openai', label: 'OpenAI' },
                    { value: 'local', label: 'Local' },
                  ]}
                />
              </Box>
              <Group grow align="flex-end">
                <Autocomplete
                  label="Model"
                  data={MODEL_SUGGESTIONS[provider]}
                  value={model}
                  onChange={setModel}
                />
                {provider === 'local' ? (
                  <TextInput
                    label="Server URL"
                    placeholder="http://127.0.0.1:1234/v1"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.currentTarget.value)}
                  />
                ) : needsKey ? (
                  <PasswordInput
                    label={provider === 'anthropic' ? 'Anthropic API key' : 'OpenAI API key'}
                    placeholder={provider === 'anthropic' ? 'sk-ant-api03-...' : 'sk-...'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.currentTarget.value)}
                  />
                ) : (
                  <TextInput label="API key" value="Configured on server" disabled />
                )}
              </Group>
              {provider === 'local' && (
                <Text size="xs" c="dimmed">
                  Works when the backend runs on the same machine as your LM Studio / Ollama
                  server (OpenAI-compatible endpoint). Keys are never stored either way.
                </Text>
              )}
              <Button
                size="md"
                variant="gradient"
                gradient={{ from: 'violet', to: 'cyan' }}
                leftSection={<IconSparkles size={18} />}
                onClick={startPipeline}
                loading={starting || run?.status === 'running'}
                disabled={!canRun}
              >
                {run?.status === 'running' ? 'Pipeline running…' : 'Run pipeline'}
              </Button>
            </Stack>
          </Card>

          {brand && <Connectors brandId={Number(brandId)} brandName={brand.name} />}

          {run && (
            <Card withBorder radius="lg" padding="lg">
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <Text fw={700} size="sm">Agent progress</Text>
                  <Badge size="xs" variant="outline" color="gray">{run.provider} · {run.model}</Badge>
                </Group>
                {statusMeta && <Badge color={statusMeta.color} variant="light">{statusMeta.label}</Badge>}
              </Group>
              <Stack gap={6}>
                {AGENTS.map((a) => <AgentRow key={a.key} agent={a} run={run} />)}
              </Stack>
              {run.suggested_messengers?.length > 0 && (
                <Text size="xs" c="dimmed" mt="sm">
                  Roster context sent to the strategist:{' '}
                  {run.suggested_messengers.map((m) => `${m.name} (${m.reach})`).join(', ')}
                </Text>
              )}
            </Card>
          )}

          {run?.logs?.length > 0 && (
            <Card withBorder radius="lg" padding="md" bg="dark.8">
              <ScrollArea.Autosize mah={180}>
                <Stack gap={2}>
                  {run.logs.map((l, i) => (
                    <Code key={i} block bg="transparent" c={
                      l.type === 'ok' ? 'green.4' : l.type === 'warn' ? 'yellow.4' : l.type === 'err' ? 'red.4' : l.type === 'info' ? 'cyan.4' : 'gray.5'
                    } style={{ padding: 0, fontSize: 11 }}>
                      {l.t}  {l.msg}
                    </Code>
                  ))}
                </Stack>
              </ScrollArea.Autosize>
            </Card>
          )}
        </Stack>

        <Stack gap="sm">
          {!run ? (
            <Card withBorder radius="lg" padding="xl">
              <Stack align="center" gap="xs" py="lg">
                <ThemeIcon size={56} radius="xl" variant="light" color="violet">
                  <IconSparkles size={30} />
                </ThemeIcon>
                <Text fw={600}>No run yet</Text>
                <Text c="dimmed" size="sm" ta="center" maw={400}>
                  Pick a client, connect data, write a brief, and run the pipeline. Results appear
                  here as each agent finishes.
                </Text>
              </Stack>
            </Card>
          ) : (
            <>
              {run.status === 'failed' && (
                <Alert color="red" title="Pipeline failed">{run.error}</Alert>
              )}
              <RunResults run={run} />
              {run.status === 'awaiting_approval' && (
                <Card withBorder radius="lg" padding="lg" style={{ borderColor: 'var(--mantine-color-violet-4)' }}>
                  <Text fw={700} mb={4}>✅ Human approval gate</Text>
                  <Text size="sm" c="dimmed" mb="sm">
                    Review the output above. Approved creations appear on the client's page;
                    rejecting archives the run.
                  </Text>
                  <Group grow>
                    <Button color="green" leftSection={<IconCheck size={16} />} onClick={() => decide('approved')}>
                      Approve & deliver
                    </Button>
                    <Button variant="light" color="red" leftSection={<IconX size={16} />} onClick={() => decide('rejected')}>
                      Reject
                    </Button>
                  </Group>
                </Card>
              )}
            </>
          )}
        </Stack>
      </SimpleGrid>
    </Stack>
  )
}
