import { AppShell, Group, NavLink, Text, ThemeIcon } from '@mantine/core'
import {
  IconDashboard,
  IconListDetails,
  IconSpeakerphone,
  IconSparkles,
  IconTargetArrow,
} from '@tabler/icons-react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { CampaignsAudienceWorkspace } from './pages/CampaignsAudienceWorkspace.jsx'
import CampaignDetailPage from './pages/CampaignDetailPage.jsx'
import CampaignsPage from './pages/CampaignsPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'

const mainLinks = [
  { to: '/match', label: 'Match', icon: IconTargetArrow },
  { to: '/roster', label: 'Roster', icon: IconListDetails },
]

const plannerLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: IconDashboard },
  { to: '/campaigns', label: 'Campaigns', icon: IconSpeakerphone },
]

function WorkspaceRoute({ tab }) {
  const navigate = useNavigate()
  return (
    <CampaignsAudienceWorkspace
      activeTabOverride={tab}
      onTabChange={(next) => navigate(next === 'roster' ? '/roster' : '/match')}
      showIntro
    />
  )
}

export default function App() {
  const location = useLocation()
  const renderLinks = (links) =>
    links.map((link) => (
      <NavLink
        key={link.to}
        component={Link}
        to={link.to}
        label={link.label}
        leftSection={<link.icon size={18} />}
        active={location.pathname.startsWith(link.to)}
        variant="light"
        style={{ borderRadius: 8 }}
      />
    ))

  return (
    <AppShell header={{ height: 56 }} navbar={{ width: 220, breakpoint: 'sm' }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" gap="xs">
          <ThemeIcon variant="gradient" gradient={{ from: 'violet', to: 'cyan' }} radius="md">
            <IconSparkles size={18} />
          </ThemeIcon>
          <Text fw={700} size="lg">
            CreatorMatch
          </Text>
          <Text c="dimmed" size="sm" visibleFrom="sm">
            campaigns &amp; audience
          </Text>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="xs">
        {renderLinks(mainLinks)}
        <Text size="xs" c="dimmed" fw={600} tt="uppercase" mt="md" mb={4} px="xs">
          Planner (demo)
        </Text>
        {renderLinks(plannerLinks)}
      </AppShell.Navbar>
      <AppShell.Main>
        <Routes>
          <Route path="/" element={<Navigate to="/match" replace />} />
          <Route path="/match" element={<WorkspaceRoute tab="match" />} />
          <Route path="/roster" element={<WorkspaceRoute tab="roster" />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  )
}
