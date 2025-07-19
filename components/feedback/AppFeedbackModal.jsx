'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { push, ref, serverTimestamp } from 'firebase/database';
import { Button, Group, Modal, Radio, Stepper, Text, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { database } from '../../firebase/firebase';
import { useAuth } from '../../hooks/useAuth';



const AppFeedbackModal = ({ opened, onClose }) => {
  // Added a comment to trigger re-compilation

  const { user, userData } = useAuth();
  const pathname = usePathname();
  const [active, setActive] = useState(0);
  const [feedbackType, setFeedbackType] = useState(null);
  const [isCurrentPageRelated, setIsCurrentPageRelated] = useState(null);

  const form = useForm({
    initialValues: {
      description: '',
      expectedBehavior: '',
      actualBehavior: '',
      stepsToReproduce: '',
      newFeatureIdea: '',
      helpNeeded: '',
      pageUrl: pathname,
      browserInfo: '',
      screenResolution: '',
    },
    validate: (values) => {
      if (active === 0) {
        if (!feedbackType) {
          return { feedbackType: 'Please select a feedback type' };
        }
        if (feedbackType !== 'newIdea' && !isCurrentPageRelated) {
          return { isCurrentPageRelated: 'Please select an option' };
        }
      }
      if (active === 1) {
        if (feedbackType === 'bug' && !values.description) {
          return { description: 'Please describe the bug' };
        }
        if (feedbackType !== 'newIdea' && !values.newFeatureIdea) {
          return { newFeatureIdea: 'Please describe your idea' };
        }
        if (feedbackType === 'help' && !values.helpNeeded) {
          return { helpNeeded: 'Please describe what help you need' };
        }
      }
      return {};
    },
  });

  useEffect(() => {
    form.setValues({
      browserInfo: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
    });
  }, []);

  const nextStep = () =>
    setActive((current) => {
      if (form.validate().hasErrors) {
        return current;
      }
      return current < 2 ? current + 1 : current;
    });

  const prevStep = () => setActive((current) => (current > 0 ? current - 1 : current));

  const handleSubmit = async () => {
    if (form.validate().hasErrors) {
      return;
    }

    if (!user) {
      notifications.show({
        title: 'Error',
        message: 'You must be logged in to submit feedback.',
        color: 'red',
      });
      return;
    }

    const feedbackData = {
      ...form.values,
      feedbackType,
      isCurrentPageRelated: feedbackType === 'newIdea' ? null : isCurrentPageRelated === 'yes',
      userId: user.uid,
      userName: userData?.name || user.email,
      timestamp: serverTimestamp(),
    };

    try {
      await push(ref(database, 'appFeedback'), feedbackData);
      notifications.show({
        title: 'Success',
        message: 'Thank you for your feedback!',
        color: 'green',
      });
      form.reset();
      setFeedbackType(null);
      setIsCurrentPageRelated(null);
      setActive(0);
      onClose();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Error submitting feedback: ' + error.message,
        color: 'red',
      });
    }
  };

  const handleCloseModal = () => {
    form.reset();
    setFeedbackType(null);
    setIsCurrentPageRelated(null);
    setActive(0);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleCloseModal}
      title="Provide App Feedback"
      centered
      size="lg"
    >
      <Stepper
        active={active}
        onStepClick={setActive}
        allowNext={(active) => {
          if (active === 0)
            return (
              feedbackType !== null && (feedbackType === 'newIdea' || isCurrentPageRelated !== null)
            );
          return true;
        }}
      >
        <Stepper.Step label="Type" description="What kind of feedback?">
          <Radio.Group
            value={feedbackType}
            onChange={setFeedbackType}
            label="What kind of feedback do you want to provide?"
            withAsterisk
          >
            <Radio value="bug" label="I found a bug" />
            <Radio value="newIdea" label="I have a new idea/feature request" />
            <Radio value="help" label="I need help with something else" />
          </Radio.Group>

          {feedbackType !== 'newIdea' && feedbackType !== null && (
            <Radio.Group
              value={isCurrentPageRelated}
              onChange={setIsCurrentPageRelated}
              label="Is this feedback related to the page/feature you are currently on?"
              withAsterisk
              mt="md"
            >
              <Radio value="yes" label="Yes" />
              <Radio value="no" label="No" />
            </Radio.Group>
          )}
        </Stepper.Step>

        <Stepper.Step label="Details" description="Tell me more">
          {feedbackType === 'bug' && (
            <>
              <Textarea
                label="Please describe the bug you experienced:"
                placeholder="e.g., The button didn't work when I clicked it."
                autosize
                minRows={3}
                {...form.getInputProps('description')}
                withAsterisk
              />
              <TextInput
                label="Page/Feature where you experienced the bug:"
                placeholder="e.g., Polls Page, or Weather for my Block"
                value={isCurrentPageRelated === 'yes' ? pathname : form.values.pageUrl}
                onChange={(event) => form.setFieldValue('pageUrl', event.currentTarget.value)}
                disabled={isCurrentPageRelated === 'yes'}
                mt="md"
              />
              <Textarea
                label="What did you expect to happen?"
                placeholder="e.g., I expected the button to open a new window."
                autosize
                minRows={2}
                {...form.getInputProps('expectedBehavior')}
                mt="md"
              />
              <Textarea
                label="What actually happened?"
                placeholder="e.g., Nothing happened, or an error message appeared."
                autosize
                minRows={2}
                {...form.getInputProps('actualBehavior')}
                mt="md"
              />
              <Textarea
                label="Steps to reproduce (if applicable):"
                placeholder="e.g., 1. Go to X page. 2. Click Y button. 3. Observe Z."
                autosize
                minRows={2}
                {...form.getInputProps('stepsToReproduce')}
                mt="md"
              />
            </>
          )}
          {feedbackType === 'newIdea' && (
            <Textarea
              label="Please describe your new idea or feature request:"
              placeholder="e.g., I wish there was a way to track my daily tree count."
              autosize
              minRows={5}
              {...form.getInputProps('newFeatureIdea')}
              withAsterisk
            />
          )}
          {feedbackType === 'help' && (
            <Textarea
              label="Please describe what help you need:"
              placeholder="e.g., I can't find where to update my profile picture."
              autosize
              minRows={5}
              {...form.getInputProps('helpNeeded')}
              withAsterisk
            />
          )}
        </Stepper.Step>

        <Stepper.Step label="Confirm" description="Review and submit">
          <Text size="sm" mb="md">
            Please review your feedback before submitting:
          </Text>
          {feedbackType === 'bug' && (
            <>
              <Text fw={700}>Type:</Text> <Text>Bug Report</Text>
              <Text fw={700}>Related to current page:</Text>{' '}
              <Text>{isCurrentPageRelated === 'yes' ? 'Yes' : 'No'}</Text>
              <Text fw={700}>Description:</Text> <Text>{form.values.description}</Text>
              {form.values.expectedBehavior && (
                <>
                  <Text fw={700}>Expected:</Text> <Text>{form.values.expectedBehavior}</Text>
                </>
              )}
              {form.values.actualBehavior && (
                <>
                  <Text fw={700}>Actual:</Text> <Text>{form.values.actualBehavior}</Text>
                </>
              )}
              {form.values.stepsToReproduce && (
                <>
                  <Text fw={700}>Steps to Reproduce:</Text>{' '}
                  <Text>{form.values.stepsToReproduce}</Text>
                </>
              )}
              <Text fw={700}>Page URL:</Text> <Text>{form.values.pageUrl}</Text>
              <Text fw={700}>Browser Info:</Text> <Text>{form.values.browserInfo}</Text>
              <Text fw={700}>Screen Resolution:</Text> <Text>{form.values.screenResolution}</Text>
            </>
          )}
          {feedbackType === 'newIdea' && (
            <>
              <Text fw={700}>Type:</Text> <Text>New Idea/Feature Request</Text>
              <Text fw={700}>Idea:</Text> <Text>{form.values.newFeatureIdea}</Text>
              <Text fw={700}>Page URL (from):</Text> <Text>{form.values.pageUrl}</Text>
              <Text fw={700}>Browser Info:</Text> <Text>{form.values.browserInfo}</Text>
              <Text fw={700}>Screen Resolution:</Text> <Text>{form.values.screenResolution}</Text>
            </>
          )}
          {feedbackType === 'help' && (
            <>
              <Text fw={700}>Type:</Text> <Text>Help Needed</Text>
              <Text fw={700}>Related to current page:</Text>{' '}
              <Text>{isCurrentPageRelated === 'yes' ? 'Yes' : 'No'}</Text>
              <Text fw={700}>Help Description:</Text> <Text>{form.values.helpNeeded}</Text>
              <Text fw={700}>Page URL:</Text> <Text>{form.values.pageUrl}</Text>
              <Text fw={700}>Browser Info:</Text> <Text>{form.values.browserInfo}</Text>
              <Text fw={700}>Screen Resolution:</Text> <Text>{form.values.screenResolution}</Text>
            </>
          )}
        </Stepper.Step>
      </Stepper>

      <Group justify="flex-end" mt="xl">
        {active !== 0 && (
          <Button variant="default" onClick={prevStep}>
            Back
          </Button>
        )}
        {active !== 2 ? (
          <Button onClick={nextStep}>Next</Button>
        ) : (
          <Button onClick={handleSubmit}>Submit Feedback</Button>
        )}
      </Group>
    </Modal>
  );
};

export default AppFeedbackModal;
