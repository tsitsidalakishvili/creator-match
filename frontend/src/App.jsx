import { AppShell, Group, NavLink, Text, ThemeIcon } from '@mantine/core'
import {
  IconDashboard,
  IconSpeakerphone,
  IconSparkles,
  IconUsers,
} from '@tabler/icons-react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import CampaignDetailPage from './pages/CampaignDetailPage.jsx'
import CampaignsPage from './pages/CampaignsPage.jsx'
import CreatorsPage from './pages/CreatorsPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: IconDashboard },
  { to: '/campaigns', label: 'Campaigns', icon: IconSpeakerphone },
  { to: '/creators', label: 'Creators', icon: IconUsers },
]

export default function App() {
  const location = useLocation()
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
            campaign &amp; creator matching
          </Text>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="xs">
        {links.map((link) => (
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
        ))}
      </AppShell.Navbar>
      <AppShell.Main>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
          <Route path="/creators" element={<CreatorsPage />} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  )
}
