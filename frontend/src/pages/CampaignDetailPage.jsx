import {
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Loader,
  Progress,
  RingProgress,
  Select,
  Stack,
  Tabs,
  Text,
  Title,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconArrowLeft, IconClipboardText, IconSparkles, IconStar } from '@tabler/icons-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api.js'
import { MATCH_STATUS_COLORS } from '../constants.js'

const BREAKDOWN_LABELS = {
  niche_fit: 'Niche fit (30)',
  channel_fit: 'Channel fit (15)',
  geo_fit: 'Geography (15)',
  age_fit: 'Age range (10)',
  language_fit: 'Language (10)',
  budget_fit: 'Budget (10)',
  engagement: 'Engagement (10)',
}

const BREAKDOWN_MAX = {
  niche_fit: 30,
  channel_fit: 15,
  geo_fit: 15,
  age_fit: 10,
  language_fit: 10,
  budget_fit: 10,
  engagement: 10,
}

function scoreColor(score) {
  if (score >= 70) return 'teal'
  if (score >= 45) return 'yellow'
  return 'red'
}

function MatchCard({ match, onStatusChange }) {
  return (
    <Card withBorder radius="md" padding="lg">
      <Group align="flex-start">
        <RingProgress
          size={92}
          thickness={9}
          roundCaps
          sections={[{ value: match.score, color: scoreColor(match.score) }]}
          label={
            <Text ta="center" fw={700} size="lg">
              {Math.round(match.score)}
            </Text>
          }
        />
        <Stack gap={6} style={{ flex: 1 }}>
          <Group justify="space-between">
            <div>
              <Text fw={700}>{match.creator_name}</Text>
              <Text c="dimmed" size="xs">
                {match.creator_handle} · {match.country} · {match.followers.toLocaleString()} followers ·{' '}
                {match.engagement_rate}% ER · ${match.rate_per_post.toLocaleString()}/post
              </Text>
            </div>
            <Badge color={MATCH_STATUS_COLORS[match.status]} variant="light">
              {match.status}
            </Badge>
          </Group>
          <Group gap={4}>
            {match.niches.map((n) => (
              <Badge key={n} size="xs" variant="light">
                {n}
              </Badge>
            ))}
            {match.platforms.map((p) => (
              <Badge key={p} size="xs" variant="outline" color="gray">
                {p}
              </Badge>
            ))}
          </Group>
          <Grid gutter="xs" mt={4}>
            {Object.entries(match.breakdown).map(([key, value]) => (
              <Grid.Col key={key} span={{ base: 6, md: 3 }}>
                <Text size="xs" c="dimmed">
                  {BREAKDOWN_LABELS[key] || key}
                </Text>
                <Progress
                  value={(value / BREAKDOWN_MAX[key]) * 100}
                  size="sm"
                  color={scoreColor((value / BREAKDOWN_MAX[key]) * 100)}
                />
              </Grid.Col>
            ))}
          </Grid>
          <Stack gap={2} mt={4}>
            {match.reasons.map((reason, i) => (
              <Text key={i} size="xs" c="dimmed">
                • {reason}
              </Text>
            ))}
          </Stack>
          <Group mt={4}>
            <Select
              size="xs"
              w={150}
              data={['suggested', 'shortlisted', 'invited', 'accepted', 'declined']}
              value={match.status}
              onChange={(status) => status && onStatusChange(match.creator_id, status)}
            />
          </Group>
        </Stack>
      </Group>
    </Card>
  )
}

