import { Card, Grid, Group, Loader, Stack, Text, Title } from '@mantine/core'
import {
  IconSpeakerphone,
  IconStar,
  IconTargetArrow,
  IconUsers,
} from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { api } from '../api.js'

const cards = [
  { key: 'creators', label: 'Creators', icon: IconUsers, color: 'violet' },
  { key: 'campaigns', label: 'Campaigns', icon: IconSpeakerphone, color: 'cyan' },
  { key: 'active_campaigns', label: 'Active campaigns', icon: IconTargetArrow, color: 'teal' },
  { key: 'shortlisted', label: 'Shortlisted matches', icon: IconStar, color: 'yellow' },
]

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.stats().then(setStats).catch((e) => setError(e.message))
  }, [])

  return (
    <Stack>
      <Title order={2}>Dashboard</Title>
      {error && <Text c="red">Could not reach the API: {error}</Text>}
      {!stats && !error && <Loader />}
      {stats && (
        <Grid>
          {cards.map((card) => (
            <Grid.Col key={card.key} span={{ base: 12, sm: 6, lg: 3 }}>
              <Card withBorder radius="md" padding="lg">
                <Group justify="space-between">
                  <Text c="dimmed" size="sm" fw={600}>
                    {card.label}
                  </Text>
                  <card.icon size={20} color={`var(--mantine-color-${card.color}-6)`} />
                </Group>
                <Text fz={32} fw={700} mt="sm">
                  {stats[card.key]}
                </Text>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      )}
      <Card withBorder radius="md" padding="lg">
        <Title order={4}>How it works</Title>
        <Text c="dimmed" mt="xs">
          1. Add creators with their audience profile (niches, platforms, geography, age range,
          engagement, rate). 2. Create a campaign brief with objective, target audience and budget.
          3. Open the campaign&apos;s Matches tab — every creator is scored 0-100 across niche,
          channel, geography, age, language, budget and engagement, with an explanation for each
          score. Shortlist and invite the best fits.
        </Text>
      </Card>
    </Stack>
  )
}
