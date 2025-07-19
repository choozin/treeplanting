'use client';
import { Accordion, Tabs } from '@mantine/core';
import { database } from '../../firebase/firebase';
import { ref, onValue } from 'firebase/database';
import { useEffect, useState } from 'react';

const AppManagement = () => {
  const [feedback, setFeedback] = useState([]);

  useEffect(() => {
    const feedbackRef = ref(database, 'appFeedback');
    onValue(feedbackRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const feedbackList = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        setFeedback(feedbackList);
      }
    });
  }, []);

  return (
    <Tabs defaultValue="feedback">
      <Tabs.List>
        <Tabs.Tab value="feedback">Feedback</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="feedback">
        <Accordion>
          {feedback.map((item) => (
            <Accordion.Item key={item.id} value={item.id}>
              <Accordion.Control>{item.userName} - {new Date(item.timestamp).toLocaleString()}</Accordion.Control>
              <Accordion.Panel>
                <p><strong>Type:</strong> {item.feedbackType}</p>
                <p><strong>Page:</strong> {item.pageUrl}</p>
                <p><strong>Description:</strong> {item.description || item.newFeatureIdea || item.helpNeeded}</p>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Tabs.Panel>
    </Tabs>
  );
};

export default AppManagement;
''