export default function CampaignDetailPage() {
  const { id } = useParams()
  const [campaign, setCampaign] = useState(null)
  const [matches, setMatches] = useState(null)

  const load = useCallback(() => {
    api
      .getCampaign(id)
      .then(setCampaign)
      .catch((e) => notifications.show({ color: 'red', title: 'API error', message: e.message }))
    api
      .getMatches(id)
      .then(setMatches)
      .catch((e) => notifications.show({ color: 'red', title: 'API error', message: e.message }))
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const changeStatus = async (creatorId, status) => {
    try {
      await api.setMatchStatus(id, creatorId, status)
      setMatches((ms) => ms.map((m) => (m.creator_id === creatorId ? { ...m, status } : m)))
      notifications.show({ color: 'green', message: `Marked as ${status}` })
    } catch (e) {
      notifications.show({ color: 'red', title: 'Could not update', message: e.message })
    }
  }

  if (!campaign) return <Loader />

  const shortlisted = (matches || []).filter((m) => m.status !== 'suggested')

  return (
    <Stack>
      <Group>
        <Button
          component={Link}
          to="/campaigns"
          variant="subtle"
          size="xs"
          leftSection={<IconArrowLeft size={14} />}
        >
          All campaigns
        </Button>
      </Group>
      <Group justify="space-between">
        <div>
          <Title order={2}>{campaign.name}</Title>
          <Text c="dimmed" size="sm">
            {campaign.brand} · {campaign.status} · ${campaign.budget_total.toLocaleString()} budget
          </Text>
        </div>
      </Group>

      <Tabs defaultValue="matches" keepMounted={false}>
        <Tabs.List>
          <Tabs.Tab value="brief" leftSection={<IconClipboardText size={16} />}>
            Brief
          </Tabs.Tab>
          <Tabs.Tab value="matches" leftSection={<IconSparkles size={16} />}>
            Matches {matches ? `(${matches.length})` : ''}
          </Tabs.Tab>
          <Tabs.Tab value="shortlist" leftSection={<IconStar size={16} />}>
            Shortlist ({shortlisted.length})
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="brief" pt="md">
          <Grid>
            <Grid.Col span={{ base: 12, md: 7 }}>
              <Card withBorder radius="md" padding="lg">
                <Stack gap="sm">
                  <div>
                    <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                      Description
                    </Text>
                    <Text size="sm">{campaign.description || '—'}</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                      Objective
                    </Text>
                    <Text size="sm">{campaign.objective || '—'}</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                      Call to action
                    </Text>
                    <Text size="sm">{campaign.call_to_action || '—'}</Text>
                  </div>
                </Stack>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 5 }}>
              <Card withBorder radius="md" padding="lg">
                <Stack gap="sm">
                  <div>
                    <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                      Target audience
                    </Text>
                    <Text size="sm">
                      Ages {campaign.target_age_min}–{campaign.target_age_max}
                      {campaign.languages.length > 0 && ` · ${campaign.languages.join(', ')}`}
                    </Text>
                    <Group gap={4} mt={4}>
                      {campaign.target_geos.map((g) => (
                        <Badge key={g} size="xs" variant="light" color="cyan">
                          {g}
                        </Badge>
                      ))}
                    </Group>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                      Niches
                    </Text>
                    <Group gap={4} mt={4}>
                      {campaign.niches.map((n) => (
                        <Badge key={n} size="xs" variant="light">
                          {n}
                        </Badge>
                      ))}
                    </Group>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                      Channels
                    </Text>
                    <Group gap={4} mt={4}>
                      {campaign.channels.map((c) => (
                        <Badge key={c} size="xs" variant="outline" color="gray">
                          {c}
                        </Badge>
                      ))}
                    </Group>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                      Budget
                    </Text>
                    <Text size="sm">
                      ${campaign.budget_total.toLocaleString()} total · $
                      {campaign.budget_per_creator.toLocaleString()} per creator
                      {campaign.min_followers > 0 &&
                        ` · min ${campaign.min_followers.toLocaleString()} followers`}
                    </Text>
                  </div>
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        <Tabs.Panel value="matches" pt="md">
          {!matches ? (
            <Loader />
          ) : matches.length === 0 ? (
            <Text c="dimmed">No creators meet this campaign&apos;s requirements yet.</Text>
          ) : (
            <Stack>
              {matches.map((m) => (
                <MatchCard key={m.creator_id} match={m} onStatusChange={changeStatus} />
              ))}
            </Stack>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="shortlist" pt="md">
          {shortlisted.length === 0 ? (
            <Text c="dimmed">
              Nothing shortlisted yet — change a match&apos;s status in the Matches tab.
            </Text>
          ) : (
            <Stack>
              {shortlisted.map((m) => (
                <MatchCard key={m.creator_id} match={m} onStatusChange={changeStatus} />
              ))}
            </Stack>
          )}
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}
