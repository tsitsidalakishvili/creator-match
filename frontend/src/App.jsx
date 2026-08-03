import {
  ActionIcon,
  AppShell,
  Burger,
  Group,
  NavLink,
  Text,
  ThemeIcon,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
  IconBuildingStore,
  IconDashboard,
  IconListDetails,
  IconMessage2,
  IconMoon,
  IconSpeakerphone,
  IconSparkles,
  IconSun,
  IconTargetArrow,
  IconWand,
} from '@tabler/icons-react'
import { useEffect } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import FeedbackDrawer from './components/FeedbackDrawer.jsx'
import { RosterProvider } from './rosterStore.jsx'
import CampaignDetailPage from './pages/CampaignDetailPage.jsx'
import CampaignsPage from './pages/CampaignsPage.jsx'
import ClientsPage from './pages/ClientsPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import MatchPage from './pages/MatchPage.jsx'
import RosterPage from './pages/RosterPage.jsx'
import StudioPage from './pages/StudioPage.jsx'

const mainLinks = [
  { to: '/studio', label: 'Studio', description: 'AI marketing team pipeline', icon: IconWand },
  { to: '/clients', label: 'Clients', description: 'Brand DNA profiles', icon: IconBuildingStore },
  { to: '/match', label: 'Match', description: 'Find messengers for a campaign', icon: IconTargetArrow },
  { to: '/roster', label: 'Roster', description: 'Browse & manage creators', icon: IconListDetails },
]

const plannerLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: IconDashboard },
  { to: '/campaigns', label: 'Campaigns', icon: IconSpeakerphone },
]

function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme()
  const computed = useComputedColorScheme('light')
  return (
    <ActionIcon
      variant="subtle"
      color="gray"
      size="lg"
      aria-label="Toggle color scheme"
      onClick={() => setColorScheme(computed === 'light' ? 'dark' : 'light')}
    >
      {computed === 'light' ? <IconMoon size={18} /> : <IconSun size={18} />}
    </ActionIcon>
  )
}

export default function App() {
  const location = useLocation()
  const [navOpened, { toggle: toggleNav, close: closeNav }] = useDisclosure(false)
  const [feedbackOpened, { open: openFeedback, close: closeFeedback }] = useDisclosure(false)

  useEffect(() => {
    closeNav()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  const renderLinks = (links) =>
    links.map((link) => (
      <NavLink
        key={link.to}
        component={Link}
        to={link.to}
        label={link.label}
        description={link.description}
        leftSection={<link.icon size={18} />}
        active={location.pathname.startsWith(link.to)}
        variant="light"
        style={{ borderRadius: 8 }}
        onClick={closeNav}
      />
    ))

  return (
    <RosterProvider>
      <AppShell
        header={{ height: 56 }}
        navbar={{ width: 230, breakpoint: 'sm', collapsed: { mobile: !navOpened } }}
        padding={{ base: 'sm', sm: 'md' }}
      >
        <AppShell.Header>
          <Group h="100%" px="md" gap="xs" justify="space-between" wrap="nowrap">
            <Group gap="xs" wrap="nowrap">
              <Burger opened={navOpened} onClick={toggleNav} hiddenFrom="sm" size="sm" aria-label="Toggle navigation" />
              <ThemeIcon variant="gradient" gradient={{ from: 'violet', to: 'cyan' }} radius="md">
                <IconSparkles size={18} />
              </ThemeIcon>
              <Text fw={700} size="lg">
                CreatorMatch
              </Text>
              <Text c="dimmed" size="sm" visibleFrom="md">
                campaigns &amp; audience
              </Text>
            </Group>
            <Group gap={4} wrap="nowrap">
              <ActionIcon
                variant="subtle"
                color="gray"
                size="lg"
                aria-label="Send feedback"
                onClick={openFeedback}
              >
                <IconMessage2 size={18} />
              </ActionIcon>
              <ColorSchemeToggle />
            </Group>
          </Group>
        </AppShell.Header>
        <FeedbackDrawer opened={feedbackOpened} onClose={closeFeedback} />
        <AppShell.Navbar p="xs">
          {renderLinks(mainLinks)}
          <Text size="xs" c="dimmed" fw={600} tt="uppercase" mt="md" mb={4} px="xs">
            Planner (demo)
          </Text>
          {renderLinks(plannerLinks)}
        </AppShell.Navbar>
        <AppShell.Main>
          <Routes>
            <Route path="/" element={<Navigate to="/studio" replace />} />
            <Route path="/studio" element={<StudioPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/match" element={<MatchPage />} />
            <Route path="/roster" element={<RosterPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
            <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
          </Routes>
        </AppShell.Main>
      </AppShell>
    </RosterProvider>
  )
}
