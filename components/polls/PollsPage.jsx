'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IconAlertCircle,
  IconArrowDown,
  IconArrowUp,
  IconChartBar,
  IconCircleCheck,
  IconCircleX,
  IconHelpCircle,
  IconPencil,
  IconPlus,
  IconSend,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import {
  ref as firebaseDatabaseRef,
  get,
  increment,
  onValue,
  push,
  remove,
  serverTimestamp,
  set,
  update,
} from 'firebase/database';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Accordion,
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Flex,
  Group,
  Modal,
  MultiSelect,
  Paper,
  Progress,
  Radio,
  ScrollArea,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { database } from '../../firebase/firebase';



const formatDate = (isoStringOrTimestamp) => {
  if (!isoStringOrTimestamp || typeof isoStringOrTimestamp === 'object') return 'N/A';
  try {
    const date = new Date(isoStringOrTimestamp);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return 'Invalid Date';
  }
};

const pollItemStyle = (isClosedOrPending) => ({
  padding: '1rem',
  border: '1px solid #e0e0e0',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
  backgroundColor: 'var(--mantine-color-body)',
  color: isClosedOrPending ? 'var(--mantine-color-dimmed)' : 'var(--mantine-color-text)',
  opacity: isClosedOrPending ? 0.7 : 1,
});

const PollListItem = React.memo(
  ({
    poll,
    isClosed,
    onSelect,
    usersDataMap,
  }) => (
    <motion.div
      className="poll-list-item"
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      style={pollItemStyle(isClosed)}
      onClick={() => onSelect(poll)}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => e.key === 'Enter' && onSelect(poll)}
    >
      <Text fw={500} size="lg" mb={4}>
        {poll.questionText}
      </Text>
      <Text size="xs" c="dimmed">
        {poll.closesAt && <>Closes on: {formatDate(poll.closesAt)} &bull; </>}
        Created by: {usersDataMap[poll.createdByUserID] || 'Unknown'}
      </Text>
    </motion.div>
  )
);
PollListItem.displayName = 'PollListItem';

const RankedVoteHelpModal = ({ opened, onClose }) => (
  <Modal
    opened={opened}
    onClose={onClose}
    title="How Ranked Ballot Voting Works"
    size="lg"
    centered
    zIndex={2000}
  >
    <Stack gap="md">
      <Text>
        This system helps find the option that the most people prefer overall, not just the one with
        the most first-place votes.
      </Text>
      <div>
        <Text fw={700}>1. Rank Your Choices</Text>
        <Text size="sm">
          Instead of picking just one, you rank the options in your order of preference (1st, 2nd,
          3rd, and so on). You don't have to rank all of them.
        </Text>
      </div>
      <div>
        <Text fw={700}>2. Count the First Choices</Text>
        <Text size="sm">
          We first count everyone's #1 vote. If any single option has more than 50% of the #1 votes,
          it wins outright!
        </Text>
      </div>
      <div>
        <Text fw={700}>3. Eliminate and Redistribute</Text>
        <Text size="sm">
          If no option has a majority, the one with the fewest votes is eliminated. If your favorite
          choice was just eliminated, your vote isn't wasted! It automatically transfers to your
          next highest-ranked choice.
        </Text>
      </div>
      <div>
        <Text fw={700}>4. Repeat Until There's a Winner</Text>
        <Text size="sm">
          This cycle of counting, eliminating, and redistributing votes continues until one option
          has a majority of the remaining votes.
        </Text>
      </div>
      <Button onClick={onClose} mt="md">
        Got it!
      </Button>
    </Stack>
  </Modal>
);

const RankedVoteInterface = ({ poll, onVote, }) => {
  const [rankedOrder, setRankedOrder] = useState([]);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  const availableOptions = useMemo(
    () =>
      Object.entries(poll.options || {})
        .filter(([optionId, opt]) => opt.isApproved && !rankedOrder.includes(optionId))
        .map(([optionId, opt]) => ({ id: optionId, text: opt.text })),
    [poll.options, rankedOrder]
  );

  const handleSelectOption = (optionId) => {
    setRankedOrder((prev) => [...prev, optionId]);
  };

  const handleRemoveOption = (optionId) => {
    setRankedOrder((prev) => prev.filter((id) => id !== optionId));
  };

  const moveOption = (index, direction) => {
    const newOrder = [...rankedOrder];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newOrder.length) return;
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    setRankedOrder(newOrder);
  };

  return (
    <Box>
      <RankedVoteHelpModal opened={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
      <Button
        variant="subtle"
        size="xs"
        onClick={() => setIsHelpModalOpen(true)}
        leftSection={<IconHelpCircle size={16} />}
        mb="md"
      >
        How does this work?
      </Button>
      <Flex direction={{ base: 'column', sm: 'row' }} gap="xl">
        <Stack style={{ flex: 1 }}>
          <Text fw={500}>Available Options</Text>
          {availableOptions.length > 0 ? (
            availableOptions.map((opt) => (
              <Button key={opt.id} variant="outline" onClick={() => handleSelectOption(opt.id)}>
                {opt.text}
              </Button>
            ))
          ) : (
            <Text c="dimmed" size="sm">
              All options have been ranked.
            </Text>
          )}
        </Stack>
        <Divider orientation="vertical" />
        <Stack style={{ flex: 1 }}>
          <Text fw={500}>Your Rankings</Text>
          {rankedOrder.length > 0 ? (
            rankedOrder.map((optionId, index) => (
              <Paper
                key={optionId}
                p="xs"
                withBorder
                shadow="xs"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Group>
                  <Text fw={700} c="blue">
                    {index + 1}.
                  </Text>
                  <Text>{poll.options[optionId]?.text || 'Option not found'}</Text>
                </Group>
                <Group gap="xs">
                  <ActionIcon
                    variant="light"
                    onClick={() => moveOption(index, -1)}
                    disabled={index === 0}
                  >
                    <IconArrowUp size={16} />
                  </ActionIcon>
                  <ActionIcon
                    variant="light"
                    onClick={() => moveOption(index, 1)}
                    disabled={index === rankedOrder.length - 1}
                  >
                    <IconArrowDown size={16} />
                  </ActionIcon>
                  <ActionIcon
                    color="red"
                    variant="light"
                    onClick={() => handleRemoveOption(optionId)}
                  >
                    <IconX size={16} />
                  </ActionIcon>
                </Group>
              </Paper>
            ))
          ) : (
            <Text c="dimmed" size="sm">
              Click an option on the left to start ranking.
            </Text>
          )}
        </Stack>
      </Flex>
      <Button
        onClick={() => onVote(rankedOrder)}
        disabled={rankedOrder.length === 0}
        mt="xl"
        size="md"
        fullWidth
      >
        Submit Ranked Vote
      </Button>
    </Box>
  );
};

