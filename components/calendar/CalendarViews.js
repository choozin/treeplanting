'use client';

import React, { useState, useEffect } from 'react';
import { ref, onValue, set, update, get } from 'firebase/database';
import { database } from '../../firebase/firebase';
import {
    Modal,
    NumberInput,
    Button,
    Group,
    Box,
    Title,
    Text,
    Select,
    ActionIcon,
} from '@mantine/core';
import { useModals } from '@mantine/modals';

const CalendarViews = ({ user, campID, effectiveRole }) => {
    const [calendarData, setCalendarData] = useState(null);
    const [activeView, setActiveView] = useState('calendar');
    const [modifyModalOpen, setModifyModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [newShiftDay, setNewShiftDay] = useState(0);

    const modals = useModals();

    useEffect(() => {
        if (!campID) return;
        const calendarRef = ref(database, `camps/${campID}/calendar`);
        const unsubscribe = onValue(calendarRef, (snapshot) => {
            setCalendarData(snapshot.val());
        });
        return () => unsubscribe();
    }, [campID]);

    const handleOpenModifyModal = (date, currentShiftDay) => {
        setSelectedDate(date);
        setNewShiftDay(currentShiftDay);
        setModifyModalOpen(true);
    };

    const handleModifySubmit = () => {
        modals.openConfirmModal({
            title: 'Confirm Calendar Update',
            centered: true,
            children: (
                <Text size="sm">
                    Changing this day will regenerate all subsequent days in the calendar. Are you sure you want to proceed?
                </Text>
            ),
            labels: { confirm: 'Confirm', cancel: 'Cancel' },
            onConfirm: async () => {
                await updateCalendar(selectedDate, newShiftDay);
                setModifyModalOpen(false);
            },
        });
    };

    const updateCalendar = async (startDate, startShiftDay) => {
        const allDates = Object.keys(calendarData).sort();
        const updates = {};
        let currentDate = new Date(startDate);
        let currentShiftDay = startShiftDay;

        const campRef = ref(database, `camps/${campID}`);
        const snapshot = await get(campRef);
        const campData = snapshot.val();
        const shiftLength = campData.campLocations[campData.activeLocationId]?.calendarConfig?.shiftLength || 3;

        const startIndex = allDates.indexOf(startDate);

        for (let i = startIndex; i < allDates.length; i++) {
            const dateString = allDates[i];
            updates[dateString] = { shiftDay: currentShiftDay };

            if (currentShiftDay === 0) {
                currentShiftDay = 1;
            } else if (currentShiftDay >= shiftLength) {
                currentShiftDay = 0;
            } else {
                currentShiftDay++;
            }
        }

        try {
            await update(ref(database, `camps/${campID}/calendar`), updates);
            alert('Calendar updated successfully!');
        } catch (error) {
            console.error('Error updating calendar:', error);
            alert('Failed to update calendar.');
        }
    };

    return (
        campID ? (
            <div>
                <div style={{ marginBottom: '16px' }}>
                    <Select
                        label="Switch View"
                        value={activeView}
                        onChange={setActiveView}
                        data={[
                            { value: 'calendar', label: 'Calendar View' },
                            { value: 'daily', label: 'Daily View' },
                        ]}
                    />
                </div>

                {activeView === 'daily' && <DailyView data={calendarData} onModifyDay={handleOpenModifyModal} effectiveRole={effectiveRole} />}
                {activeView === 'calendar' && <CalendarView data={calendarData} onModifyDay={handleOpenModifyModal} effectiveRole={effectiveRole} />}

                <Modal
                    opened={modifyModalOpen}
                    onClose={() => setModifyModalOpen(false)}
                    title={`Modify Day: ${selectedDate}`}
                >
                    <Box>
                        <NumberInput
                            label="Shift Day (0 for Day Off)"
                            value={newShiftDay}
                            onChange={setNewShiftDay}
                            min={0}
                        />
                        <Group justify="flex-end" mt="md">
                            <Button variant="default" onClick={() => setModifyModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleModifySubmit}>Update</Button>
                        </Group>
                    </Box>
                </Modal>
            </div>
        ) : (
            <div>You must select a camp in the Menu.</div>
        )
    );
};

const DailyView = ({ data, onModifyDay }) => {
    if (!data) return <div>Loading...</div>;
    const dates = Object.keys(data).sort((a, b) => new Date(a) - new Date(b));
    return (
        <div style={{ overflowY: 'auto', maxHeight: '80vh' }}>
            {dates.map((date) => (
                <Daily key={date} date={date} dayData={data[date]} onModifyDay={onModifyDay} />
            ))}
        </div>
    );
};

const Daily = ({ date, dayData, onModifyDay, effectiveRole }) => {
    const { shiftDay } = dayData;
    return (
        <div style={{ marginBottom: '24px', padding: '16px', border: '1px solid #ccc', borderRadius: '8px' }}>
            <Group justify="space-between" align="center">
                <h2>
                    {date} (Day {shiftDay === 0 ? 'Off' : shiftDay})
                </h2>
                {effectiveRole >= 5 && (
                    <ActionIcon variant="subtle" onClick={() => onModifyDay(date, shiftDay)}>
                        <IconEdit size={18} />
                    </ActionIcon>
                )}
            </Group>
        </div>
    );
};

const parseDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

import { IconChevronLeft, IconChevronRight, IconEdit } from '@tabler/icons-react';

const CalendarView = ({ data, onModifyDay, effectiveRole }) => {
    const [viewDate, setViewDate] = useState(new Date()); // State for the currently viewed month

    if (!data) return <div>Loading...</div>;

    const dateKeys = Object.keys(data);
    if (dateKeys.length === 0) return <div>No calendar data available.</div>;

    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getDaysInMonth = (year, month) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const renderCalendarDays = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth(); // 0-indexed

        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = getDaysInMonth(year, month);
        const lastDayOfMonth = new Date(year, month, daysInMonth);

        const calendarDays = [];

        // Fill leading empty days
        const startDay = firstDayOfMonth.getDay(); // 0 for Sunday, 1 for Monday, etc.
        for (let i = 0; i < startDay; i++) {
            calendarDays.push(null); // Placeholder for empty cells
        }

        // Fill days of the month
        for (let i = 1; i <= daysInMonth; i++) {
            calendarDays.push(new Date(year, month, i));
        }

        // Fill trailing empty days to complete the last week
        const endDay = lastDayOfMonth.getDay();
        for (let i = endDay; i < 6; i++) {
            calendarDays.push(null); // Placeholder for empty cells
        }

        return calendarDays;
    };

    const handlePrevMonth = () => {
        setViewDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setMonth(newDate.getMonth() - 1);
            return newDate;
        });
    };

    const handleNextMonth = () => {
        setViewDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setMonth(newDate.getMonth() + 1);
            return newDate;
        });
    };

    const monthName = viewDate.toLocaleString('default', { month: 'long' });
    const currentYear = viewDate.getFullYear();

    return (
        <div style={{ overflowX: 'auto' }}>
            <Group justify="space-between" mb="md">
                <ActionIcon variant="outline" onClick={handlePrevMonth}>
                    <IconChevronLeft size={18} />
                </ActionIcon>
                <Title order={3}>{monthName} {currentYear}</Title>
                <ActionIcon variant="outline" onClick={handleNextMonth}>
                    <IconChevronRight size={18} />
                </ActionIcon>
            </Group>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, minmax(120px, 1fr))',
                    gap: '4px',
                }}
            >
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} style={{ textAlign: 'center', fontWeight: 'bold' }}>{day}</div>
                ))}
                {renderCalendarDays().map((date, index) => {
                    const formattedDate = date ? formatDate(date) : null;
                    const dayData = formattedDate ? data[formattedDate] : null;
                    return (
                        <div
                            key={index}
                            style={{
                                border: '1px solid #ccc',
                                padding: '8px',
                                minHeight: '100px',
                                backgroundColor: dayData ? '#fff' : '#f0f0f0',
                                opacity: date ? 1 : 0.5, // Dim empty cells
                            }}
                        >
                            {date && (
                                <Group justify="space-between" align="center">
                                    <div style={{ fontWeight: 'bold' }}>{date.getDate()}</div>
                                    {dayData && effectiveRole >= 5 && (
                                        <ActionIcon variant="subtle" onClick={() => onModifyDay(formattedDate, dayData.shiftDay)}>
                                            <IconEdit size={16} />
                                        </ActionIcon>
                                    )}
                                </Group>
                            )}
                            {dayData && (
                                <>
                                    <div>
                                        {dayData.shiftDay === 0 ? 'Day Off' : `Day ${dayData.shiftDay}`}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CalendarViews;