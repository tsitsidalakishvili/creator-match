import { Box, Card, SimpleGrid, Stack, Text } from '@mantine/core'

export default function RunResults({ run }) {
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
