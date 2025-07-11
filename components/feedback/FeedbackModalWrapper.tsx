'use client';

import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import AppFeedbackModal from './AppFeedbackModal';

const FeedbackModalWrapper: React.FC = () => {
    const { isFeedbackModalOpen, closeFeedbackModal } = useAuth();

    return (
        <AppFeedbackModal
            opened={isFeedbackModalOpen}
            onClose={closeFeedbackModal}
        />
    );
};

export default FeedbackModalWrapper;