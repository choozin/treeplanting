'use client';
import { useState, useEffect } from 'react';
import { Tabs, Button, Modal, Tooltip, Group, TextInput, NumberInput, Alert, Text, Table, Title, UnstyledButton } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconQuestionMark, IconInfoCircle, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { useAuth } from '../../hooks/useAuth';
import { database } from '../../firebase/firebase';
import { ref, onValue, push, update, remove, query, orderByChild, startAt, endAt } from 'firebase/database';
import { notifications } from '@mantine/notifications';

interface PartialTreeEntry {
  id?: string;
  date?: string;
  species: string;
  stickerCode: string;
  payRate: number;
  numTrees: number;
  note?: string;
  timestamp?: string;
}

const TreeTrackerPage = () => {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [date, setDate] = useState(new Date());
  const [species, setSpecies] = useState('');
  const [stickerCode, setStickerCode] = useState('');
  const [payRate, setPayRate] = useState(0.15);
  const [numTrees, setNumTrees] = useState<string | number>('');
  const [unclaimedPartials, setUnclaimedPartials] = useState<PartialTreeEntry[]>([]);
  const [claimingPartial, setClaimingPartial] = useState<PartialTreeEntry | null>(null);
  const [dailyEntries, setDailyEntries] = useState<any[]>([]);
  const [summaryDateRange, setSummaryDateRange] = useState<[Date | null, Date | null]>([
    new Date(new Date().getFullYear(), 0, 1),
    new Date(),
  ]);
  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (user) {
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

      const userCalendarRef = ref(database, `users/${user.uid}/calendar`);
      onValue(userCalendarRef, (snapshot) => {
        const calendarData = snapshot.val();
        const partials: PartialTreeEntry[] = [];
        if (calendarData) {
          Object.keys(calendarData).forEach(dateStr => {
            const entryDate = new Date(dateStr);
            if (entryDate >= fourWeeksAgo) {
              const dayData = calendarData[dateStr];
              if (dayData.treeTracking && dayData.treeTracking.partials) {
                Object.keys(dayData.treeTracking.partials).forEach(partialId => {
                  partials.push({ id: partialId, date: dateStr, ...dayData.treeTracking.partials[partialId] });
                });
              }
            }
          });
        }
        setUnclaimedPartials(partials);
      });
    }
  }, [user]);

  useEffect(() => {
    if (user && date) {
      const dateString = date.toISOString().split('T')[0];
      const dailyEntriesRef = ref(database, `users/${user.uid}/calendar/${dateString}/treeTracking/entries`);
      onValue(dailyEntriesRef, (snapshot) => {
        const entries: any[] = [];
        if (snapshot.exists()) {
          snapshot.forEach(childSnapshot => {
            entries.push({ id: childSnapshot.key, ...childSnapshot.val() });
          });
        }
        setDailyEntries(entries);
      });
    }
  }, [user, date]);

  useEffect(() => {
    if (user && summaryDateRange[0] && summaryDateRange[1]) {
      const startDate = summaryDateRange[0];
      const endDate = summaryDateRange[1];
      endDate.setHours(23, 59, 59, 999); // Include the entire end day

      const userCalendarRef = ref(database, `users/${user.uid}/calendar`);

      onValue(userCalendarRef, (snapshot) => {
        const data: any[] = [];
        if (snapshot.exists()) {
          snapshot.forEach(dateSnapshot => {
            const dateStr = dateSnapshot.key;
            const entryDate = new Date(dateStr);

            // Client-side filtering based on date range
            if (entryDate >= startDate && entryDate <= endDate) {
              const dayData = dateSnapshot.val();
              if (dayData.treeTracking && dayData.treeTracking.entries) {
                Object.keys(dayData.treeTracking.entries).forEach(entryId => {
                  data.push({ id: entryId, date: dateStr, ...dayData.treeTracking.entries[entryId] });
                });
              }
            }
          });
        }
        setSummaryData(data);
      });
    }
  }, [user, summaryDateRange]);

  const handleClaimPartial = (partial: PartialTreeEntry) => {
    setClaimingPartial(partial);
    setDate(new Date()); // Default to today for the new entry
    setSpecies(partial.species || '');
    setStickerCode(partial.stickerCode || '');
    setPayRate(partial.payRate || 0.15);
    setNumTrees(partial.numTrees || '');
  };

  const handleSubmit = (isPartial: boolean) => {
    if (!user) {
      notifications.show({ title: 'Error', message: 'You must be logged in to submit data.', color: 'red' });
      return;
    }

    const dateString = date.toISOString().split('T')[0];
        const path = isPartial ? `users/${user.uid}/calendar/${dateString}/treeTracking/partials` : `users/${user.uid}/calendar/${dateString}/treeTracking/entries`;
    const entryRef = ref(database, path);

    const entryData: PartialTreeEntry = {
      species,
      stickerCode,
      payRate,
      numTrees: Number(numTrees),
      timestamp: new Date().toISOString(),
    };

    if (claimingPartial) {
      entryData.note = `Includes partial numbers from ${claimingPartial.date}`;
    }

    push(entryRef, entryData).then(() => {
      if (claimingPartial) {
        const oldPartialRef = ref(database, `users/${user.uid}/calendar/${claimingPartial.date}/treeTracking/partials/${claimingPartial.id}`);
        remove(oldPartialRef);
        setClaimingPartial(null);
      }
      notifications.show({ title: 'Success', message: 'Tree data submitted successfully.', color: 'green' });
      // Reset form
      setSpecies('');
      setStickerCode('');
      setPayRate(0.15);
      setNumTrees('');
    }).catch(error => {
      notifications.show({ title: 'Error', message: `Failed to submit data: ${error.message}`, color: 'red' });
    });

    if (isPartial) {
      setIsModalOpen(false);
    }
  };

  const totalTrees = dailyEntries.reduce((acc, entry) => acc + Number(entry.numTrees), 0);
  const totalEarnings = dailyEntries.reduce((acc, entry) => acc + (Number(entry.numTrees) * Number(entry.payRate)), 0);

  const sortedSummaryData = [...summaryData].sort((a, b) => {
    if (!sortKey) return 0;
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const Th = ({ children, sorted, reversed, onSort }: { children: React.ReactNode, sorted: boolean, reversed: boolean, onSort: () => void }) => (
    <th>
      <UnstyledButton onClick={onSort} >
        <Group justify="space-between">
          <Text fw={500} fz="sm">{children}</Text>
          {sorted && (reversed ? <IconChevronUp /> : <IconChevronDown />)}
        </Group>
      </UnstyledButton>
    </th>
  );

  return (
    <Tabs defaultValue="enter-data" style={{ margin: '20px' }}>
      <Tabs.List>
        <Tabs.Tab value="enter-data">Enter Data</Tabs.Tab>
        <Tabs.Tab value="summaries">Summaries</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="enter-data">
        {unclaimedPartials.length > 0 && (
          <Alert icon={<IconInfoCircle size="1rem" />} title="Unclaimed Partials" color="orange" withCloseButton onClose={() => setUnclaimedPartials([])}>
            <Text>You have unclaimed partials from previous days:</Text>
            {unclaimedPartials.map(p => (
              <Group key={p.id} mt="sm">
                <Text size="sm">{p.date}: {p.numTrees} {p.species} trees</Text>
                <Button size="xs" variant="outline" onClick={() => handleClaimPartial(p)}>Complete & Claim</Button>
              </Group>
            ))}
          </Alert>
        )}

        <DatePickerInput
          label="Date"
          value={date}
          onChange={(d) => setDate(d || new Date())}
        />
        <TextInput
          label="Species"
          placeholder="e.g. Black Spruce"
          value={species}
          onChange={(event) => setSpecies(event.currentTarget.value)}
        />
        <TextInput
          label="Sticker Code (optional)"
          placeholder="e.g. 12345"
          value={stickerCode}
          onChange={(event) => setStickerCode(event.currentTarget.value)}
        />
        <NumberInput
          label="Pay Rate"
          value={payRate}
          onChange={(val) => setPayRate(val as number)}
        // Removed precision and step props due to Mantine update
        />
        <NumberInput
          label="Number of Trees Planted"
          placeholder="e.g. 2500"
          value={numTrees}
          onChange={(val) => setNumTrees(val as number)}
        />
        <Group mt="md">
          <Button onClick={() => handleSubmit(false)}>Submit Planted Tree Numbers</Button>
          <Button variant="outline" onClick={() => setIsModalOpen(true)}>Record Unclaimed Partial Numbers</Button>
          <Tooltip label="Record trees that you haven't finished planting yet.">
            <IconQuestionMark size={18} />
          </Tooltip>
        </Group>

        <Title order={4} mt="xl">Daily Totals for {date.toLocaleDateString()}</Title>
        <Table>
          <thead>
            <tr>
              <th>Species</th>
              <th>Pay Rate</th>
              <th>Number of Trees</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {dailyEntries.map(entry => (
              <tr key={entry.id}>
                <td>{entry.species}</td>
                <td>${entry.payRate.toFixed(2)}</td>
                <td>{entry.numTrees}</td>
                <td>${(entry.numTrees * entry.payRate).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Group mt="md">
          <Text>Total Trees: {totalTrees}</Text>
          <Text>Total Earnings: ${totalEarnings.toFixed(2)}</Text>
        </Group>
      </Tabs.Panel>

      <Tabs.Panel value="summaries">
        <Group>
          <DatePickerInput
            label="From"
            value={summaryDateRange[0]}
            onChange={(d) => setSummaryDateRange([d, summaryDateRange[1]])}
          />
          <DatePickerInput
            label="Until"
            value={summaryDateRange[1]}
            onChange={(d) => setSummaryDateRange([summaryDateRange[0], d])}
          />
        </Group>
        <Table mt="md">
          <thead>
            <tr>
              <Th sorted={sortKey === 'date'} reversed={sortOrder === 'desc'} onSort={() => handleSort('date')}>Date</Th>
              <Th sorted={sortKey === 'species'} reversed={sortOrder === 'desc'} onSort={() => handleSort('species')}>Species</Th>
              <Th sorted={sortKey === 'stickerCode'} reversed={sortOrder === 'desc'} onSort={() => handleSort('stickerCode')}>Sticker Code</Th>
              <Th sorted={sortKey === 'payRate'} reversed={sortOrder === 'desc'} onSort={() => handleSort('payRate')}>Pay Rate</Th>
              <th>Number of Trees</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {sortedSummaryData.map(entry => (
              <tr key={entry.id}>
                <td>{entry.date}</td>
                <td>{entry.species}</td>
                <td>{entry.stickerCode}</td>
                <td>${entry.payRate.toFixed(2)}</td>
                <td>{entry.numTrees}</td>
                <td>${(entry.numTrees * entry.payRate).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Group mt="md">
          <Text>Total Trees: {summaryData.reduce((acc, entry) => acc + Number(entry.numTrees), 0)}</Text>
          <Text>Total Earnings: ${summaryData.reduce((acc, entry) => acc + (Number(entry.numTrees) * Number(entry.payRate)), 0).toFixed(2)}</Text>
        </Group>
      </Tabs.Panel>

      <Modal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Unclaimed Partial Numbers"
      >
        <p>By clicking this button, the numbers for the entry you're submitting will not be added to your daily totals. Instead, it will be added to a list of "Unclaimed Partials" that you will have the ability to finish in the future. This will help you make sure you don't forget about it.</p>
        <Group mt="md">
          <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
          <Button onClick={() => handleSubmit(true)}>Record Partials</Button>
        </Group>
      </Modal>
    </Tabs>
  );
};

export default TreeTrackerPage;