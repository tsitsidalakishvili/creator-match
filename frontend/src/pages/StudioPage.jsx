import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Code,
  Group,
  Loader,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
  Title,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconCheck, IconInfoCircle, IconSparkles, IconX } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import { useRoster } from '../rosterStore.jsx'
import { formatCompact, inferNiche, matchCreators } from '../talentMatchData'

const PLATFORMS = ['Instagram Feed', 'Instagram Story', 'Facebook Post', 'TikTok']
const OBJECTIVES = ['Drive Store Visits', 'New Collection Launch', 'Promotion', 'Brand Awareness']

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

function Results({ run }) {
  const { outputs } = run
  if (!outputs || Object.keys(outputs).length === 0) return null
  const copy = outputs.copy
  return (
    <Stack gap="sm">
      {outputs.strategy && (
        <Card withBorder radius="lg" padding="md">
          <Text fw={700} size="sm" mb={6}>🎯 Strategy</Text>
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{outputs.strategy}</Text>
        </Card>
      )}
      {copy && (
        <Card withBorder radius="lg" padding="md">
          <Text fw={700} size="sm" mb={6}>✍️ Copy — EN + Georgian</Text>
          {copy.raw ? (
            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{copy.raw}</Text>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <Box>
                <Text size="xs" c="dimmed" fw={600}>🇬🇧 ENGLISH</Text>
                <Text fw={700} size="sm">{copy.en_headline}</Text>
                <Text size="sm" mt={4} style={{ whiteSpace: 'pre-wrap' }}>{copy.en_caption}</Text>
                <Text size="sm" mt={4} c="dimmed">→ {copy.en_cta}</Text>
              </Box>
              <Box>
                <Text size="xs" c="dimmed" fw={600}>🇬🇪 GEORGIAN</Text>
                <Text fw={700} size="sm">{copy.geo_headline}</Text>
                <Text size="sm" mt={4} style={{ whiteSpace: 'pre-wrap' }}>{copy.geo_caption}</Text>
                <Text size="sm" mt={4} c="dimmed">→ {copy.geo_cta}</Text>
              </Box>
            </SimpleGrid>
          )}
        </Card>
      )}
      {outputs.visual && (
        <Card withBorder radius="lg" padding="md">
          <Text fw={700} size="sm" mb={6}>🔥 Visual Brief — image prompts</Text>
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{outputs.visual}</Text>
        </Card>
      )}
      {outputs.audit && (
        <Card withBorder radius="lg" padding="md">
          <Text fw={700} size="sm" mb={6}>🔍 Brand Audit</Text>
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{outputs.audit}</Text>
        </Card>
      )}
    </Stack>
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
  const [run, setRun] = useState(null)
  const [starting, setStarting] = useState(false)
  const pollRef = useRef(null)

  useEffect(() => {
    api.listBrands().then((b) => {
      setBrands(b)
      if (b.length && !brandId) setBrandId(String(b[0].id))
    }).catch(() => {})
    api.pipelineConfig().then(setConfig).catch(() => {})
    return () => clearInterval(pollRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
          ? 'Approved — assets are ready to deliver to the client.'
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
          Your AI marketing team: send a brief for a client, and the agent pipeline produces
          strategy, bilingual copy, visual prompts, and a brand audit — with a human approval gate.
        </Text>
      </Box>

      {config && !config.api_key_configured && (
        <Alert color="yellow" icon={<IconInfoCircle size={16} />}>
          The server has no ANTHROPIC_API_KEY configured — pipeline runs are disabled until it is
          set in the Render dashboard (Environment → Add ANTHROPIC_API_KEY).
        </Alert>
      )}

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
              {brand && (
                <Text size="xs" c="dimmed">
                  Tone: {brand.tone} · Audience: {brand.audience}
                </Text>
              )}
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
              <Button
                size="md"
                variant="gradient"
                gradient={{ from: 'violet', to: 'cyan' }}
                leftSection={<IconSparkles size={18} />}
                onClick={startPipeline}
                loading={starting || run?.status === 'running'}
                disabled={config && !config.api_key_configured}
              >
                {run?.status === 'running' ? 'Pipeline running…' : 'Run pipeline'}
              </Button>
            </Stack>
          </Card>

          {run && (
            <Card withBorder radius="lg" padding="lg">
              <Group justify="space-between" mb="xs">
                <Text fw={700} size="sm">Agent progress</Text>
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
                  Pick a client, write a brief, and run the pipeline. Results appear here as each
                  agent finishes.
                </Text>
              </Stack>
            </Card>
          ) : (
            <>
              {run.status === 'failed' && (
                <Alert color="red" title="Pipeline failed">{run.error}</Alert>
              )}
              <Results run={run} />
              {run.status === 'awaiting_approval' && (
                <Card withBorder radius="lg" padding="lg" style={{ borderColor: 'var(--mantine-color-violet-4)' }}>
                  <Text fw={700} mb={4}>✅ Human approval gate</Text>
                  <Text size="sm" c="dimmed" mb="sm">
                    Review the output above. Approving marks the assets ready to deliver to the
                    client; rejecting archives the run.
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
