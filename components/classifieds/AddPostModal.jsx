'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Button, TextInput, Textarea, Select, Radio, NumberInput, Group, Stack } from '@mantine/core';
import { database } from '../../firebase/firebase';
import { ref, push, serverTimestamp, get } from 'firebase/database';
import { useAuth } from '../../hooks/useAuth';

const AddPostModal = ({ opened, onClose, campData }) => {
    const { user, campID } = useAuth();
    
    const initialFormState = {
        title: '',
        description: '',
        postType: 'For Sale',
        price: '',
        condition: null,
        category: null,
        scope: 'Camp',
    };

    const [formData, setFormData] = useState(initialFormState);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (!opened) {
            setFormData(initialFormState);
            setErrors({});
        }
    }, [opened]);

    const handleFormChange = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.title.trim()) newErrors.title = 'Title is required';
        if (!formData.description.trim()) newErrors.description = 'Description is required';
        if (formData.postType === 'For Sale' && (!formData.price || formData.price <= 0)) {
            newErrors.price = 'A valid price is required for items for sale';
        }
        if (!formData.condition) newErrors.condition = 'Condition is required';
        if (!formData.category) newErrors.category = 'Category is required';
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        if (!user || !campID || !campData) {
            alert('Cannot create post: user or camp data is missing.');
            return;
        }

        setIsSubmitting(true);
        
        const userSnap = await get(ref(database, `users/${user.uid}`));
        const userData = userSnap.val();

        // This check prevents a crash if the user's data can't be fetched.
        if (!userData) {
            alert('Could not retrieve your user data. Cannot create post.');
            setIsSubmitting(false);
            return;
        }

        const postData = {
            ...formData,
            price: formData.postType === 'For Sale' ? Number(formData.price) : null,
            listerId: user.uid,
            listerName: userData.name || 'Anonymous',
            listerFirstName: userData.name ? userData.name.split(' ')[0] : 'User',
            campId: campID,
            campName: campData.campName,
            companyId: campData.companyId,
            province: campData.province || 'N/A',
            viewCount: 0,
            imageCount: 0,
            createdAt: serverTimestamp(),
        };

        try {
            const classifiedsRef = ref(database, `camps/${campID}/classifieds`);
            await push(classifiedsRef, postData);
            onClose();
        } catch (error) {
            console.error('Error creating classifieds post:', error);
            setErrors({ form: 'Failed to create post. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal opened={opened} onClose={onClose} title="Create New Classifieds Post" size="lg">
            <Stack>
                <Radio.Group
                    name="postType"
                    label="What kind of post is this?"
                    value={formData.postType}
                    onChange={(value) => {
                        handleFormChange('postType', value);
                        handleFormChange('price', '');
                    }}
                    withAsterisk
                >
                    <Group mt="xs">
                        <Radio value="For Sale" label="For Sale" />
                        <Radio value="For Free" label="For Free" />
                        <Radio value="Wanted" label="Wanted" />
                    </Group>
                </Radio.Group>
                
                <TextInput
                    label="Title"
                    placeholder="e.g., Size 10 Bush Boots"
                    value={formData.title}
                    onChange={(event) => handleFormChange('title', event.currentTarget.value)}
                    error={errors.title}
                    withAsterisk
                />

                <Textarea
                    label="Description"
                    placeholder="Provide details about the item..."
                    value={formData.description}
                    onChange={(event) => handleFormChange('description', event.currentTarget.value)}
                    error={errors.description}
                    withAsterisk
                    minRows={4}
                />

                {formData.postType === 'For Sale' && (
                    <NumberInput
                        label="Price"
                        placeholder="e.g., 150"
                        value={formData.price}
                        onChange={(value) => handleFormChange('price', value)}
                        error={errors.price}
                        prefix="$"
                        min={0}
                        withAsterisk
                    />
                )}

                <Group grow>
                    <Select
                        label="Condition"
                        placeholder="Select condition"
                        data={['Mint', 'Good', 'Good Enough', 'Rough']}
                        value={formData.condition}
                        onChange={(value) => handleFormChange('condition', value)}
                        error={errors.condition}
                        withAsterisk
                    />
                     <Select
                        label="Category"
                        placeholder="Select category"
                        data={['Planting Gear', 'Other']}
                        value={formData.category}
                        onChange={(value) => handleFormChange('category', value)}
                        error={errors.category}
                        withAsterisk
                    />
                </Group>
                
                <Select
                    label="Visibility Scope"
                    description="Where should this post be visible?"
                    data={[
                        { value: 'Camp', label: 'My Camp Only' },
                        { value: 'Company', label: 'My Entire Company' },
                        { value: 'Regional', label: 'My Region (Province/State)', disabled: true }
                    ]}
                    value={formData.scope}
                    onChange={(value) => handleFormChange('scope', value)}
                />

                <Group justify="flex-end" mt="md">
                    <Button variant="default" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} loading={isSubmitting}>Create Post</Button>
                </Group>
            </Stack>
        </Modal>
    );
};

export default AddPostModal;