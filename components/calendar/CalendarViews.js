"use client";

import React, { useState, useEffect } from 'react';
import { ref, get, onValue } from 'firebase/database';
import { database } from '../../firebase/firebase';

import { Button } from '@mantine/core';

const CalendarViews = () => {
  const [calendarData, setCalendarData] = useState(null);
  const [activeView, setActiveView] = useState('daily');

  useEffect(() => {
    const calendarRef = ref(database, 'camps/scooter/calendar');
    const unsubscribe = onValue(calendarRef, (snapshot) => {
      setCalendarData(snapshot.val());
    });
    return () => unsubscribe();
  }, []);

  // ... (rest of your component, including DailyView, CalendarView, etc.)
  
  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <Button onClick={() => setActiveView('daily')}>Daily</Button>
        <Button onClick={() => setActiveView('shifts')}>Shifts</Button>
        <Button onClick={() => setActiveView('calendar')}>Calendar</Button>
      </div>

      {activeView === 'daily' && <DailyView data={calendarData} />}
      {activeView === 'shifts' && <div>Shifts view coming soon</div>}
      {activeView === 'calendar' && <CalendarView data={calendarData} />}
    </div>
  );
};

const DailyView = ({ data }) => {
  if (!data) return <div>Loading...</div>;
  const dates = Object.keys(data).sort((a, b) => new Date(a) - new Date(b));
  return (
    <div style={{ overflowY: 'auto', maxHeight: '80vh' }}>
      {dates.map((date) => (
        <Daily key={date} date={date} shiftDay={data[date].shiftDay} tasks={data[date].tasks} />
      ))}
    </div>
  );
};

const Daily = ({ date, shiftDay, tasks }) => (
  <div style={{ marginBottom: '24px' }}>
    <h2>{date} (Day {shiftDay === 0 ? "Off" : shiftDay})</h2>
    {tasks ? (
      Object.keys(tasks).map((taskId) => (
        <div key={taskId} style={{ paddingLeft: '16px' }}>
          <p>{tasks[taskId].description || 'Task details'}</p>
        </div>
      ))
    ) : (
      <p>No tasks for this day.</p>
    )}
    <Button onClick={() => alert('Add task.')}>Add Task</Button>
  </div>
);

const CalendarView = ({ data }) => {
  if (!data) return <div>Loading...</div>;
  const dates = Object.keys(data).sort();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
      {dates.map((date) => (
        <CalendarDay key={date} date={date} tasks={data[date]} />
      ))}
    </div>
  );
};

const CalendarDay = ({ date, tasks }) => (
  <div style={{ border: '1px solid #ccc', padding: '8px', minHeight: '80px' }}>
    <div>{date}</div>
    <span>To Do.</span>
  </div>
);

export default CalendarViews;
