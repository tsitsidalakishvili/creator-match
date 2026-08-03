import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Menu,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  IconBolt,
  IconBrandInstagram,
  IconBrandTiktok,
  IconBrandX,
  IconCamera,
  IconChartDots,
  IconDotsVertical,
  IconDownload,
  IconRestore,
  IconSearch,
  IconUpload,
  IconUsers,
} from '@tabler/icons-react'
import Papa from 'papaparse'
import { useMemo, useRef, useState } from 'react'
import { nicheColor } from '../nicheColors.js'
import { useRoster } from '../rosterStore.jsx'
import {
  NICHES,
  buildSnapshot,
  computeTrend,
  formatCompact,
  influenceTierFor,
  initials,
  rosterSummary,
  rosterToRows,
  rowsToRoster,
} from '../talentMatchData'

function TrendBadge({ trend }) {
  if (!trend) {
    return (
      <Badge size="xs" variant="light" color="gray">
        new
      </Badge>
    )
  }
  const color = trend.dir === 'up' ? 'teal' : trend.dir === 'down' ? 'red' : 'gray'
  const glyph = trend.dir === 'up' ? '▲' : trend.dir === 'down' ? '▼' : '▬'
  const sign = trend.pct > 0 ? '+' : ''
  return (
    <Tooltip label={`vs snapshot ${trend.days}d ago`}>
      <Badge size="xs" variant="light" color={color}>
        {glyph} {sign}
        {trend.pct}%
      </Badge>
    </Tooltip>
  )
}

function PlatformIcons({ creator }) {
  const links = [
    { href: creator.ig, icon: IconBrandInstagram, label: 'Instagram' },
    { href: creator.tt, icon: IconBrandTiktok, label: 'TikTok' },
    { href: creator.x, icon: IconBrandX, label: 'X / Twitter' },
  ].filter((l) => l.href)
  return (
    <Group gap={4} wrap="nowrap">
      {links.map((l) => (
        <ActionIcon
          key={l.label}
          component="a"
          href={l.href}
          target="_blank"
          rel="noreferrer"
          variant="subtle"
          color="gray"
          size="sm"
          aria-label={`${creator.name} on ${l.label}`}
        >
          <l.icon size={16} />
        </ActionIcon>
      ))}
    </Group>
  )
}