const calculateRankedChoiceWinner = (
  poll
) => {
  if (!poll.usersVoted || Object.keys(poll.usersVoted).length === 0) {
    return { rounds: [], winner: null, error: 'No votes have been cast yet.' };
  }
  const ballots = Object.values(poll.usersVoted).filter(
    (vote) => Array.isArray(vote) && vote.length > 0
  );
  let activeOptions = Object.keys(poll.options || {}).filter(
    (optId) => poll.options[optId]?.isApproved
  );
  const rounds = [];
  const totalVoters = ballots.length;
  if (totalVoters === 0) {
    return { rounds: [], winner: null, error: 'No valid ranked ballots were found.' };
  }
  while (activeOptions.length > 1) {
    const voteCounts = activeOptions.reduce(
      (acc, optId) => ({ ...acc, [optId]: 0 }),
      {}
    );
    let exhaustedBallots = 0;
    for (const ballot of ballots) {
      let voted = false;
      for (const choice of ballot) {
        if (activeOptions.includes(choice)) {
          voteCounts[choice]++;
          voted = true;
          break;
        }
      }
      if (!voted) {
        exhaustedBallots++;
      }
    }
    const currentRound = {
      round: rounds.length + 1,
      voteCounts: { ...voteCounts },
      eliminated: null,
      winner: null,
      exhaustedBallots,
    };
    const votesInPlay = totalVoters - exhaustedBallots;
    if (votesInPlay <= 0) {
      const lastRoundCounts = rounds.length > 0 ? rounds[rounds.length - 1].voteCounts : {};
      const sortedByVotes = Object.keys(lastRoundCounts).sort(
        (a, b) => lastRoundCounts[b] - lastRoundCounts[a]
      );
      currentRound.winner = sortedByVotes[0] || 'undetermined';
      rounds.push(currentRound);
      return { rounds, winner: currentRound.winner };
    }
    for (const optId of activeOptions) {
      if (voteCounts[optId] > votesInPlay / 2) {
        currentRound.winner = optId;
        rounds.push(currentRound);
        return { rounds, winner: optId };
      }
    }
    if (
      activeOptions.length === 2 &&
      voteCounts[activeOptions[0]] === voteCounts[activeOptions[1]]
    ) {
      currentRound.winner = 'tie';
      rounds.push(currentRound);
      return { rounds, winner: 'tie' };
    }
    let minVotes = Infinity;
    activeOptions.forEach((optId) => {
      if (voteCounts[optId] < minVotes) {
        minVotes = voteCounts[optId];
      }
    });
    const toEliminate = activeOptions.find((optId) => voteCounts[optId] === minVotes);
    if (!toEliminate) break;
    currentRound.eliminated = toEliminate;
    activeOptions = activeOptions.filter((id) => id !== toEliminate);
    rounds.push(currentRound);
  }
  const finalWinner = activeOptions[0] || null;
  if (rounds.length > 0 && !rounds[rounds.length - 1].winner) {
    rounds[rounds.length - 1].winner = finalWinner;
  }
  return { rounds, winner: finalWinner };
};

