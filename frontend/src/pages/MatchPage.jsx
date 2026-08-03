import {
  ActionIcon,
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Chip,
  Group,
  RingProgress,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core'
import {
  IconBrandInstagram,
  IconBrandTiktok,
  IconBrandX,
  IconClick,
  IconEye,
  IconHeart,
  IconInfoCircle,
  IconSearch,
  IconSparkles,
  IconTargetArrow,
} from '@tabler/icons-react'
import { useState } from 'react'
import { nicheColor } from '../nicheColors.js'
import { useRoster } from '../rosterStore.jsx'
import {
  CAMPAIGN_FORMATS,
  formatCompact,
  inferNiche,
  influenceTierFor,
  initials,
  matchCreators,
  projectCampaign,
} from '../talentMatchData'

const EXAMPLES = ['EU integration', 'Healthcare reform', 'Get-out-the-vote', 'Tech education', 'Clean air']

const FORMAT_OPTIONS = Object.entries(CAMPAIGN_FORMATS).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}))

const COUNT_OPTIONS = [
  { value: '3', label: 'Top 3' },
  { value: '6', label: 'Top 6' },
  { value: '10', label: 'Top 10' },
]

function scoreColor(score) {
  if (score >= 80) return 'teal'
  if (score >= 65) return 'yellow'
  return 'orange'
}

function PlatformLinks({ creator }) {
  const links = [
    { href: creator.ig, icon: IconBrandInstagram, label: 'Instagram' },
    { href: creator.tt, icon: IconBrandTiktok, label: 'TikTok' },
    { href: creator.x, icon: IconBrandX, label: 'X / Twitter' },
  ].filter((l) => l.href)
  if (!links.length) return null
  return (
    <Group gap={6}>
      {links.map((l) => (
        <Tooltip key={l.label} label={l.label}>
          <ActionIcon
            component="a"
            href={l.href}
            target="_blank"
            rel="noreferrer"
            variant="light"
            color="gray"
            size="lg"
            aria-label={`${creator.name} on ${l.label}`}
          >
            <l.icon size={18} />
          </ActionIcon>
        </Tooltip>
      ))}
    </Group>
  )
}

function MatchCard({ creator, projection, topPick }) {
  const tier = influenceTierFor(creator.total)
  return (
    <Card withBorder radius="lg" padding="lg" style={topPick ? { borderColor: 'var(--mantine-color-violet-4)' } : undefined}>
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
            <Avatar color={nicheColor(creator.niche)} radius="xl" size="md">
              {initials(creator.name)}
            </Avatar>
            <Box style={{ minWidth: 0 }}>
              <Text fw={700} size="sm" truncate>
                {creator.name}
              </Text>
              <Group gap={4}>
                <Badge size="xs" variant="light" color={nicheColor(creator.niche)}>
                  {creator.niche}
                </Badge>
                {topPick && (
                  <Badge size="xs" variant="gradient" gradient={{ from: 'violet', to: 'cyan' }}>
                    Top pick
                  </Badge>
                )}
              </Group>
            </Box>
          </Group>
          <RingProgress
            size={64}
            thickness={6}
            roundCaps
            sections={[{ value: creator.score, color: scoreColor(creator.score) }]}
            label={
              <Text ta="center" fw={700} size="sm">
                {creator.score}
              </Text>
            }
          />
        </Group>

        <Text size="xs" c="dimmed" lineClamp={3}>
          {creator.reason}
        </Text>

        <SimpleGrid cols={3} spacing="xs">
          <Box>
            <Text size="xs" c="dimmed">
              Followers
            </Text>
            <Text fw={700} size="sm">
              {formatCompact(creator.total)}
            </Text>
          </Box>
          <Box>
            <Text size="xs" c="dimmed">
              Est. views
            </Text>
            <Text fw={700} size="sm">
              {formatCompact(Math.round(creator.avgViews * projection.format.reach))}
            </Text>
          </Box>
          <Box>
            <Text size="xs" c="dimmed">
              Est. eng.
            </Text>
            <Text fw={700} size="sm">
              {formatCompact(Math.round(creator.total * (creator.eng / 100) * projection.format.eng))}
            </Text>
          </Box>
        </SimpleGrid>

        <Group justify="space-between" align="center">
          <PlatformLinks creator={creator} />
          <Group gap={6}>
            <Badge size="xs" variant="outline" color="gray">
              {creator.eng}% eng
            </Badge>
            {tier && (
              <Badge size="xs" variant="light" color="indigo">
                {tier.tier}
              </Badge>
            )}
          </Group>
        </Group>
      </Stack>
    </Card>
  )
}