export default function RosterPage() {
  const { roster, isCustom, setRoster, resetRoster, snapshots, setSnapshots } = useRoster()
  const [search, setSearch] = useState('')
  const [niche, setNiche] = useState('all')
  const fileInputRef = useRef(null)

  const summary = useMemo(() => rosterSummary(roster), [roster])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return roster
      .filter((r) => niche === 'all' || r.niche === niche)
      .filter((r) => !term || r.name.toLowerCase().includes(term))
      .sort((a, b) => b.total - a.total)
  }, [roster, niche, search])

  const usedNiches = useMemo(() => NICHES.filter((n) => roster.some((r) => r.niche === n)), [roster])

  const stats = [
    { label: 'Messengers', value: String(summary.count), icon: IconUsers, color: 'violet' },
    { label: 'Combined reach', value: formatCompact(summary.totalReach), icon: IconChartDots, color: 'blue' },
    { label: 'Avg engagement', value: `${summary.avgEng}%`, icon: IconBolt, color: 'orange' },
    { label: 'On X / TikTok', value: String(summary.withX + summary.withTikTok), icon: IconBrandX, color: 'grape' },
  ]

  const handleImportFile = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (result) => {
        try {
          const next = rowsToRoster(result.data)
          if (!next.length) {
            notifications.show({
              color: 'red',
              title: 'No rows found',
              message: 'Expected columns: Name, Instagram, IG Followers, TikTok, TT Followers, X/Twitter, X Followers, Eng%, Niche.',
            })
            return
          }
          setRoster(next)
          setNiche('all')
          setSearch('')
          notifications.show({ color: 'green', message: `Imported ${next.length} messengers.` })
        } catch (err) {
          notifications.show({ color: 'red', title: 'Import failed', message: err.message })
        }
      },
      error: (err) => notifications.show({ color: 'red', title: 'Import failed', message: err.message }),
    })
    event.target.value = ''
  }

  const handleExport = () => {
    const csv = Papa.unparse(rosterToRows(roster))
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'messenger-roster.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleSnapshot = () => {
    const next = [...snapshots, buildSnapshot(roster)].slice(-24)
    setSnapshots(next)
    notifications.show({
      color: 'green',
      title: `Snapshot #${next.length} recorded`,
      message:
        snapshots.length === 0
          ? 'Baseline saved. Import updated follower figures later and trend badges will show the real change.'
          : 'Trend badges now compare against the latest history.',
    })
  }

  const rows = filtered.map((r) => {
    const tier = influenceTierFor(r.total)
    return (
      <Table.Tr key={r.name}>
        <Table.Td>
          <Group gap="sm" wrap="nowrap">
            <Avatar color={nicheColor(r.niche)} radius="xl" size="sm">
              {initials(r.name)}
            </Avatar>
            <Text fw={600} size="sm" style={{ whiteSpace: 'nowrap' }}>
              {r.name}
            </Text>
          </Group>
        </Table.Td>
        <Table.Td>
          <Badge size="xs" variant="light" color={nicheColor(r.niche)}>
            {r.niche}
          </Badge>
        </Table.Td>
        <Table.Td>
          <Text fw={600} size="sm">
            {formatCompact(r.total)}
          </Text>
        </Table.Td>
        <Table.Td>
          <TrendBadge trend={computeTrend(r, snapshots)} />
        </Table.Td>
        <Table.Td>{r.igF ? formatCompact(r.igF) : '—'}</Table.Td>
        <Table.Td>{r.ttF ? formatCompact(r.ttF) : '—'}</Table.Td>
        <Table.Td>{r.xF ? formatCompact(r.xF) : '—'}</Table.Td>
        <Table.Td>{r.eng}%</Table.Td>
        <Table.Td>{tier ? tier.tier : '—'}</Table.Td>
        <Table.Td>
          <PlatformIcons creator={r} />
        </Table.Td>
      </Table.Tr>
    )
  })

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end" wrap="wrap">
        <Box>
          <Title order={2}>Roster</Title>
          <Text c="dimmed" size="sm">
            {filtered.length} of {roster.length} messengers{isCustom ? ' · imported roster' : ''}
          </Text>
        </Box>
        <Group gap="xs">
          <Button variant="light" size="xs" leftSection={<IconCamera size={16} />} onClick={handleSnapshot}>
            Record snapshot
          </Button>
          <Menu shadow="md" position="bottom-end">
            <Menu.Target>
              <ActionIcon variant="light" size="lg" aria-label="Roster actions">
                <IconDotsVertical size={18} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconUpload size={16} />} onClick={() => fileInputRef.current?.click()}>
                Import CSV
              </Menu.Item>
              <Menu.Item leftSection={<IconDownload size={16} />} onClick={handleExport}>
                Export CSV
              </Menu.Item>
              {isCustom && (
                <Menu.Item leftSection={<IconRestore size={16} />} color="red" onClick={resetRoster}>
                  Reset to built-in roster
                </Menu.Item>
              )}
            </Menu.Dropdown>
          </Menu>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="sm">
        {stats.map((stat) => (
          <Card key={stat.label} withBorder radius="lg" padding="md">
            <Group justify="space-between" align="center" wrap="nowrap">
              <Box>
                <Text size="xs" c="dimmed" fw={600}>
                  {stat.label}
                </Text>
                <Text fz={24} fw={800}>
                  {stat.value}
                </Text>
              </Box>
              <ThemeIcon variant="light" color={stat.color} radius="md">
                <stat.icon size={16} />
              </ThemeIcon>
            </Group>
          </Card>
        ))}
      </SimpleGrid>

      <Stack gap="xs">
        <TextInput
          leftSection={<IconSearch size={16} />}
          placeholder="Search messengers…"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />
        <ScrollArea type="never" offsetScrollbars>
          <Group gap={6} wrap="nowrap">
            {['all', ...usedNiches].map((n) => (
              <Button
                key={n}
                size="compact-xs"
                radius="xl"
                variant={niche === n ? 'filled' : 'light'}
                color={n === 'all' ? 'violet' : nicheColor(n)}
                onClick={() => setNiche(n)}
                style={{ textTransform: 'capitalize', flexShrink: 0 }}
              >
                {n}
              </Button>
            ))}
          </Group>
        </ScrollArea>
      </Stack>

      {/* Desktop: table */}
      <Card withBorder radius="lg" padding={0} visibleFrom="md">
        <Table.ScrollContainer minWidth={860}>
          <Table striped highlightOnHover verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Messenger</Table.Th>
                <Table.Th>Topic</Table.Th>
                <Table.Th>Total</Table.Th>
                <Table.Th>Trend</Table.Th>
                <Table.Th>Instagram</Table.Th>
                <Table.Th>TikTok</Table.Th>
                <Table.Th>X</Table.Th>
                <Table.Th>Eng%</Table.Th>
                <Table.Th>Tier</Table.Th>
                <Table.Th>Links</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{rows}</Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>

      {/* Mobile: cards */}
      <Stack gap="xs" hiddenFrom="md">
        {filtered.map((r) => {
          const tier = influenceTierFor(r.total)
          return (
            <Card key={r.name} withBorder radius="lg" padding="md">
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                  <Avatar color={nicheColor(r.niche)} radius="xl">
                    {initials(r.name)}
                  </Avatar>
                  <Box style={{ minWidth: 0 }}>
                    <Text fw={700} size="sm" truncate>
                      {r.name}
                    </Text>
                    <Group gap={4}>
                      <Badge size="xs" variant="light" color={nicheColor(r.niche)}>
                        {r.niche}
                      </Badge>
                      <TrendBadge trend={computeTrend(r, snapshots)} />
                    </Group>
                  </Box>
                </Group>
                <Box ta="right">
                  <Text fw={800}>{formatCompact(r.total)}</Text>
                  <Text size="xs" c="dimmed">
                    {r.eng}% eng
                  </Text>
                </Box>
              </Group>
              <Group justify="space-between" mt="xs">
                <Text size="xs" c="dimmed">
                  {[
                    r.igF ? `IG ${formatCompact(r.igF)}` : null,
                    r.ttF ? `TT ${formatCompact(r.ttF)}` : null,
                    r.xF ? `X ${formatCompact(r.xF)}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  {tier ? ` · ${tier.tier}` : ''}
                </Text>
                <PlatformIcons creator={r} />
              </Group>
            </Card>
          )
        })}
      </Stack>
    </Stack>
  )
}
