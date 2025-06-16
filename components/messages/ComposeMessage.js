'use client';

import React, { useState, useEffect } from 'react';
import {
    Modal,
    Button,
    TextInput,
    Textarea,
    MultiSelect,
    Select,
    Switch,
    Group,
    Stack,
    Text
} from '@mantine/core';
import { getDatabase, ref, get } from 'firebase/database';
import { database } from '../../firebase/firebase';

const ComposeMessage = ({
    opened,
    onClose,
    onSubmit,
    currentUser,
    effectiveRole,
    campID,
    initialState = null,
}) => {
    const [recipients, setRecipients] = useState([]);
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [messageType, setMessageType] = useState('Social');
    const [areRecipientsVisible, setAreRecipientsVisible] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [userList, setUserList] = useState([]);
    const [isSearchingCompany, setIsSearchingCompany] = useState(false);
    
    const isLocked = initialState?.isClassifiedsMessage || false;

    useEffect(() => {
        if (!opened || !currentUser || !campID) return;

        const fetchUsers = async () => {
            const companyId = (await get(ref(database, `camps/${campID}/companyId`))).val();
            const allUsersSnapshot = await get(ref(database, 'users'));
            const allUsers = allUsersSnapshot.val() || {};

            const users = Object.entries(allUsers)
                .filter(([uid, userData]) => {
                    if (uid === currentUser.uid) return false;
                    if (isSearchingCompany) {
                        return Object.values(userData.assignedCamps || {}).some(c => c.companyId === companyId);
                    } else {
                        return userData.assignedCamps?.[campID];
                    }
                })
                .map(([uid, userData]) => ({
                    value: uid,
                    label: userData.name || userData.email,
                }));
            setUserList(users);
        };

        if (!isLocked) {
            fetchUsers();
        }

    }, [opened, currentUser, campID, isSearchingCompany, isLocked]);

    const resetForm = () => {
        setRecipients([]);
        setSubject('');
        setBody('');
        setMessageType('Social');
        setAreRecipientsVisible(true);
        setIsSearchingCompany(false);
    };
    
    useEffect(() => {
        if (opened && initialState) {
            if (initialState.recipientId) {
                setRecipients([initialState.recipientId]);
            }
            if (initialState.subject) {
                setSubject(initialState.subject);
            }
            if(initialState.isClassifiedsMessage) {
                setMessageType('Social');
                setAreRecipientsVisible(true);
            }
        } else if (!opened) {
            resetForm();
        }
    }, [opened, initialState]);


    const handleClose = () => {
        onClose();
    };

    const handleSubmit = async () => {
        if (recipients.length === 0 || !subject.trim() || !body.trim()) {
            alert('Recipients, subject, and body are required.');
            return;
        }
        setIsSubmitting(true);
        await onSubmit({
            recipients,
            subject,
            body,
            messageType,
            areRecipientsVisible,
        });
        setIsSubmitting(false);
        handleClose();
    };

    const messageTypeOptions = [
        { value: 'Social', label: 'Social' },
        { value: 'Operational', label: 'Operational Logistics' },
    ];

    if (effectiveRole >= 5) {
        messageTypeOptions.push({ value: 'Formal', label: 'Formal Announcement' });
    }

    return (
        <Modal opened={opened} onClose={handleClose} title="Compose New Message" size="lg">
            <Stack>
                {isLocked ? (
                    <TextInput
                        label="To:"
                        value={initialState.recipientName}
                        readOnly
                    />
                ) : (
                    <>
                        <MultiSelect
                            label="To:"
                            placeholder="Select recipients"
                            data={userList}
                            value={recipients}
                            onChange={setRecipients}
                            searchable
                            required
                        />
                        <Switch
                            label="Search all company users"
                            checked={isSearchingCompany}
                            onChange={(event) => setIsSearchingCompany(event.currentTarget.checked)}
                        />
                    </>
                )}
                
                <TextInput
                    label="Subject"
                    placeholder="Message subject"
                    value={subject}
                    onChange={(e) => setSubject(e.currentTarget.value)}
                    required
                />
                <Textarea
                    label="Message"
                    placeholder="Your message..."
                    value={body}
                    onChange={(e) => setBody(e.currentTarget.value)}
                    required
                    minRows={5}
                />
                
                {!isLocked && (
                    <>
                        <Select
                            label="Message Type"
                            data={messageTypeOptions}
                            value={messageType}
                            onChange={setMessageType}
                        />
                        <Switch
                            label="Allow recipients to see each other"
                            checked={areRecipientsVisible}
                            onChange={(event) => setAreRecipientsVisible(event.currentTarget.checked)}
                        />
                    </>
                )}

                <Group justify="flex-end" mt="md">
                    <Button variant="default" onClick={handleClose}>Cancel</Button>
                    <Button onClick={handleSubmit} loading={isSubmitting}>Send</Button>
                </Group>
            </Stack>
        </Modal>
    );
};

export default ComposeMessage;