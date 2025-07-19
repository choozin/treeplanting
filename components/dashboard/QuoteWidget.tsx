
import { IconQuote } from '@tabler/icons-react';
import { Group, Paper, Title } from '@mantine/core';
import ContentBlurb from '../common/ContentBlurb';

const QuoteWidget = () => {
  return (
    <Paper withBorder p="lg" radius="md" style={{ flex: '1 1 400px', minWidth: '300px' }}>
      <Group justify="space-between" align="center" mb="md">
        <Group>
          <IconQuote size={24} />
          <Title order={3}>Quote of the Day</Title>
        </Group>
      </Group>
      <ContentBlurb />
    </Paper>
  );
};

export default QuoteWidget;