const RankedResultsDisplay = ({ poll }) => {
  const { rounds, winner, error } = useMemo(() => calculateRankedChoiceWinner(poll), [poll]);
  if (error) {
    return (
      <Alert color="blue" title="Results" icon={<IconAlertCircle />}>
        {error}
      </Alert>
    );
  }
  if (!poll || !poll.options) return <Text>Loading results...</Text>;
  return (
    <ScrollArea style={{ maxHeight: '50vh' }}>
      <Stack>
        {rounds.map((round, index) => (
          <Paper key={index} p="md" withBorder radius="md">
            <Title order={4}>Round {round.round}</Title>
            {Object.entries(round.voteCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([optionId, count]) => {
                const totalVotesInRound = Object.values(round.voteCounts).reduce(
                  (a, b) => a + b,
                  0
                );
                const percentage =
                  totalVotesInRound > 0 ? Math.round((count / totalVotesInRound) * 100) : 0;
                return (
                  <Box key={optionId} my="sm">
                    <Group justify="space-between">
                      <Text>{poll.options[optionId]?.text || 'Unknown Option'}</Text>
                      <Text c="dimmed">{count} votes</Text>
                    </Group>
                    <Progress.Root size="xl" radius="sm">
                      <Progress.Section
                        value={percentage}
                        color={round.eliminated === optionId ? 'red' : 'teal'}
                      >
                        {percentage > 10 && <Progress.Label>{percentage}%</Progress.Label>}
                      </Progress.Section>
                    </Progress.Root>
                  </Box>
                );
              })}
            {round.eliminated && (
              <Text c="red" mt="sm">
                Eliminated: <strong>{poll.options[round.eliminated]?.text}</strong>
              </Text>
            )}
          </Paper>
        ))}
        {winner && (
          <Alert color="green" title="Winner Declared!" icon={<IconCircleCheck />} mt="lg">
            {winner === 'tie'
              ? 'The result is a tie!'
              : `The winner is: ${poll.options[winner]?.text || 'undetermined'}`}
          </Alert>
        )}
      </Stack>
    </ScrollArea>
  );
};

