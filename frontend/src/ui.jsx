// Shared UI primitives ported from the FS app (StatusMessage, CivicStatGrid).
import { Card, Group, SimpleGrid, Text, ThemeIcon } from '@mantine/core'

export function StatusMessage({ tone = 'info', message, role }) {
  if (!message) return null
  const computedRole = role || (tone === 'error' ? 'alert' : 'status')
  const live = tone === 'error' ? 'assertive' : 'polite'
  return (
    <div className={`status-message status-message--${tone}`} role={computedRole} aria-live={live}>
      {message}
    </div>
  )
}

// The FS theme has a custom 'civic' color; map it to a stock Mantine color here.
function mantineColor(color) {
  return color === 'civic' ? 'indigo' : color || 'indigo'
}

export function CivicStatGrid({ title, description, items = [], action, className }) {
  if (!items.length) return null
  return (
    <Card className={`civic-stat-grid ${className || ''}`.trim()} withBorder radius="lg">
      {(title || description || action) && (
        <Group justify="space-between" align="flex-start" mb="md" wrap="wrap">
          <div>
            {title ? (
              <Text fw={600} size="lg">
                {title}
              </Text>
            ) : null}
            {description ? (
              <Text c="dimmed" size="sm">
                {description}
              </Text>
            ) : null}
          </div>
          {action}
        </Group>
      )}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
        {items.map((item, index) => (
          <Card key={`${item.label}-${index}`} radius="lg" withBorder>
            <Group justify="space-between" align="center">
              <div>
                <Text size="xs" c="dimmed">
                  {item.label}
                </Text>
                <Text fw={600} size="xl">
                  {item.value}
                </Text>
              </div>
              {item.icon ? (
                <ThemeIcon
                  color={mantineColor(item.color)}
                  variant={item.variant || 'light'}
                  size="lg"
                  radius="md"
                >
                  {item.icon}
                </ThemeIcon>
              ) : null}
            </Group>
          </Card>
        ))}
      </SimpleGrid>
    </Card>
  )
}
