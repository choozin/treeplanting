'use client';

import React, { useState, useEffect } from 'react';
import { Paper, Text, CloseButton } from '@mantine/core'; // Added CloseButton
// import { ref, get } from 'firebase/database'; // Future use for Firebase
// import { database } from '../../firebase/firebase'; // Future use for Firebase

// Added isVisible and onClose props
const CampSpecificAnnouncement = ({ user, campID, isVisible, onClose }) => {
  const [shouldRenderContent, setShouldRenderContent] = useState(false);
  const [message, setMessage] = useState("");

  // TODO: Replace hardcoded logic with Firebase data fetching.
  // This useEffect will fetch the announcement for the specific campID from Firebase.
  // For now, it's hardcoded for campID "scooter".
  useEffect(() => {
    if (user && campID) {
      // --- START OF HARDCODED SECTION TO BE REPLACED ---
      if (campID === "scooter") {
        setMessage("Please check out the 'Polls' section of this app (found in the nav) to participate in polls asking for Breakfast/Dinner meal requests/preferences, and event ideas for nights off.");
        setShouldRenderContent(true); // Internal logic says content is available
      } else {
        // For other camps, no message is shown in this hardcoded version
        setMessage("");
        setShouldRenderContent(false);
      }
      // --- END OF HARDCODED SECTION ---

      /*
      // FUTURE FIREBASE LOGIC EXAMPLE:
      const announcementRef = ref(database, `camps/${campID}/announcements/currentMessage`);
      get(announcementRef).then((snapshot) => {
        if (snapshot.exists()) {
          setMessage(snapshot.val());
          setShouldRenderContent(true);
        } else {
          setMessage("");
          setShouldRenderContent(false);
        }
      }).catch(error => {
        console.error("Error fetching camp specific announcement:", error);
        setMessage("");
        setShouldRenderContent(false);
      });
      */
    } else {
      setShouldRenderContent(false);
      setMessage("");
    }
  }, [user, campID]);

  // Component renders only if parent says it's visible AND internal logic has content
  if (!isVisible || !shouldRenderContent || !message) {
    return null;
  }

  return (
    <Paper
      shadow="md"
      p="lg"
      radius="md"
      withBorder
      style={{
        backgroundColor: 'var(--mantine-color-green-0, #EBFBEE)', // Light green background
        marginBottom: 'var(--mantine-spacing-md, 16px)',
        position: 'relative', // For absolute positioning of the close button
      }}
    >
      <CloseButton
        title="Close this message"
        onClick={onClose} // Use the onClose prop from parent
        style={{
          position: 'absolute',
          top: 'var(--mantine-spacing-sm, 8px)',
          right: 'var(--mantine-spacing-sm, 8px)',
        }}
        aria-label="Close camp-specific announcement"
      />
      <Text size="sm" style={{ lineHeight: 1.6, paddingRight: 'var(--mantine-spacing-xl)' /* Space for close button */ }}>
        {message}
      </Text>
    </Paper>
  );
};

export default CampSpecificAnnouncement;