const PollsPage = ({ user, campID, userData, effectiveRole }) => {
  const [polls, setPolls] = useState([]);
  const [usersDataMap, setUsersDataMap] = useState({});
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [userVotes, setUserVotes] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedOption, setSelectedOption] = useState('');
  const [newOptionText, setNewOptionText] = useState('');
  const [optionSubmissionMessage, setOptionSubmissionMessage] = useState('');

  const [pollCreationStep, setPollCreationStep] = useState(null);
  const [newPollType, setNewPollType] = useState('standard');
  const [newPollData, setNewPollData] = useState({
    questionText: '',
    description: '',
    options: ['', ''],
    closesAtDate: '',
    closesAtTime: '',
    allowUserOptionSubmissions: true,
    resultsVisibility: 'after_voting',
    tags: [],
  });

  // --- Permission Helpers ---
  const canUserCreatePoll = useCallback(() => effectiveRole >= 2, [effectiveRole]);
  const canUserApprovePoll = useCallback(() => effectiveRole >= 3, [effectiveRole]);
  const canUserRejectPoll = useCallback(() => effectiveRole >= 4, [effectiveRole]);
  const canUserManageOption = useCallback(() => effectiveRole >= 3, [effectiveRole]);

  // Fetch all users once to map creator IDs to names
  useEffect(() => {
    const usersRefGlobal = firebaseDatabaseRef(database, 'users');
    const unsubscribeUsers = onValue(
      usersRefGlobal,
      (snapshot) => {
        if (snapshot.exists()) {
          const users = snapshot.val();
          const map = {};
          for (const uid in users) {
            map[uid] = users[uid].name || 'Unknown User';
          }
          setUsersDataMap(map);
        }
      },
      (errorObject) => {
        notifications.show({
          title: 'Error',
          message: 'Error fetching global users for map: ' + errorObject.message,
          color: 'red',
        });
      }
    );
    return () => unsubscribeUsers();
  }, []);

  // Fetch polls and user's vote status
  useEffect(() => {
    if (!campID || !user) {
      setPolls([]);
      setUserVotes({});
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const pollsPath = `camps/${campID}/polls`;
    const pollsRef = firebaseDatabaseRef(database, pollsPath);

    const unsubscribePolls = onValue(
      pollsRef,
      async (snapshot) => {
        const pollsData = snapshot.val();
        if (pollsData) {
          const pollsArray = [];
          const voteCheckPromises = [];

          for (const pollId in pollsData) {
            pollsArray.push({ id: pollId, ...pollsData[pollId] });
            const userVotePath = `${pollsPath}/${pollId}/usersVoted/${user.uid}`;
            voteCheckPromises.push(
              get(firebaseDatabaseRef(database, userVotePath)).then((voteSnap) => ({
                pollId,
                voteData: voteSnap.val(),
              }))
            );
          }

          pollsArray.sort(
            (a, b) => ((b.createdAt) || 0) - ((a.createdAt) || 0)
          );
          setPolls(pollsArray);

          const votesResults = await Promise.all(voteCheckPromises);
          const newUserVotes = votesResults.reduce(
            (acc, voteInfo) => {
              acc[voteInfo.pollId] = voteInfo.voteData;
              return acc;
            },
            {});
          setUserVotes(newUserVotes);
          setError(null);
        } else {
          setPolls([]);
          setUserVotes({});
          setError(null);
        }
        setIsLoading(false);
      },
      (err) => {
        notifications.show({
          title: 'Error',
          message: 'Error fetching polls: ' + err.message,
          color: 'red',
        });
      }
    );

    return () => unsubscribePolls();
  }, [campID, user]);

  const handlePollSelect = (poll) => {
    setSelectedPoll(poll);
    setSelectedOption('');
    setNewOptionText('');
    setOptionSubmissionMessage('');
  };

  const handleCloseModal = () => setSelectedPoll(null);

  const handleNewPollInputChange = (field, value) => {
    setNewPollData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNewPollOptionChange = (index, value) => {
    const updatedOptions = [...newPollData.options];
    updatedOptions[index] = value;
    setNewPollData((prev) => ({ ...prev, options: updatedOptions }));
  };

  const addPollOptionField = () =>
    setNewPollData((prev) => ({ ...prev, options: [...prev.options, ''] }));

  const removePollOptionField = (index) => {
    if (newPollData.options.length <= 2) {
      notifications.show({
        title: 'Error',
        message: 'A poll must have at least two options.',
        color: 'red',
      });
      return;
    }
    setNewPollData((prev) => ({ ...prev, options: prev.options.filter((_, i) => i !== index) }));
  };

  const handleCloseCreatePoll = () => {
    setPollCreationStep(null);
    setNewPollData({
      questionText: '',
      description: '',
      options: ['', ''],
      closesAtDate: '',
      closesAtTime: '',
      allowUserOptionSubmissions: true,
      resultsVisibility: 'after_voting',
      tags: [],
    });
  };

  const handleCreatePollSubmit = async () => {
    if (!newPollData.questionText.trim() || !user) {
      notifications.show({
        title: 'Error',
        message: 'Poll question cannot be empty.',
        color: 'red',
      });
      return;
    }
    const validOptions = newPollData.options.filter((opt) => opt.trim() !== '');
    if (validOptions.length < 2) {
      notifications.show({
        title: 'Error',
        message: 'Please provide at least two valid options.',
        color: 'red',
      });
      return;
    }

    let combinedClosesAt = null;
    if (newPollData.closesAtDate) {
      const timePart = newPollData.closesAtTime || '00:00';
      combinedClosesAt = new Date(`${newPollData.closesAtDate}T${timePart}`).toISOString();
    }

    const isCreatorAdmin = effectiveRole >= 3;
    const pollObject = {
      questionText: newPollData.questionText.trim(),
      // Fix: Only include description if it's not an empty string
      ...(newPollData.description.trim() !== '' && { description: newPollData.description.trim() }),
      pollType: newPollType,
      options: validOptions.reduce(
        (obj, optionText, index) => {
          obj[`initial_opt_${index + 1}`] = {
            text: optionText.trim(),
            createdByUserID: user.uid,
            isInitialOption: true,
            isApproved: true,
            voteCount: 0,
          };
          return obj;
        },
        {}),
      closesAt: combinedClosesAt,
      allowUserOptionSubmissions:
        newPollType === 'standard' ? newPollData.allowUserOptionSubmissions : false,
      resultsVisibility: newPollData.resultsVisibility,
      tags: newPollData.tags || [],
      createdByUserID: user.uid,
      creatorRoleAtCreation: effectiveRole,
      isApprovedForDisplay: isCreatorAdmin,
      approvedByUserID: isCreatorAdmin ? user.uid : null,
      approvedAt: isCreatorAdmin ? serverTimestamp() : null,
      isRejectedForDisplay: false,
      isOpenForVoting:
        isCreatorAdmin && (!combinedClosesAt || new Date(combinedClosesAt) > new Date()),
      usersVoted: {},
      maxVotesPerUser: 1,
      createdAt: serverTimestamp(),
      lastUpdatedAt: serverTimestamp(),
    };

    try {
      const newPollRef = push(firebaseDatabaseRef(database, `camps/${campID}/polls`));
      await set(newPollRef, pollObject);
      notifications.show({
        title: 'Poll Created',
        message: isCreatorAdmin
          ? 'Poll created and automatically approved!'
          : 'Poll created! It needs approval from a Moderator or higher to be displayed.',
        color: 'green',
      });
      handleCloseCreatePoll();
    } catch (e) {
      notifications.show({
        title: 'Error',
        title: 'Error',
        message: 'Failed to create poll: ' + e.message,
        color: 'red',
      });
    }
  };

  const handlePollDisplayApproval = async (pollId, approve) => {
    if (!user) return;
    const pollToUpdate = polls.find((p) => p.id === pollId);
    if (!pollToUpdate) return;

    const updates = {};
    if (approve) {
      updates[`isApprovedForDisplay`] = true;
      updates[`isOpenForVoting`] =
        !pollToUpdate.closesAt || new Date(pollToUpdate.closesAt) > new Date();
      updates[`approvedByUserID`] = user.uid;
      updates[`approvedAt`] = serverTimestamp();
      updates[`isRejectedForDisplay`] = false;
    } else {
      updates[`isApprovedForDisplay`] = false;
      updates[`isOpenForVoting`] = false;
      updates[`isRejectedForDisplay`] = true;
    }
    updates[`lastUpdatedAt`] = serverTimestamp();

    try {
      await update(firebaseDatabaseRef(database, `camps/${campID}/polls/${pollId}`), updates);
      notifications.show({
        title: 'Success',
        message: `Poll ${approve ? 'approved' : 'rejected'} successfully.`,
        color: 'green',
      });
    } catch (e) {
      notifications.show({
        title: 'Error',
        message: `Failed to ${approve ? 'approve' : 'reject'} poll: ${e.message}`,
        color: 'red',
      });
    }
  };

  const handleSubmittedOptionApproval = async (
    pollId,
    optionId,
    approve
  ) => {
    if (!user) return;
    const optionUpdates = {};
    if (approve) {
      optionUpdates[`isApproved`] = true;
      optionUpdates[`approvedByUserID`] = user.uid;
      optionUpdates[`optionApprovedAt`] = serverTimestamp();
      optionUpdates[`isRejected`] = false;
    } else {
      optionUpdates[`isApproved`] = false;
      optionUpdates[`isRejected`] = true;
    }

    try {
      await update(
        firebaseDatabaseRef(database, `camps/${campID}/polls/${pollId}/options/${optionId}`),
        optionUpdates
      );
      await update(firebaseDatabaseRef(database, `camps/${campID}/polls/${pollId}`), {
        lastUpdatedAt: serverTimestamp(),
      });
      notifications.show({
        title: 'Success',
        message: `Option ${approve ? 'approved' : 'rejected'} successfully.`,
        color: 'green',
      });
    } catch (e) {
      notifications.show({
        title: 'Error',
        message: `Failed to ${approve ? 'approve' : 'reject'} option: ${e.message}`,
        color: 'red',
      });
    }
  };

  const handleVoteSubmit = async (voteData) => {
    const finalVoteData = selectedPoll?.pollType === 'ranked_ballot' ? voteData : selectedOption;

    if (
      !finalVoteData ||
      (Array.isArray(finalVoteData) && finalVoteData.length === 0) ||
      !selectedPoll ||
      !user ||
      !campID
    ) {
      notifications.show({
        title: 'Error',
        message: 'Please make a selection before submitting.',
        color: 'red',
      });
      return;
    }
    if (userVotes[selectedPoll.id]) {
      notifications.show({
        title: 'Info',
        message: 'You have already voted in this poll.',
        color: 'blue',
      });
      return;
    }

    const updates = {};
    updates[`camps/${campID}/polls/${selectedPoll.id}/usersVoted/${user.uid}`] = finalVoteData;
    updates[`camps/${campID}/polls/${selectedPoll.id}/lastUpdatedAt`] = serverTimestamp();

    if (selectedPoll.pollType !== 'ranked_ballot' && typeof finalVoteData === 'string') {
      updates[`camps/${campID}/polls/${selectedPoll.id}/options/${finalVoteData}/voteCount`] =
        increment(1);
    }

    try {
      await update(firebaseDatabaseRef(database), updates);
      setUserVotes((prev) => ({ ...prev, [selectedPoll.id]: finalVoteData }));
    } catch (e) {
      notifications.show({
        title: 'Error',
        message: 'Failed to submit vote: ' + e.message,
        color: 'red',
      });
    }
  };

  const handleOptionSuggestionSubmit = async () => {
    if (!newOptionText.trim() || !selectedPoll || !user || !campID) {
      notifications.show({
        title: 'Error',
        message: 'Please enter an option to suggest.',
        color: 'red',
      });
      return;
    }

    const newOptionRef = push(
      firebaseDatabaseRef(database, `camps/${campID}/polls/${selectedPoll.id}/options`)
    );
    const optionData =
      {
        text: newOptionText.trim(),
        createdByUserID: user.uid,
        submittedAt: serverTimestamp(),
        isInitialOption: false,
        isApproved: false,
        isRejected: false,
      };
    optionData.voteCount = 0;

    const updates = {};
    updates[`camps/${campID}/polls/${selectedPoll.id}/options/${newOptionRef.key}`] = optionData;
    updates[`camps/${campID}/polls/${selectedPoll.id}/lastUpdatedAt`] = serverTimestamp();

    try {
      await update(firebaseDatabaseRef(database), updates);
      setOptionSubmissionMessage(
        "Option submitted, awaiting approval. If you'd like to vote for this option, please wait until it has been approved, then vote for it from the updated list. You may continue to submit additional option suggestions."
      );
      setNewOptionText('');
    } catch (e) {
      notifications.show({
        title: 'Error',
        message: 'Error submitting option: ' + e.message,
        color: 'red',
      });
    }
  };

  const calculateTotalVotes = (poll) => {
    if (!poll || !poll.options) return 0;
    return Object.values(poll.options)
      .filter((opt) => opt.isApproved)
      .reduce((sum, opt) => sum + (opt.voteCount || 0), 0);
  };

  const pollsAwaitingDisplayApproval = polls.filter(
    (p) => !p.isApprovedForDisplay && !p.isRejectedForDisplay
  );
  const optionsAwaitingApproval = polls.reduce(
    (acc, poll) => {
      if (poll.options) {
        Object.entries(poll.options).forEach(([optionId, option]) => {
          if (!option.isInitialOption && !option.isApproved && !option.isRejected) {
            if (canUserManageOption()) {
              acc.push({ ...option, optionId, pollId: poll.id, pollQuestion: poll.questionText });
            }
          }
        });
      }
      return acc;
    },
    []);

  const openAndApprovedPolls = polls.filter(
    (p) => p.isApprovedForDisplay && !p.isRejectedForDisplay && p.isOpenForVoting
  );
  const closedOrNotOpenButApprovedPolls = polls.filter(
    (p) => p.isApprovedForDisplay && !p.isRejectedForDisplay && !p.isOpenForVoting
  );

  const listContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '2rem',
  };

  const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1050,
  };
  const modalContentStyle = {
    backgroundColor: 'var(--mantine-color-body)',
    padding: '2rem',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '700px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
  };
  const modalHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  };
  const modalBodyStyle = { flexGrow: 1, minHeight: 0 };
  const adminSectionStyle = {
    padding: '1rem',
    marginBottom: '2rem',
    border: '1px dashed var(--mantine-color-gray-4)',
    borderRadius: 'var(--mantine-radius-md)',
    backgroundColor: 'var(--mantine-color-gray-0)',
  };

  if (isLoading) {
    return (
      <Paper p="xl" shadow="xs" style={{ textAlign: 'center' }}>
        <Text>Loading polls...</Text>
      </Paper>
    );
  }
  if (error) {
    return (
      <Paper p="xl" shadow="xs" style={{ textAlign: 'center' }}>
        <Text c="red">{error}</Text>
      </Paper>
    );
  }
  if (!user || !campID) {
    return (
      <Container size="xs" mt="xl">
        <Alert
          icon={<IconAlertCircle size="1.2rem" />}
          title="Access Denied"
          color="orange"
          radius="md"
        >
          Please log in and select a camp to view or manage polls.
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="lg" style={{ marginTop: '2rem', marginBottom: '4rem' }}>
      <Title
        order={2}
        style={{
          marginBottom: '1.5rem',
          textAlign: 'center',
          color: 'var(--mantine-color-blue-7)',
        }}
      >
        Camp Polls for {(campID && userData?.assignedCamps?.[campID]?.campName) || 'Your Camp'}
      </Title>

      {canUserCreatePoll() && (
        <Box style={{ marginBottom: '2rem' }}>
          <Button
            onClick={() => setPollCreationStep('type_selection')}
            leftSection={<IconPlus size={18} />}
            variant="gradient"
            gradient={{ from: 'teal', to: 'lime', deg: 105 }}
            mb="md"
          >
            Create New Poll
          </Button>
        </Box>
      )}

      <Modal
        opened={pollCreationStep === 'type_selection'}
        onClose={handleCloseCreatePoll}
        title="Choose Poll Type"
        centered
      >
        <Stack>
          <Text>What kind of poll would you like to create?</Text>
          <Button
            onClick={() => {
              setNewPollType('standard');
              setPollCreationStep('form_details');
            }}
          >
            Standard 1-Vote Poll
          </Button>
          <Button
            onClick={() => {
              setNewPollType('ranked_ballot');
              setPollCreationStep('form_details');
            }}
            variant="light"
          >
            Ranked Ballot Poll
          </Button>
        </Stack>
      </Modal>

      <Modal
        opened={pollCreationStep === 'form_details'}
        onClose={handleCloseCreatePoll}
        title={`Create New ${newPollType === 'ranked_ballot' ? 'Ranked Ballot' : 'Standard'} Poll`}
        size="lg"
      >
        <Paper p="md" withBorder={false}>
          <Stack gap="sm">
            <TextInput
              label="Poll Question"
              placeholder="e.g., What's for Friday dinner?"
              value={newPollData.questionText}
              onChange={(e) => handleNewPollInputChange('questionText', e.currentTarget.value)}
              required
            />
            <Textarea
              label="Description (Optional)"
              placeholder="Add more context here..."
              value={newPollData.description}
              onChange={(e) => handleNewPollInputChange('description', e.currentTarget.value)}
            />
            <Text fw={500} size="sm">
              Options (min. 2)
            </Text>
            {newPollData.options.map((option, index) => (
              <Group key={index} wrap="nowrap">
                <TextInput
                  style={{ flexGrow: 1 }}
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => handleNewPollOptionChange(index, e.currentTarget.value)}
                  required={index < 2}
                />
                {newPollData.options.length > 2 && (
                  <ActionIcon
                    color="red"
                    onClick={() => removePollOptionField(index)}
                    title="Remove option"
                  >
                    <IconX size={16} />
                  </ActionIcon>
                )}
              </Group>
            ))}
            <Button
              onClick={addPollOptionField}
              variant="light"
              size="xs"
              leftSection={<IconPlus size={14} />}
            >
              Add Option
            </Button>
            <Radio.Group
              label="Results Visibility"
              value={newPollData.resultsVisibility}
              onChange={(value) =>
                handleNewPollInputChange('resultsVisibility', value)
              }
              required
              mt="sm"
            >
              <Group mt="xs">
                <Radio value="always_visible" label="Always Visible" />
                <Radio value="after_voting" label="After Voting" />
                <Radio value="after_close" label="After Poll Closes" />
                <Radio value="admin_only" label="Admins Only" />
              </Group>
            </Radio.Group>
            <Button
              onClick={handleCreatePollSubmit}
              mt="md"
              leftSection={<IconPlus size={18} />}
              size="md"
            >
              Create Poll
            </Button>
          </Stack>
        </Paper>
      </Modal>

      {(canUserApprovePoll() || canUserRejectPoll()) &&
        (pollsAwaitingDisplayApproval.length > 0 || optionsAwaitingApproval.length > 0) && (
          <Paper p="lg" radius="md" withBorder style={adminSectionStyle}>
            <Title order={3} mb="lg" c="orange.7">
              Admin Approval Area
            </Title>
            {pollsAwaitingDisplayApproval.length > 0 && (
              <Box mb="xl">
                <Title order={4} mb="sm">
                  Polls Awaiting Display Approval
                </Title>
                {pollsAwaitingDisplayApproval.map((poll) => (
                  <Paper key={poll.id} p="sm" shadow="xs" withBorder radius="sm" mb="xs">
                    <Text fw={500}>{poll.questionText}</Text>
                    <Text size="xs" c="dimmed">
                      Created by: {usersDataMap[poll.createdByUserID] || 'Unknown'} on{' '}
                      {formatDate(poll.createdAt)}
                    </Text>
                    <Group mt="xs">
                      {canUserApprovePoll() && (
                        <Button
                          size="xs"
                          color="green"
                          onClick={() => handlePollDisplayApproval(poll.id, true)}
                          leftSection={<IconCircleCheck size={16} />}
                        >
                          Approve & Open
                        </Button>
                      )}
                      {canUserRejectPoll() && (
                        <Button
                          size="xs"
                          color="red"
                          onClick={() => handlePollDisplayApproval(poll.id, false)}
                          leftSection={<IconCircleX size={16} />}
                        >
                          Reject
                        </Button>
                      )}
                    </Group>
                  </Paper>
                ))}
              </Box>
            )}
            {optionsAwaitingApproval.map((opt) => (
              <Paper key={opt.optionId} p="sm" shadow="xs" withBorder radius="sm" mb="xs">
                <Text>
                  Option:{' '}
                  <Text span fw={500}>
                    "{opt.text}"
                  </Text>
                </Text>
                <Text size="xs" c="dimmed">
                  For Poll: "{opt.pollQuestion}"
                </Text>
                <Text size="xs" c="dimmed">
                  Suggested by: {usersDataMap[opt.createdByUserID] || 'Unknown'} on{' '}
                  {formatDate(opt.submittedAt)}
                </Text>
                <Group mt="xs">
                  <Button
                    size="xs"
                    color="green"
                    onClick={() => handleSubmittedOptionApproval(opt.pollId, opt.optionId, true)}
                    leftSection={<IconCircleCheck size={16} />}
                  >
                    Approve
                  </Button>
                  <Button
                    size="xs"
                    color="red"
                    onClick={() => handleSubmittedOptionApproval(opt.pollId, opt.optionId, false)}
                    leftSection={<IconCircleX size={16} />}
                  >
                    Reject
                  </Button>
                </Group>
              </Paper>
            ))}
          </Paper>
        )}

      {openAndApprovedPolls.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Title
            order={4}
            style={{
              marginBottom: '1rem',
              color: 'var(--mantine-color-gray-7)',
              marginTop: '2rem',
            }}
          >
            Open Polls
          </Title>
          <div style={listContainerStyle}>
            {openAndApprovedPolls.map((poll) => (
              <PollListItem
                key={poll.id}
                poll={poll}
                isClosed={false}
                onSelect={handlePollSelect}
                usersDataMap={usersDataMap}
              />
            ))}
          </div>
        </motion.div>
      )}

      {closedOrNotOpenButApprovedPolls.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ marginTop: '2rem' }}
        >
          <Title order={4} style={{ marginBottom: '1rem', color: 'var(--mantine-color-gray-7)' }}>
            Closed / Archived Polls
          </Title>
          <div style={listContainerStyle}>
            {closedOrNotOpenButApprovedPolls.map((poll) => (
              <PollListItem
                key={poll.id}
                poll={poll}
                isClosed={true}
                onSelect={handlePollSelect}
                usersDataMap={usersDataMap}
              />
            ))}
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {selectedPoll && (
          <motion.div
            key="poll-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={modalOverlayStyle}
            onClick={(e) => {
              if (e.target === e.currentTarget) handleCloseModal();
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={modalContentStyle}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={modalHeaderStyle}>
                <Title
                  order={3}
                  style={{
                    flexGrow: 1,
                    color: 'var(--mantine-color-blue-7)',
                    paddingRight: '2rem',
                  }}
                >
                  {selectedPoll.questionText}
                </Title>
                <ActionIcon
                  variant="subtle"
                  onClick={handleCloseModal}
                  title="Close poll"
                  size="lg"
                  style={{ position: 'absolute', top: '1rem', right: '1rem' }}
                >
                  <IconX stroke={1.5} />
                </ActionIcon>
              </div>

              <ScrollArea style={modalBodyStyle}>
                {selectedPoll.description && (
                  <Text c="dimmed" mb="md" style={{ fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
                    {selectedPoll.description}
                  </Text>
                )}

                {userVotes[selectedPoll.id] || !selectedPoll.isOpenForVoting ? (
                  <div>
                    <Text fw={500} mb="sm" c={userVotes[selectedPoll.id] ? 'green' : 'orange'}>
                      {userVotes[selectedPoll.id]
                        ? 'You have already voted in this poll.'
                        : 'This poll is currently closed for voting.'}
                    </Text>
                    {selectedPoll.resultsVisibility === 'always_visible' ||
                    (selectedPoll.resultsVisibility === 'after_voting' &&
                      userVotes[selectedPoll.id]) ||
                    (selectedPoll.resultsVisibility === 'after_close' &&
                      !selectedPoll.isOpenForVoting) ||
                    canUserApprovePoll() ? (
                      <div>
                        <Text size="lg" fw={500} mb="md">
                          Results:
                        </Text>
                        {selectedPoll.pollType === 'ranked_ballot' ? (
                          <RankedResultsDisplay poll={selectedPoll} />
                        ) : Object.entries(selectedPoll.options || {}).filter(
                            ([_, opt]) => opt.isApproved
                          ).length > 0 ? (
                          Object.entries(selectedPoll.options)
                            .filter(([_, opt]) => opt.isApproved)
                            .sort(([, a], [, b]) => (b.voteCount || 0) - (a.voteCount || 0))
                            .map(([optionId, option]) => {
                              const totalVotes = calculateTotalVotes(selectedPoll);
                              const percentage =
                                totalVotes > 0
                                  ? Math.round(((option.voteCount || 0) / totalVotes) * 100)
                                  : 0;
                              return (
                                <Box key={optionId} style={{ marginBottom: '0.75rem' }}>
                                  <Group justify="space-between" mb={2}>
                                    <Text size="sm">{option.text}</Text>
                                    <Text size="sm" c="dimmed">
                                      {option.voteCount || 0} votes
                                    </Text>
                                  </Group>
                                  <Progress.Root size="xl" radius="sm">
                                    <Tooltip label={`${percentage}%`}>
                                      <Progress.Section
                                        value={percentage}
                                        color={
                                          percentage > 0
                                            ? 'var(--mantine-color-blue-5)'
                                            : 'var(--mantine-color-gray-3)'
                                        }
                                        animated={percentage > 0}
                                      >
                                        {percentage > 10 && (
                                          <Progress.Label
                                            style={{
                                              textAlign: 'left',
                                              paddingLeft: '8px',
                                              overflow: 'visible',
                                              color: 'white',
                                            }}
                                          >
                                            {percentage}%
                                          </Progress.Label>
                                        )}
                                      </Progress.Section>
                                    </Tooltip>
                                  </Progress.Root>
                                </Box>
                              );
                            })
                        ) : (
                          <Text c="dimmed">No approved options with votes to display.</Text>
                        )}
                      </div>
                    ) : (
                      <Text c="dimmed" mt="sm">
                        {selectedPoll.resultsVisibility === 'after_close' &&
                          `Results will be available after the poll closes ${selectedPoll.closesAt ? 'on ' + formatDate(selectedPoll.closesAt) : ''}.`}
                        {selectedPoll.resultsVisibility === 'admin_only' &&
                          'Results are only visible to administrators.'}
                        {selectedPoll.resultsVisibility === 'after_voting' &&
                          !userVotes[selectedPoll.id] &&
                          selectedPoll.isOpenForVoting &&
                          'Vote to see the results.'}
                      </Text>
                    )}
                  </div>
                ) : (
                  <div>
                    {selectedPoll.pollType === 'ranked_ballot' ? (
                      <RankedVoteInterface poll={selectedPoll} onVote={handleVoteSubmit} />
                    ) : (
                      <Radio.Group
                        value={selectedOption}
                        onChange={setSelectedOption}
                        name={`poll-${selectedPoll.id}`}
                        style={{ marginBottom: '1rem' }}
                      >
                        <Stack gap="sm">
                          {Object.entries(selectedPoll.options || {})
                            .filter(([_, opt]) => opt.isApproved)
                            .map(([optionId, option]) => (
                              <Paper
                                key={optionId}
                                p="xs"
                                radius="sm"
                                withBorder
                                style={{
                                  cursor: 'pointer',
                                  transition: 'background-color 0.2s ease',
                                  backgroundColor:
                                    selectedOption === optionId
                                      ? 'var(--mantine-color-blue-0)'
                                      : 'transparent',
                                }}
                                onClick={() => setSelectedOption(optionId)}
                              >
                                <Radio
                                  value={optionId}
                                  label={option.text}
                                  styles={{ label: { cursor: 'pointer' } }}
                                />
                              </Paper>
                            ))}
                        </Stack>
                      </Radio.Group>
                    )}

                    {selectedPoll.isOpenForVoting &&
                      !userVotes[selectedPoll.id] &&
                      selectedPoll.allowUserOptionSubmissions &&
                      selectedPoll.pollType !== 'ranked_ballot' && (
                        <div
                          style={{
                            marginTop: '1.5rem',
                            paddingTop: '1rem',
                            borderTop: '1px solid var(--mantine-color-gray-2)',
                          }}
                        >
                          <Text size="sm" fw={500} mb="xs">
                            Suggest an option:
                          </Text>
                          <Group wrap="nowrap">
                            <TextInput
                              placeholder="Your suggestion..."
                              value={newOptionText}
                              onChange={(e) => setNewOptionText(e.currentTarget.value)}
                              style={{ flexGrow: 1 }}
                              size="sm"
                              rightSection={
                                <ActionIcon
                                  onClick={handleOptionSuggestionSubmit}
                                  title="Submit suggestion"
                                  disabled={!newOptionText.trim()}
                                  variant="light"
                                >
                                  <IconSend size={18} stroke={1.5} />
                                </ActionIcon>
                              }
                            />
                            {optionSubmissionMessage && (
                              <Text
                                c={optionSubmissionMessage.startsWith('Failed') ? 'red' : 'green'}
                                size="xs"
                                mt="xs"
                              >
                                {optionSubmissionMessage}
                              </Text>
                            )}
                          </Group>
                        </div>
                      )}

                    {selectedPoll.isOpenForVoting &&
                      !userVotes[selectedPoll.id] &&
                      selectedPoll.pollType !== 'ranked_ballot' && (
                        <Button
                          onClick={() => handleVoteSubmit(selectedOption)}
                          disabled={!selectedOption}
                          fullWidth
                          mt="xl"
                          size="md"
                          style={{ backgroundColor: 'var(--mantine-color-green-6)' }}
                          leftSection={<IconChartBar size={18} />}
                        >
                          Submit Your Vote
                        </Button>
                      )}
                  </div>
                )}
              </ScrollArea>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Container>
  );
};

export default PollsPage;