export default function MatchPage() {
  const { roster } = useRoster()
  const [input, setInput] = useState('')
  const [formatKey, setFormatKey] = useState('reel')
  const [numRecs, setNumRecs] = useState('6')
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState('')

  const runMatch = (value) => {
    const campaign = (value ?? input).trim()
    if (!campaign) {
      setError('Enter a campaign, issue, or cause to analyze.')
      return
    }
    setError('')
    const niche = inferNiche(campaign)
    const matches = matchCreators(roster, niche, campaign, Number(numRecs))
    setAnalysis({ campaign, niche, matches, formatKey })
  }

  const projection = analysis ? projectCampaign(analysis.matches, analysis.formatKey) : null

  return (
    <Stack gap="lg">
      <Box>
        <Title order={2}>Find messengers</Title>
        <Text c="dimmed" size="sm">
          Enter a campaign, issue, or cause — we detect the topic and rank the voices best placed to
          amplify it, with reach projections.
        </Text>
      </Box>

      <Card withBorder radius="lg" padding="lg">
        <Stack gap="sm">
          <TextInput
            size="md"
            leftSection={<IconSearch size={18} />}
            placeholder="e.g. EU integration · healthcare reform · get-out-the-vote"
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') runMatch()
            }}
            error={error || undefined}
          />
          <Group gap="xs">
            {EXAMPLES.map((example) => (
              <Chip
                key={example}
                size="xs"
                checked={false}
                onClick={() => {
                  setInput(example)
                  runMatch(example)
                }}
              >
                {example}
              </Chip>
            ))}
          </Group>
          <Group grow preventGrowOverflow={false} wrap="wrap">
            <Select
              label="Content format"
              data={FORMAT_OPTIONS}
              value={formatKey}
              onChange={(v) => v && setFormatKey(v)}
              allowDeselect={false}
            />
            <Select
              label="Recommendations"
              data={COUNT_OPTIONS}
              value={numRecs}
              onChange={(v) => v && setNumRecs(v)}
              allowDeselect={false}
            />
          </Group>
          <Button
            size="md"
            variant="gradient"
            gradient={{ from: 'violet', to: 'cyan' }}
            leftSection={<IconSparkles size={18} />}
            onClick={() => runMatch()}
          >
            Analyze &amp; match
          </Button>
        </Stack>
      </Card>

      {!analysis ? (
        <Card withBorder radius="lg" padding="xl">
          <Center>
            <Stack align="center" gap="xs" py="lg">
              <ThemeIcon size={56} radius="xl" variant="light" color="violet">
                <IconTargetArrow size={30} />
              </ThemeIcon>
              <Text fw={600}>No analysis yet</Text>
              <Text c="dimmed" size="sm" ta="center" maw={420}>
                Type a campaign above or tap an example — you&apos;ll get the best-matched
                messengers from your roster of {roster.length}, plus estimated reach, engagement,
                and clicks.
              </Text>
            </Stack>
          </Center>
        </Card>
      ) : (
        <>
          <Group gap="xs">
            <Text fw={700} size="lg">
              {analysis.campaign}
            </Text>
            <Badge variant="light" color={nicheColor(analysis.niche)}>
              {analysis.niche}
            </Badge>
            <Text c="dimmed" size="sm">
              {projection.format.label} · {analysis.matches.length} messengers
            </Text>
          </Group>

          <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="sm">
            {[
              {
                label: 'Estimated reach',
                value: formatCompact(projection.reach),
                sub: `views · ×${projection.format.reach} format multiplier`,
                icon: IconEye,
                color: 'violet',
              },
              {
                label: 'Estimated engagement',
                value: formatCompact(projection.eng),
                sub: `likes, comments & shares · ${projection.engRate}% rate`,
                icon: IconHeart,
                color: 'pink',
              },
              {
                label: 'Estimated clicks',
                value: formatCompact(projection.clicks),
                sub: `${(projection.format.click * 100).toFixed(0)}% CTR on engagements`,
                icon: IconClick,
                color: 'cyan',
              },
            ].map((stat) => (
              <Card key={stat.label} withBorder radius="lg" padding="md">
                <Group justify="space-between" align="flex-start">
                  <Box>
                    <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                      {stat.label}
                    </Text>
                    <Text fz={28} fw={800} lh={1.2}>
                      {stat.value}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {stat.sub}
                    </Text>
                  </Box>
                  <ThemeIcon variant="light" color={stat.color} size="lg" radius="md">
                    <stat.icon size={18} />
                  </ThemeIcon>
                </Group>
              </Card>
            ))}
          </SimpleGrid>

          <Alert icon={<IconInfoCircle size={16} />} color="gray" variant="light">
            Reach = avg views × format multiplier · Engagement = followers × eng% × format bonus ·
            Clicks = format CTR × engagements. Matching runs locally on your roster.
          </Alert>

          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
            {analysis.matches.map((creator, i) => (
              <MatchCard key={creator.name} creator={creator} projection={projection} topPick={i < 2} />
            ))}
          </SimpleGrid>
        </>
      )}
    </Stack>
  )
}
