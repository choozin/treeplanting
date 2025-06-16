'use client';

import React from 'react';
import { Paper, Text, Group, Badge, Button, Box, Stack, Collapse, Divider, ActionIcon } from '@mantine/core';
import { IconChevronDown, IconEye } from '@tabler/icons-react';
import classes from './Classifieds.module.css';

const PostListItem = ({ post, onMessage, onExpand, isExpanded }) => {
  const { 
      title, description, postType, price, condition, category, listerName, 
      listerFirstName, campName, createdAt, viewCount 
  } = post;

  const getBadge = () => {
    switch (postType) {
      case 'For Sale': return <Badge color="blue" variant="light">${price}</Badge>;
      case 'For Free': return <Badge color="green" variant="light">Free</Badge>;
      case 'Wanted': return <Badge color="orange" variant="light">Wanted</Badge>;
      default: return null;
    }
  };
  
  const getTypeColor = () => {
    switch (postType) {
      case 'For Sale': return 'var(--mantine-color-blue-6)';
      case 'For Free': return 'var(--mantine-color-green-6)';
      case 'Wanted': return 'var(--mantine-color-orange-6)';
      default: return 'var(--mantine-color-gray-5)';
    }
  };

  const handleMessageClick = (e) => {
      e.stopPropagation(); // Prevent the accordion from opening when clicking the message button
      onMessage();
  };

  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <Paper className={classes.listItem} withBorder>
      <Box className={classes.typeIndicator} style={{ backgroundColor: getTypeColor() }} />
      <div className={classes.clickableWrapper} onClick={onExpand}>
        <Box className={classes.placeholderImage}>
            <Text size="xs">Image</Text>
        </Box>
        <div className={classes.itemContent}>
            <Group justify="space-between">
                <Text fw={500}>{title}</Text>
                {getBadge()}
            </Group>
            <Text size="sm" c="dimmed" lineClamp={isExpanded ? 0 : 2}>{description}</Text>
            
            <Collapse in={isExpanded}>
                <Divider my="xs" />
                <Stack gap="xs" mt="sm">
                    <Group>
                        <Text size="sm" fw={500} w={80}>Condition:</Text>
                        <Text size="sm">{condition}</Text>
                    </Group>
                    <Group>
                        <Text size="sm" fw={500} w={80}>Category:</Text>
                        <Text size="sm">{category}</Text>
                    </Group>
                    <Group>
                        <Text size="sm" fw={500} w={80}>Posted:</Text>
                        <Text size="sm">{formattedDate}</Text>
                    </Group>
                </Stack>
            </Collapse>

            <Group justify="space-between" mt="sm">
                <Stack gap={0}>
                    <Text size="xs">Posted by: {listerName} from {campName}</Text>
                    <Group gap="xs" align="center">
                        <IconEye size={14} color="var(--mantine-color-gray-6)" />
                        <Text size="xs" c="dimmed">{viewCount || 0} views</Text>
                    </Group>
                </Stack>
                <Button size="xs" variant="outline" onClick={handleMessageClick}>
                    Message {listerFirstName}
                </Button>
            </Group>
        </div>
        <ActionIcon variant="transparent" className={classes.chevron}>
             <IconChevronDown size={20} style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
        </ActionIcon>
      </div>
    </Paper>
  );
};

export default PostListItem;