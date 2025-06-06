'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    getDatabase,
    ref as firebaseDatabaseRef,
    onValue,
    get,
    update,
    push,
    serverTimestamp,
    increment,
    remove
} from 'firebase/database';
import { database } from '../../firebase/firebase'; // Your Firebase setup

import {
    Button, Text, Paper, Modal, Radio, TextInput, Textarea, Progress, Group, ActionIcon,
    ScrollArea, Container, Title, Divider, Tooltip, Box, Switch, MultiSelect, Alert, SimpleGrid, Card, Badge, Stack, Flex
} from '@mantine/core';
import {
    IconX, IconSend, IconChartBar, IconFileDescription, IconClock, IconUserCircle, IconPlus,
    IconCircleCheck, IconCircleX, IconAlertCircle, IconLockAccess, IconSettings, IconEye, IconPencil, IconTrash
} from '@tabler/icons-react';

// Helper function to format dates
const formatDate = (isoStringOrTimestamp) => {
    if (!isoStringOrTimestamp) return 'N/A';
    try {
        const date = new Date(isoStringOrTimestamp);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    } catch (e) {
        return 'Invalid Date';
    }
};

const PollsPage = ({ user, campID, userData }) => { // userData is still used for usersDataMap
    const [polls, setPolls] = useState([]);
    const [usersDataMap, setUsersDataMap] = useState({});
    const [selectedPoll, setSelectedPoll] = useState(null);
    const [userVotes, setUserVotes] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [selectedOption, setSelectedOption] = useState('');
    const [newOptionText, setNewOptionText] = useState('');
    const [optionSubmissionMessage, setOptionSubmissionMessage] = useState('');

    const [showCreatePollForm, setShowCreatePollForm] = useState(false);
    const [newPollData, setNewPollData] = useState({
        questionText: '',
        description: '',
        options: ['', ''],
        closesAtDate: '',
        closesAtTime: '',
        allowUserOptionSubmissions: true,
        resultsVisibility: 'after_voting',
        tags: []
    });

    // New state for the role fetched from /camps/[campID]/users/[userID]/role
    const [currentUserActualCampRole, setCurrentUserActualCampRole] = useState(0);

    // Effect to fetch the camp-specific role for the current user
    useEffect(() => {
        if (user && user.uid && campID) {
            const campUserRoleRef = firebaseDatabaseRef(database, `camps/${campID}/users/${user.uid}/role`);
            const unsubscribeRole = onValue(campUserRoleRef, (snapshot) => {
                if (snapshot.exists()) {
                    setCurrentUserActualCampRole(snapshot.val());
                } else {
                    // Fallback if no specific role entry is found at this path
                    console.log(`No specific role found for user ${user.uid} in camp ${campID} at /camps/${campID}/users/${user.uid}/role. Checking global userData.`);
                    // As a fallback, try the role from the global userData if it's structured there.
                    // Or, decide if this specific path is the *only* source of truth.
                    const roleFromGlobalUserData = userData?.assignedCamps?.[campID]?.role;
                    if (roleFromGlobalUserData !== undefined) {
                        setCurrentUserActualCampRole(roleFromGlobalUserData);
                         console.log(`Using role ${roleFromGlobalUserData} from global userData.assignedCamps for user ${user.uid} in camp ${campID}.`);
                    } else {
                        setCurrentUserActualCampRole(0); // Default if not found anywhere
                        console.log(`No role found in global userData.assignedCamps either. Defaulting role to 0.`);
                    }
                }
            }, (errorObject) => {
                console.error(`Error fetching camp-specific role for user ${user.uid} in camp ${campID}:`, errorObject);
                setCurrentUserActualCampRole(0); // Default on error
            });
            return () => unsubscribeRole();
        } else {
            setCurrentUserActualCampRole(0); // Reset if no user or campID
        }
    }, [user, campID, userData]); // Added userData as a dependency in case the fallback logic needs it

    // --- Permission Helpers ---
    // activeUserCampRole now uses the state updated by the new useEffect
    const activeUserCampRole = useMemo(() => {
        return currentUserActualCampRole || 0;
    }, [currentUserActualCampRole]);

    const canUserCreatePoll = useCallback(() => activeUserCampRole >= 5, [activeUserCampRole]);
    const canUserManagePollDisplay = useCallback(() => activeUserCampRole >= 6, [activeUserCampRole]);
    const canUserManageOption = useCallback((poll) => {
        if (!poll || !user) return false;
        return activeUserCampRole >= 6 || (poll.createdByUserID === user.uid && poll.creatorRoleAtCreation === 5);
    }, [activeUserCampRole, user]);


    // Fetch all users once to map creator IDs to names (from global /users node)
    useEffect(() => {
        const usersRefGlobal = firebaseDatabaseRef(database, 'users');
        const unsubscribeUsers = onValue(usersRefGlobal, (snapshot) => {
            if (snapshot.exists()) {
                const users = snapshot.val();
                const map = {};
                for (const uid_global in users) {
                    map[uid_global] = users[uid_global].name || 'Unknown User';
                }
                setUsersDataMap(map);
            }
        }, (errorObject) => {
            console.error("Error fetching global users for map:", errorObject);
        });
        return () => unsubscribeUsers();
    }, []);

    // Fetch polls for the current camp and user's vote status
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
        
        const unsubscribePolls = onValue(pollsRef, async (snapshot) => {
            const pollsData = snapshot.val();
            if (pollsData) {
                const pollsArray = [];
                const voteCheckPromises = [];

                for (const pollId in pollsData) {
                    pollsArray.push({ id: pollId, ...pollsData[pollId] });
                    const userVotePath = `${pollsPath}/${pollId}/usersVoted/${user.uid}`;
                    voteCheckPromises.push(
                        get(firebaseDatabaseRef(database, userVotePath)).then(voteSnap => ({ pollId, hasVoted: voteSnap.exists() }))
                    );
                }
                
                pollsArray.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
                setPolls(pollsArray);

                const votesResults = await Promise.all(voteCheckPromises);
                const newUserVotes = votesResults.reduce((acc, voteInfo) => {
                    acc[voteInfo.pollId] = voteInfo.hasVoted;
                    return acc;
                }, {});
                setUserVotes(newUserVotes);
                setError(null);
            } else {
                setPolls([]);
                setUserVotes({});
                setError(null); 
            }
            setIsLoading(false);
        }, (err) => {
            console.error("Error fetching polls:", err);
            setError("Failed to load polls.");
            setPolls([]);
            setUserVotes({});
            setIsLoading(false);
        });

        return () => unsubscribePolls();
    }, [campID, user]);

    // ---- Poll Selection Handler ----
    const handlePollSelect = (poll) => {
        setSelectedPoll(poll);
        setSelectedOption(''); 
        setNewOptionText('');
        setOptionSubmissionMessage('');
    };
    
    const handleCloseModal = () => {
        setSelectedPoll(null);
    };

    // ---- Poll Creation Handlers ----
    const handleNewPollInputChange = (field, value) => {
        setNewPollData(prev => ({ ...prev, [field]: value }));
    };

    const handleNewPollOptionChange = (index, value) => {
        const updatedOptions = [...newPollData.options];
        updatedOptions[index] = value;
        setNewPollData(prev => ({ ...prev, options: updatedOptions }));
    };

    const addPollOptionField = () => {
        setNewPollData(prev => ({ ...prev, options: [...prev.options, ''] }));
    };

    const removePollOptionField = (index) => {
        if (newPollData.options.length <= 2) {
            alert("A poll must have at least two options.");
            return;
        }
        const updatedOptions = newPollData.options.filter((_, i) => i !== index);
        setNewPollData(prev => ({ ...prev, options: updatedOptions }));
    };

    const handleCreatePollSubmit = async () => {
        if (!newPollData.questionText.trim()) {
            alert("Poll question cannot be empty.");
            return;
        }
        const validOptions = newPollData.options.filter(opt => opt.trim() !== '');
        if (validOptions.length < 2) {
            alert("Please provide at least two valid options.");
            return;
        }

        let combinedClosesAt = null;
        if (newPollData.closesAtDate) {
            const timePart = newPollData.closesAtTime || "00:00"; 
            const dateStr = `${newPollData.closesAtDate}T${timePart}:00`;
            try {
                const dateObj = new Date(dateStr);
                 if (!isNaN(dateObj.getTime())) {
                    combinedClosesAt = dateObj.toISOString();
                } else {
                    const dateOnlyObj = new Date(newPollData.closesAtDate);
                    if(!isNaN(dateOnlyObj.getTime())){
                        combinedClosesAt = dateOnlyObj.toISOString();
                    } else {
                        alert("Invalid date for 'Closes At'. Please check your input or leave blank.");
                        return;
                    }
                }
            } catch(e) {
                 alert("Invalid date/time format for 'Closes At'. Please check your input or leave blank.");
                return;
            }
        }

        const pollCreatorRole = activeUserCampRole; // Use the role fetched from camp-specific path
        const isCreatorAdmin = pollCreatorRole >= 6;

        const pollObject = {
            questionText: newPollData.questionText.trim(),
            description: newPollData.description.trim() || null,
            options: validOptions.reduce((obj, optionText, index) => {
                obj[`initial_opt_${index + 1}`] = {
                    text: optionText.trim(),
                    createdByUserID: user.uid,
                    isInitialOption: true, 
                    isApproved: true, 
                    voteCount: 0
                };
                return obj;
            }, {}),
            closesAt: combinedClosesAt,
            allowUserOptionSubmissions: newPollData.allowUserOptionSubmissions,
            resultsVisibility: newPollData.resultsVisibility,
            tags: newPollData.tags || [],
            
            createdByUserID: user.uid,
            creatorRoleAtCreation: pollCreatorRole,
            createdAt: serverTimestamp(),
            lastUpdatedAt: serverTimestamp(),
            
            isApprovedForDisplay: isCreatorAdmin,
            approvedByUserID: isCreatorAdmin ? user.uid : null,
            approvedAt: isCreatorAdmin ? serverTimestamp() : null,
            isRejectedForDisplay: false,
            
            isOpenForVoting: isCreatorAdmin && (!combinedClosesAt || new Date(combinedClosesAt) > new Date()),
            usersVoted: {},
            maxVotesPerUser: 1,
        };

        try {
            const newPollRef = push(firebaseDatabaseRef(database, `camps/${campID}/polls`));
            await update(newPollRef, pollObject);
            alert(isCreatorAdmin ? "Poll created and automatically approved!" : "Poll created! It needs approval from a Camp Boss or higher to be displayed.");
            setShowCreatePollForm(false);
            setNewPollData({ 
                questionText: '', description: '', options: ['', ''],
                closesAtDate: '', closesAtTime: '', 
                allowUserOptionSubmissions: true,
                resultsVisibility: 'after_voting', tags: []
            });
        } catch (e) {
            console.error("Error creating poll:", e);
            alert("Failed to create poll: " + e.message);
        }
    };

    // ---- Poll & Option Approval/Rejection Handlers ----
    const handlePollDisplayApproval = async (pollId, approve) => {
        const pollToUpdate = polls.find(p => p.id === pollId);
        if (!pollToUpdate) return;

        const updates = {};
        if (approve) {
            updates[`isApprovedForDisplay`] = true;
            updates[`isOpenForVoting`] = !pollToUpdate.closesAt || new Date(pollToUpdate.closesAt) > new Date();
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
            alert(`Poll ${approve ? 'approved' : 'rejected'} successfully.`);
        } catch (e) {
            alert(`Failed to ${approve ? 'approve' : 'reject'} poll.`);
            console.error("Poll approval/rejection error:", e);
        }
    };

    const handleSubmittedOptionApproval = async (pollId, optionId, approve) => {
        const optionUpdates = {}; // Renamed to avoid conflict with 'updates' in outer scope if any
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
            await update(firebaseDatabaseRef(database, `camps/${campID}/polls/${pollId}/options/${optionId}`), optionUpdates);
            await update(firebaseDatabaseRef(database, `camps/${campID}/polls/${pollId}`), { lastUpdatedAt: serverTimestamp() });
            alert(`Option ${approve ? 'approved' : 'rejected'} successfully.`);
        } catch (e) {
            alert(`Failed to ${approve ? 'approve' : 'reject'} option.`);
            console.error("Option approval/rejection error:", e);
        }
    };
    
    // ---- Voting Handlers ----
    const handleVoteSubmit = async () => {
        if (!selectedOption || !selectedPoll || !user || !campID) return;
        if (userVotes[selectedPoll.id]) {
            alert("You have already voted in this poll.");
            return;
        }

        const updates = {};
        updates[`camps/${campID}/polls/${selectedPoll.id}/usersVoted/${user.uid}`] = true;
        updates[`camps/${campID}/polls/${selectedPoll.id}/options/${selectedOption}/voteCount`] = increment(1);
        updates[`camps/${campID}/polls/${selectedPoll.id}/lastUpdatedAt`] = serverTimestamp();

        try {
            await update(firebaseDatabaseRef(database), updates);
            setUserVotes(prev => ({ ...prev, [selectedPoll.id]: true }));
            setSelectedPoll(prevPoll => {
                if (!prevPoll) return null;
                const newOptions = { ...prevPoll.options };
                if (newOptions[selectedOption]) {
                    newOptions[selectedOption].voteCount = (newOptions[selectedOption].voteCount || 0) + 1;
                }
                return { ...prevPoll, options: newOptions };
            });
            alert("Vote submitted successfully!");
        } catch (e) {
            console.error("Error submitting vote:", e);
            alert("Failed to submit vote.");
        }
    };

    const handleOptionSuggestionSubmit = async () => {
        if (!newOptionText.trim() || !selectedPoll || !user || !campID) {
            alert("Please enter an option to suggest.");
            return;
        }

        const newOptionKey = push(firebaseDatabaseRef(database, `camps/${campID}/polls/${selectedPoll.id}/options`)).key;
        const optionData = {
            text: newOptionText.trim(),
            createdByUserID: user.uid,
            submittedAt: serverTimestamp(),
            isInitialOption: false, 
            isApproved: false, 
            isRejected: false,
            voteCount: 0
        };
        
        const updates = {};
        updates[`camps/${campID}/polls/${selectedPoll.id}/options/${newOptionKey}`] = optionData;
        updates[`camps/${campID}/polls/${selectedPoll.id}/lastUpdatedAt`] = serverTimestamp();

        try {
            await update(firebaseDatabaseRef(database), updates);
            setOptionSubmissionMessage("Option submitted, awaiting approval. If you'd like to vote for this option, please wait until it has been approved, then vote for it from the updated list. You may continue to submit additional option suggestions.");
            setNewOptionText(''); 
        } catch (e) {
            console.error("Error submitting option:", e);
            setOptionSubmissionMessage("Failed to submit option. Please try again.");
        }
    };
    
    const calculateTotalVotes = (poll) => {
        if (!poll || !poll.options) return 0;
        return Object.values(poll.options)
            .filter(opt => opt.isApproved) 
            .reduce((sum, opt) => sum + (opt.voteCount || 0), 0);
    };

    // --- Filtering for Display ---
    const pollsAwaitingDisplayApproval = polls.filter(p => !p.isApprovedForDisplay && !p.isRejectedForDisplay);
    const optionsAwaitingApproval = polls.reduce((acc, poll) => {
        if (poll.options) {
            Object.entries(poll.options).forEach(([optionId, option]) => {
                if (!option.isInitialOption && !option.isApproved && !option.isRejected) {
                    if (canUserManageOption(poll)) { 
                        acc.push({ ...option, optionId, pollId: poll.id, pollQuestion: poll.questionText });
                    }
                }
            });
        }
        return acc;
    }, []);

    const openAndApprovedPolls = polls.filter(p => p.isApprovedForDisplay && !p.isRejectedForDisplay && p.isOpenForVoting);
    const closedOrNotOpenButApprovedPolls = polls.filter(p => p.isApprovedForDisplay && !p.isRejectedForDisplay && !p.isOpenForVoting);

    // ---- STYLING ----
    const listContainerStyle = { display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' };
    const pollItemStyle = (isClosedOrPending) => ({
        padding: '1rem', border: '1px solid #e0e0e0', borderRadius: '8px', cursor: 'pointer',
        transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
        backgroundColor: 'var(--mantine-color-body)',
        color: isClosedOrPending ? 'var(--mantine-color-dimmed)' : 'var(--mantine-color-text)',
        opacity: isClosedOrPending ? 0.7 : 1,
    });
    const pollItemHoverStyle = { backgroundColor: 'var(--mantine-color-gray-0)', boxShadow: 'var(--mantine-shadow-sm)'};
    const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050 };
    const modalContentStyle = { backgroundColor: 'var(--mantine-color-body)', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '700px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 30px rgba(0,0,0,0.1)'};
    const modalHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' };
    const modalBodyStyle = { flexGrow: 1, minHeight: 0 };
    const adminSectionStyle = { padding: '1rem', marginBottom: '2rem', border: '1px dashed var(--mantine-color-gray-4)', borderRadius: 'var(--mantine-radius-md)', backgroundColor: 'var(--mantine-color-gray-0)' };
    const createPollFormStyle = { padding: '1rem', border: '1px solid var(--mantine-color-blue-2)', borderRadius: 'var(--mantine-radius-md)', backgroundColor: 'var(--mantine-color-blue-0)', marginBottom: '1rem' };
    const nativeDateTimeInputStyle = {
        padding: 'var(--mantine-spacing-xs)',
        fontSize: 'var(--mantine-font-size-sm)',
        borderRadius: 'var(--mantine-radius-sm)',
        border: '1px solid var(--mantine-color-gray-4)',
        backgroundColor: 'var(--mantine-color-body)',
        color: 'var(--mantine-color-text)',
        width: '100%'
    };


    if (isLoading) return <Paper p="xl" shadow="xs" style={{textAlign: 'center'}}><Text>Loading polls...</Text></Paper>;
    if (error) return <Paper p="xl" shadow="xs" style={{textAlign: 'center'}}><Text c="red">{error}</Text></Paper>;
    if (!user || !campID) return (
        <Container size="xs" mt="xl">
            <Alert icon={<IconAlertCircle size="1.2rem" />} title="Access Denied" color="orange" radius="md">
                Please log in and select a camp to view or manage polls.
            </Alert>
        </Container>
    );

    return (
        <Container size="lg" style={{ marginTop: '2rem', marginBottom: '4rem' }}>
            <Title order={2} style={{ marginBottom: '1.5rem', textAlign: 'center', color: 'var(--mantine-color-blue-7)' }}>
                Camp Polls for {campID && userData?.assignedCamps?.[campID]?.campName || 'Your Camp'}
            </Title>

            {canUserCreatePoll() && (
                <Box style={{ marginBottom: '2rem' }}>
                    <Button
                        onClick={() => setShowCreatePollForm(prev => !prev)}
                        leftSection={showCreatePollForm ? <IconX size={18} /> : <IconPlus size={18} />}
                        variant="gradient"
                        gradient={{ from: 'teal', to: 'lime', deg: 105 }}
                        mb="md"
                    >
                        {showCreatePollForm ? 'Cancel New Poll' : 'Create New Poll'}
                    </Button>

                    <AnimatePresence>
                        {showCreatePollForm && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                                style={{ overflow: 'hidden', ...createPollFormStyle }}
                            >
                                <Paper p="md" withBorder shadow="sm" radius="md">
                                    <Title order={4} mb="md">New Poll Details</Title>
                                    <Stack gap="sm">
                                        <TextInput label="Poll Question" placeholder="e.g., What's for Friday dinner?" value={newPollData.questionText} onChange={(e) => handleNewPollInputChange('questionText', e.currentTarget.value)} required />
                                        <Textarea label="Description (Optional)" placeholder="Add more context here..." value={newPollData.description} onChange={(e) => handleNewPollInputChange('description', e.currentTarget.value)} />
                                        
                                        <Text fw={500} size="sm">Options (min. 2)</Text>
                                        {newPollData.options.map((option, index) => (
                                            <Group key={index} wrap="nowrap">
                                                <TextInput style={{ flexGrow: 1 }} placeholder={`Option ${index + 1}`} value={option} onChange={(e) => handleNewPollOptionChange(index, e.currentTarget.value)} required={index < 2} />
                                                {newPollData.options.length > 2 && (
                                                    <ActionIcon color="red" onClick={() => removePollOptionField(index)} title="Remove option">
                                                        <IconX size={16} />
                                                    </ActionIcon>
                                                )}
                                            </Group>
                                        ))}
                                        <Button onClick={addPollOptionField} variant="light" size="xs" leftSection={<IconPlus size={14}/>}>Add Option</Button>
                                        
                                        <Text fw={500} size="sm" mt="xs">Poll Closes At (Optional)</Text>
                                        <Flex gap="sm">
                                            <input type="date" value={newPollData.closesAtDate} onChange={(e) => handleNewPollInputChange('closesAtDate', e.target.value)} style={{...nativeDateTimeInputStyle, flex: 1}} />
                                            <input type="time" value={newPollData.closesAtTime} onChange={(e) => handleNewPollInputChange('closesAtTime', e.target.value)} style={{...nativeDateTimeInputStyle, flex: 1}} />
                                        </Flex>
                                        
                                        <Switch mt="sm" label="Allow users to submit their own options?" checked={newPollData.allowUserOptionSubmissions} onChange={(e) => handleNewPollInputChange('allowUserOptionSubmissions', e.currentTarget.checked)} />
                                        
                                        <Radio.Group label="Results Visibility" value={newPollData.resultsVisibility} onChange={(value) => handleNewPollInputChange('resultsVisibility', value)} required mt="sm">
                                            <Group mt="xs">
                                                <Radio value="always_visible" label="Always Visible" />
                                                <Radio value="after_voting" label="After Voting" />
                                                <Radio value="after_close" label="After Poll Closes" />
                                                <Radio value="admin_only" label="Admins Only" />
                                            </Group>
                                        </Radio.Group>
                                        <MultiSelect
                                            label="Tags (Optional)"
                                            placeholder="Add tags, press Enter to create new"
                                            data={[]} 
                                            value={newPollData.tags}
                                            onChange={(value) => handleNewPollInputChange('tags', value)}
                                            searchable
                                            creatable 
                                            getCreateLabel={(query) => `+ Create "${query}"`}
                                            mt="sm"
                                        />
                                        <Button onClick={handleCreatePollSubmit} mt="md" leftSection={<IconPlus size={18}/>} size="md">Create Poll</Button>
                                    </Stack>
                                </Paper>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Box>
            )}
            
            {(canUserManagePollDisplay() || polls.some(p => canUserManageOption(p) && Object.values(p.options || {}).some(opt => !opt.isInitialOption && !opt.isApproved && !opt.isRejected))) && (
                 <Paper p="lg" radius="md" withBorder style={adminSectionStyle}>
                    <Title order={3} mb="lg" style={{color: 'var(--mantine-color-orange-7)'}}>Admin Approval Area</Title>
                    
                    {canUserManagePollDisplay() && pollsAwaitingDisplayApproval.length > 0 && (
                        <Box mb="xl">
                            <Title order={4} mb="sm">Polls Awaiting Display Approval</Title>
                            {pollsAwaitingDisplayApproval.map(poll => (
                                <Paper key={poll.id} p="sm" shadow="xs" withBorder radius="sm" mb="xs">
                                    <Text fw={500}>{poll.questionText}</Text>
                                    <Text size="xs" c="dimmed">Created by: {usersDataMap[poll.createdByUserID] || 'Unknown'} on {formatDate(poll.createdAt)}</Text>
                                    <Group mt="xs">
                                        <Button size="xs" color="green" onClick={() => handlePollDisplayApproval(poll.id, true)} leftSection={<IconCircleCheck size={16}/>}>Approve & Open</Button>
                                        <Button size="xs" color="red" onClick={() => handlePollDisplayApproval(poll.id, false)} leftSection={<IconCircleX size={16}/>}>Reject</Button>
                                    </Group>
                                </Paper>
                            ))}
                        </Box>
                    )}

                    {optionsAwaitingApproval.length > 0 && (
                         <Box>
                            <Title order={4} mb="sm">Options Awaiting Approval</Title>
                            {optionsAwaitingApproval.map(opt => (
                                <Paper key={opt.optionId} p="sm" shadow="xs" withBorder radius="sm" mb="xs">
                                    <Text>Option: <Text span fw={500}>"{opt.text}"</Text></Text>
                                    <Text size="xs" c="dimmed">For Poll: "{opt.pollQuestion}"</Text>
                                    <Text size="xs" c="dimmed">Suggested by: {usersDataMap[opt.createdByUserID] || 'Unknown'} on {formatDate(opt.submittedAt)}</Text>
                                    <Group mt="xs">
                                        <Button size="xs" color="green" onClick={() => handleSubmittedOptionApproval(opt.pollId, opt.optionId, true)} leftSection={<IconCircleCheck size={16}/>}>Approve Option</Button>
                                        <Button size="xs" color="red" onClick={() => handleSubmittedOptionApproval(opt.pollId, opt.optionId, false)} leftSection={<IconCircleX size={16}/>}>Reject Option</Button>
                                    </Group>
                                </Paper>
                            ))}
                        </Box>
                    )}
                    {(pollsAwaitingDisplayApproval.length === 0 && optionsAwaitingApproval.length === 0 && (canUserManagePollDisplay() || polls.some(p => canUserManageOption(p) && Object.values(p.options||{}).some(opt => !opt.isInitialOption && !opt.isApproved && !opt.isRejected) ))) && (
                        <Text c="dimmed">No items currently awaiting your approval.</Text>
                    )}
                </Paper>
            )}

            {openAndApprovedPolls.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Title order={4} style={{ marginBottom: '1rem', color: 'var(--mantine-color-gray-7)', marginTop: '2rem' }}>Open Polls</Title>
                    <div style={listContainerStyle}>
                        {openAndApprovedPolls.map(poll => (
                            <motion.div
                                key={poll.id} layout
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                                whileHover={pollItemHoverStyle}
                                style={pollItemStyle(false)}
                                onClick={() => handlePollSelect(poll)} 
                                role="button" tabIndex={0} onKeyPress={(e) => e.key === 'Enter' && handlePollSelect(poll)}
                            >
                                <Text fw={500} size="lg" mb={4}>{poll.questionText}</Text>
                                <Text size="xs" c="dimmed">
                                    {poll.closesAt && <>Closes on: {formatDate(poll.closesAt)} &bull; </>}
                                    Created by: {usersDataMap[poll.createdByUserID] || 'Unknown'}
                                </Text>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}

            {closedOrNotOpenButApprovedPolls.length > 0 && (
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{marginTop: '2rem'}}>
                    <Title order={4} style={{ marginBottom: '1rem', color: 'var(--mantine-color-gray-7)' }}>Closed / Archived Polls</Title>
                    <div style={listContainerStyle}>
                        {closedOrNotOpenButApprovedPolls.map(poll => (
                             <motion.div
                                key={poll.id} layout
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                                whileHover={pollItemHoverStyle}
                                style={pollItemStyle(true)}
                                onClick={() => handlePollSelect(poll)} 
                                role="button" tabIndex={0} onKeyPress={(e) => e.key === 'Enter' && handlePollSelect(poll)}
                            >
                                <Text fw={500} size="lg" mb={4}>{poll.questionText}</Text>
                                <Text size="xs" c="dimmed">
                                    {poll.closesAt ? `Closed: ${formatDate(poll.closesAt)}` : 'Status: Not currently open for voting'} &bull; 
                                    Created by: {usersDataMap[poll.createdByUserID] || 'Unknown'}
                                </Text>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}
            
            {(polls.filter(p=>p.isApprovedForDisplay && !p.isRejectedForDisplay).length === 0 && !isLoading) && (
                 <Paper p="xl" shadow="xs" style={{textAlign: 'center', marginTop: '2rem'}}>
                    <IconChartBar size={48} stroke={1.5} style={{color: 'var(--mantine-color-gray-5)'}} />
                    <Text size="lg" mt="md">No active or closed polls to display for this camp yet.</Text>
                    {canUserCreatePoll() && <Text c="dimmed">Why not create one?</Text>}
                </Paper>
            )}

            <AnimatePresence>
                {selectedPoll && (
                    <motion.div
                        key="poll-modal"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={modalOverlayStyle}
                        onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(); }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            style={modalContentStyle}
                            onClick={(e) => e.stopPropagation()} 
                        >
                            <div style={modalHeaderStyle}>
                                <Title order={3} style={{ flexGrow: 1, color: 'var(--mantine-color-blue-7)', paddingRight: '2rem' }}>
                                    {selectedPoll.questionText}
                                </Title>
                                <ActionIcon variant="subtle" onClick={handleCloseModal} title="Close poll" size="lg" style={{position: 'absolute', top: '1rem', right: '1rem'}}>
                                    <IconX stroke={1.5} />
                                </ActionIcon>
                            </div>

                            <ScrollArea style={modalBodyStyle} >
                                {selectedPoll.description && (
                                    <Text c="dimmed" mb="md" style={{fontStyle: 'italic', whiteSpace: 'pre-wrap'}}>{selectedPoll.description}</Text>
                                )}

                                { (userVotes[selectedPoll.id] || !selectedPoll.isOpenForVoting) ? ( 
                                    <div> 
                                        <Text fw={500} mb="sm" c={userVotes[selectedPoll.id] ? "green" : "orange"}>
                                            {userVotes[selectedPoll.id] ? "You have already voted in this poll." : "This poll is currently closed for voting."}
                                        </Text>
                                        { (selectedPoll.resultsVisibility === 'always_visible' ||
                                          (selectedPoll.resultsVisibility === 'after_voting' && userVotes[selectedPoll.id]) ||
                                          (selectedPoll.resultsVisibility === 'after_close' && !selectedPoll.isOpenForVoting)
                                        ) ? (
                                            <div>
                                                <Text size="lg" fw={500} mb="md">Results:</Text>
                                                {Object.entries(selectedPoll.options || {}).filter(([_, opt]) => opt.isApproved).length > 0 ? (
                                                    Object.entries(selectedPoll.options)
                                                    .filter(([_, opt]) => opt.isApproved)
                                                    .sort(([,a],[,b]) => (b.voteCount || 0) - (a.voteCount || 0)) 
                                                    .map(([optionId, option]) => {
                                                        const totalVotes = calculateTotalVotes(selectedPoll);
                                                        const percentage = totalVotes > 0 ? Math.round(((option.voteCount || 0) / totalVotes) * 100) : 0;
                                                        return (
                                                            <Box key={optionId} style={{ marginBottom: '0.75rem' }}>
                                                                <Group justify="space-between" mb={2}>
                                                                    <Text size="sm">{option.text}</Text>
                                                                    <Text size="sm" c="dimmed">{option.voteCount || 0} votes</Text>
                                                                </Group>
                                                                <Progress.Root size="xl" radius="sm">
                                                                    <Tooltip label={`${percentage}%`}>
                                                                         <Progress.Section
                                                                            value={percentage}
                                                                            color={percentage > 0 ? "var(--mantine-color-blue-5)" : "var(--mantine-color-gray-3)"}
                                                                            animated={percentage > 0}
                                                                        >
                                                                            {percentage > 10 && ( 
                                                                                <Progress.Label 
                                                                                    style={{ textAlign: 'left', paddingLeft: '8px', overflow: 'visible', color: 'white' }}
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
                                                {selectedPoll.resultsVisibility === 'after_close' && `Results will be available after the poll closes ${selectedPoll.closesAt ? 'on ' + formatDate(selectedPoll.closesAt) : ''}.`}
                                                {selectedPoll.resultsVisibility === 'admin_only' && "Results are only visible to administrators."}
                                                {selectedPoll.resultsVisibility === 'after_voting' && !userVotes[selectedPoll.id] && selectedPoll.isOpenForVoting && "Vote to see the results."}
                                            </Text>
                                        )}
                                    </div>
                                ) : ( 
                                    <Radio.Group
                                        value={selectedOption}
                                        onChange={setSelectedOption}
                                        name={`poll-${selectedPoll.id}`}
                                        orientation="vertical"
                                        spacing="sm"
                                        style={{ marginBottom: '1rem' }}
                                    >
                                        {Object.entries(selectedPoll.options || {})
                                          .filter(([_, opt]) => opt.isApproved) 
                                          .map(([optionId, option]) => (
                                            <Paper key={optionId} p="xs" radius="sm" withBorder 
                                                style={{
                                                    cursor: 'pointer', 
                                                    transition: 'background-color 0.2s ease',
                                                    backgroundColor: selectedOption === optionId ? 'var(--mantine-color-blue-0)' : 'transparent'
                                                }}
                                                onClick={() => setSelectedOption(optionId)}
                                            >
                                                <Radio value={optionId} label={option.text} styles={{label: {cursor: 'pointer'}}} />
                                            </Paper>
                                        ))}
                                    </Radio.Group>
                                )}

                                {selectedPoll.isOpenForVoting && !userVotes[selectedPoll.id] && selectedPoll.allowUserOptionSubmissions && (
                                    <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--mantine-color-gray-2)'}}>
                                        <Text size="sm" fw={500} mb="xs">Suggest an option:</Text>
                                        <Group wrap="nowrap">
                                            <TextInput
                                                placeholder="Your suggestion..."
                                                value={newOptionText}
                                                onChange={(e) => setNewOptionText(e.currentTarget.value)}
                                                style={{ flexGrow: 1 }}
                                                size="sm"
                                                rightSection={
                                                    <ActionIcon onClick={handleOptionSuggestionSubmit} title="Submit suggestion" disabled={!newOptionText.trim()} variant="light">
                                                        <IconSend size={18} stroke={1.5} />
                                                    </ActionIcon>
                                                }
                                            />
                                        </Group>
                                        {optionSubmissionMessage && <Text c={optionSubmissionMessage.startsWith("Failed") ? "red" : "green"} size="xs" mt="xs">{optionSubmissionMessage}</Text>}
                                    </div>
                                )}

                                {selectedPoll.isOpenForVoting && !userVotes[selectedPoll.id] && (
                                    <Button
                                        onClick={handleVoteSubmit}
                                        disabled={!selectedOption}
                                        fullWidth
                                        mt="xl"
                                        size="md"
                                        style={{backgroundColor: 'var(--mantine-color-green-6)'}}
                                        leftSection={<IconChartBar size={18}/>}
                                    >
                                        Submit Your Vote
                                    </Button>
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