'use client';

import React from 'react';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { Button, Group, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';

interface CustomDayOffDatePickerProps {
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  daysOff: string[];
}

const CustomDayOffDatePicker: React.FC<CustomDayOffDatePickerProps> = ({
  selectedDate,
  setSelectedDate,
  daysOff,
}) => {
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    if (!selectedDate) {
      return;
    }

    const newDate = new Date(selectedDate);
    let foundDayOff = false;
    let attempts = 0;
    const maxAttempts = 365; // Prevent infinite loops

    while (!foundDayOff && attempts < maxAttempts) {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
      const newDateString = formatDate(newDate);
      if (daysOff.includes(newDateString)) {
        foundDayOff = true;
        setSelectedDate(newDate);
      }
      attempts++;
    }

    if (!foundDayOff) {
      notifications.show({
        title: 'No Day Off Found',
        message: `No ${direction} day off found within ${maxAttempts} days.`,
        color: 'yellow',
      });
    }
  };

  return (
    <Group justify="center" mb="md">
      <Button variant="subtle" onClick={() => navigateDate('prev')}>
        <IconChevronLeft size={18} />
      </Button>
      <Text size="lg" fw={500}>
        {selectedDate ? selectedDate.toDateString() : 'Select a Day Off'}
      </Text>
      <Button variant="subtle" onClick={() => navigateDate('next')}>
        <IconChevronRight size={18} />
      </Button>
    </Group>
  );
};

export default CustomDayOffDatePicker;
