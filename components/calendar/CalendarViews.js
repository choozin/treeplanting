"use client";

import React, { useState, useEffect } from "react";
import { ref, get, onValue, set, remove } from "firebase/database";
import { database } from "../../firebase/firebase";

import {
  Modal,
  TextInput,
  NumberInput,
  Button,
  Group,
  Box,
  Title,
  Text,
} from "@mantine/core";

const CalendarViews = ({ user, campID }) => {
  const [calendarData, setCalendarData] = useState(null);
  const [activeView, setActiveView] = useState("daily");

  // State to control the AddDay/Modify modal (for both global and cell buttons)
  const [addDayModalOpen, setAddDayModalOpen] = useState(false);
  const [addDayInitialDate, setAddDayInitialDate] = useState(null);
  const [dayModalMode, setDayModalMode] = useState("add"); // "add" or "modify"
  const [dayModalExistingData, setDayModalExistingData] = useState(null);

  useEffect(() => {
    const calendarRef = ref(database, "camps/" + campID + "/calendar");
    get(calendarRef)
      .then((snapshot) => {
        setCalendarData(snapshot.val());
      })
      .catch((error) => {
        console.error("Error fetching calendar data:", error);
      });
  }, [campID]);

  // Handler for the global "Add Next Day" button.
  const handleGlobalAddDay = () => {
    setDayModalMode("add");
    if (calendarData) {
      const dates = Object.keys(calendarData);
      if (dates.length > 0) {
        const sortedDates = dates.sort((a, b) => new Date(a) - new Date(b));
        const lastDateStr = sortedDates[sortedDates.length - 1];
        const lastDate = new Date(lastDateStr);
        const nextDate = new Date(lastDate);
        nextDate.setDate(lastDate.getDate() + 1);
        setAddDayInitialDate(nextDate.toISOString().split("T")[0]);
      } else {
        setAddDayInitialDate(new Date().toISOString().split("T")[0]);
      }
    } else {
      setAddDayInitialDate(new Date().toISOString().split("T")[0]);
    }
    setDayModalExistingData(null);
    setAddDayModalOpen(true);
  };

  return (
    <div>
      <div style={{ marginBottom: "16px" }}>
        <div>Schedule View: </div>
        <Button onClick={() => setActiveView("daily")}>Daily</Button>
        <Button onClick={() => setActiveView("calendar")}>Calendar</Button>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <div>Quick Actions: </div>
        <Button onClick={handleGlobalAddDay}>Add Next Day</Button>
      </div>

      {activeView === "daily" && <DailyView data={calendarData} />}
      {activeView === "shifts" && <div>Shifts view coming soon</div>}
      {activeView === "calendar" && (
        <CalendarView
          data={calendarData}
          onAddDay={(date) => {
            setDayModalMode("add");
            setAddDayInitialDate(date);
            setDayModalExistingData(null);
            setAddDayModalOpen(true);
          }}
          onModifyDay={(date, existingData) => {
            setDayModalMode("modify");
            setAddDayInitialDate(date);
            setDayModalExistingData(existingData);
            setAddDayModalOpen(true);
          }}
        />
      )}

      {/* AddDay/Modify modal appears here. */}
      <AddDay
        user={user}
        campID={campID}
        data={calendarData}
        initialDate={addDayInitialDate}
        standardShiftLength={3}
        opened={addDayModalOpen}
        onClose={() => setAddDayModalOpen(false)}
        mode={dayModalMode}
        existingData={dayModalExistingData}
      />
    </div>
  );
};

const DailyView = ({ data }) => {
  if (!data) return <div>Loading...</div>;
  const dates = Object.keys(data).sort((a, b) => new Date(a) - new Date(b));
  return (
    <div style={{ overflowY: "auto", maxHeight: "80vh" }}>
      {dates.map((date) => (
        <Daily
          key={date}
          date={date}
          shiftDay={data[date].shiftDay}
          tasks={data[date].tasks}
        />
      ))}
    </div>
  );
};

const Daily = ({ date, shiftDay, tasks }) => (
  <div style={{ marginBottom: "24px" }}>
    <h2>
      {date} (Day {shiftDay === 0 ? "Off" : shiftDay})
    </h2>
    {tasks ? (
      Object.keys(tasks).map((taskId) => (
        <div key={taskId} style={{ paddingLeft: "16px" }}>
          <p>{tasks[taskId].description || "Task details"}</p>
        </div>
      ))
    ) : (
      <p>No tasks for this day.</p>
    )}
    <Button onClick={() => alert("Add task.")}>Add Task</Button>
  </div>
);

const CalendarView = ({ data, onAddDay, onModifyDay }) => {
  // Set the number of weeks to display (can be changed as needed)
  const [weeksDisplayed, setWeeksDisplayed] = useState(5);

  if (!data) return <div>Loading...</div>;

  // Get all the date keys from the data and sort them
  const dateKeys = Object.keys(data).sort((a, b) => new Date(a) - new Date(b));

  // Determine the earliest date in the data
  const earliestDate = new Date(dateKeys[0]);

  // Calculate the start date for the calendar:
  // Back up to the previous Sunday if the earliest date isn't already a Sunday.
  const startDay = earliestDate.getDay(); // Sunday = 0, Monday = 1, etc.
  const calendarStartDate = new Date(earliestDate);
  calendarStartDate.setDate(earliestDate.getDate() - startDay);

  // Calculate total number of days to display based on weeksDisplayed
  const totalDays = weeksDisplayed * 7;
  const calendarDays = [];
  for (let i = 0; i < totalDays; i++) {
    const currentDate = new Date(calendarStartDate);
    currentDate.setDate(calendarStartDate.getDate() + i);
    calendarDays.push(currentDate);
  }

  // Helper function to format dates as YYYY-MM-DD (assumes data keys use this format)
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: "8px",
      }}
    >
      {calendarDays.map((date, index) => {
        const formattedDate = formatDate(date);
        // Check if there's data for this date
        const dayData = data[formattedDate];
        return (
          <div
            key={index}
            style={{
              border: "1px solid #ccc",
              padding: "8px",
              minHeight: "100px",
              position: "relative",
              minWidth: 0, // Allow the cell to shrink and prevent expansion
            }}
          >
            {/* Display the day of the month with shift info if available */}
            <div style={{ fontWeight: "bold" }}>
              {date.getDate()}{" "}
              {dayData && dayData.shiftDay !== undefined
                ? dayData.shiftDay === 0
                  ? "(Day Off)"
                  : `(Day ${dayData.shiftDay})`
                : ""}
            </div>
            {/* Show Breakfast Title & Dinner Title */}
            <div>.{dayData && dayData.breakfastTitle}</div>
            <div>{dayData && dayData.dinnerTitle}</div>
            {/* If tasks exist for this date, list them */}
            {dayData && dayData.tasks && (
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                }}
              >
                {Object.entries(dayData.tasks).map(([taskId, task]) => (
                  <li
                    key={taskId}
                    style={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      width: "100%",
                      display: "block",
                    }}
                  >
                    {task.description} ({task.author})
                  </li>
                ))}
              </ul>
            )}
            {/* Show "Add Data" if no data exists, else show "Modify Data" */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
              {dayData ? (
                <Button
                  size="xs"
                  mt="sm"
                  onClick={() => onModifyDay(formattedDate, dayData)}
                  style={{ width: '100%' }} // Make button full width if desired
                >
                  Modify Data
                </Button>
              ) : (
                <Button
                  size="xs"
                  mt="sm"
                  onClick={() => onAddDay(formattedDate)}
                  style={{ width: '100%' }} // Make button full width if desired
                >
                  Add Data
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const AddDay = ({
  user,
  campID,
  data,
  initialDate,
  standardShiftLength = 3,
  opened,
  onClose,
  mode, // "add" or "modify"
  existingData, // only used in modify mode
}) => {
  // Date and confirmation state
  const [date, setDate] = useState("");
  const [dateConfirmed, setDateConfirmed] = useState(false);

  // Form fields state
  const [breakfastTitle, setBreakfastTitle] = useState("");
  const [breakfastDifficulty, setBreakfastDifficulty] = useState(3);
  const [dinnerTitle, setDinnerTitle] = useState("");
  const [dinnerDifficulty, setDinnerDifficulty] = useState(3);
  const [tasks, setTasks] = useState([]);

  // New task input states
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState("");

  // Computed (and modifiable) shiftDay
  const [shiftDay, setShiftDay] = useState(1);

  // When the modal opens, set a default date and pre-populate if in modify mode.
  useEffect(() => {
    if (opened) {
      if (mode === "modify" && existingData) {
        setDate(initialDate);
        setDateConfirmed(true);
        setBreakfastTitle(existingData.breakfastTitle || "");
        setBreakfastDifficulty(existingData.breakfastDifficulty || 3);
        setDinnerTitle(existingData.dinnerTitle || "");
        setDinnerDifficulty(existingData.dinnerDifficulty || 3);
        setShiftDay(
          typeof existingData.shiftDay === "number"
            ? existingData.shiftDay
            : 1
        );
        // Convert tasks object to an array, if it exists.
        const tasksArr = existingData.tasks
          ? Object.values(existingData.tasks)
          : [];
        setTasks(tasksArr);
      } else {
        // "add" mode logic.
        if (initialDate) {
          setDate(initialDate);
        } else if (data) {
          // Compute default date as the day after the most recent date in data.
          const dates = Object.keys(data);
          if (dates.length > 0) {
            const sortedDates = dates.sort(
              (a, b) => new Date(a) - new Date(b)
            );
            const lastDateStr = sortedDates[sortedDates.length - 1];
            const lastDate = new Date(lastDateStr);
            const nextDate = new Date(lastDate);
            nextDate.setDate(lastDate.getDate() + 1);
            setDate(nextDate.toISOString().split("T")[0]);
          } else {
            // No data exists—default to today's date.
            setDate(new Date().toISOString().split("T")[0]);
          }
        } else {
          setDate(new Date().toISOString().split("T")[0]);
        }
      }
    }
  }, [opened, initialDate, data, mode, existingData]);

  // In "add" mode, once the date is confirmed, compute shiftDay.
  useEffect(() => {
    if (opened && mode === "add" && dateConfirmed) {
      const currentDate = new Date(date);
      const prevDate = new Date(currentDate);
      prevDate.setDate(currentDate.getDate() - 1);
      const prevDateStr = prevDate.toISOString().split("T")[0];
      if (
        data &&
        data[prevDateStr] &&
        typeof data[prevDateStr].shiftDay === "number"
      ) {
        const prevShift = data[prevDateStr].shiftDay;
        if (prevShift >= standardShiftLength) {
          setShiftDay(0);
        } else {
          setShiftDay(prevShift + 1);
        }
      } else {
        setShiftDay(1);
      }
    }
  }, [opened, mode, dateConfirmed, date, data, standardShiftLength]);

  // Reset form state when the modal closes.
  useEffect(() => {
    if (!opened) {
      setDate("");
      setDateConfirmed(false);
      setBreakfastTitle("");
      setBreakfastDifficulty(3);
      setDinnerTitle("");
      setDinnerDifficulty(3);
      setTasks([]);
      setNewTaskDescription("");
      setNewTaskAssignedTo("");
      setShiftDay(1);
    }
  }, [opened]);

  // Handler for adding a new task.
  const handleAddTask = () => {
    if (newTaskDescription.trim() === "") return;
    alert("USER: " + JSON.stringify(user, null, 2));
    const newTask = {
      id: Date.now(), // Temporary unique ID
      description: newTaskDescription,
      assignedTo: newTaskAssignedTo,
      author: user.uid,
      completed: false,
    };
    setTasks((prev) => [...prev, newTask]);
    setNewTaskDescription("");
    setNewTaskAssignedTo("");
  };

  // Handler for form submission.
  const handleSubmit = async (resetAfterSubmit = false) => {
    if (!date || breakfastTitle.trim() === "" || dinnerTitle.trim() === "") {
      alert("Please fill in all required fields.");
      return;
    }
    const tasksObj = {};
    tasks.forEach((task, index) => {
      tasksObj[`task${index + 1}`] = {
        description: task.description,
        assignedTo: task.assignedTo,
        author: task.author,
        completed: task.completed,
      };
    });
    const newData = {
      shiftDay,
      tasks: tasksObj,
      breakfastTitle,
      breakfastDifficulty,
      dinnerTitle,
      dinnerDifficulty,
    };

    try {
      alert(campID)
      await set(ref(database, `camps/` + campID + `/calendar/${date}`), newData); // change scooter to your campID 
      alert("Data added successfully!");
      if (mode === "add" && resetAfterSubmit) {
        const currentDate = new Date(date);
        const nextDate = new Date(currentDate);
        nextDate.setDate(currentDate.getDate() + 1);
        setDate(nextDate.toISOString().split("T")[0]);
        setDateConfirmed(false);
        setBreakfastTitle("");
        setBreakfastDifficulty(3);
        setDinnerTitle("");
        setDinnerDifficulty(3);
        setTasks([]);
      } else {
        onClose();
      }
    } catch (error) {
      console.log("Error adding data:", error);
      alert("Error adding data: " + error.message);
    }
  };

  // Handler for deleting data in modify mode.
  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete data for this day?")) {
      try {
        await remove(ref(database, `camps/scooter/calendar/${date}`));
        alert("Data deleted successfully!");
        onClose();
      } catch (error) {
        console.log("Error deleting data:", error);
        alert("Error deleting data: " + error.message);
      }
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Day Data" size="lg">
      <Box>
        {!dateConfirmed && mode === "add" ? (
          <>
            <Text mb="sm">
              Select the date for which you want to add data:
            </Text>
            <TextInput
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <Button
              mt="md"
              onClick={() => {
                if (!date) {
                  alert("Please select a date.");
                  return;
                }
                setDateConfirmed(true);
              }}
            >
              Confirm Date
            </Button>
          </>
        ) : (
          <>
            {/* In modify mode, display the date (read-only) */}
            <Text mb="sm">Date: {date}</Text>
            {/* Shift Day is now modifiable */}
            <NumberInput
              label="Shift Day"
              value={shiftDay}
              onChange={(val) => setShiftDay(val)}
              min={0}
              mt="sm"
            />
            <TextInput
              label="Breakfast Title (required)"
              placeholder="Enter breakfast title"
              value={breakfastTitle}
              onChange={(e) => setBreakfastTitle(e.target.value)}
              required
              mt="sm"
            />
            <NumberInput
              label="Breakfast Difficulty (1-5)"
              value={breakfastDifficulty}
              onChange={(val) => setBreakfastDifficulty(val)}
              min={1}
              max={5}
              mt="sm"
            />
            <TextInput
              label="Dinner Title (required)"
              placeholder="Enter dinner title"
              value={dinnerTitle}
              onChange={(e) => setDinnerTitle(e.target.value)}
              required
              mt="sm"
            />
            <NumberInput
              label="Dinner Difficulty (1-5)"
              value={dinnerDifficulty}
              onChange={(val) => setDinnerDifficulty(val)}
              min={1}
              max={5}
              mt="sm"
            />

            <Box mt="md">
              <Title order={4}>Tasks</Title>
              {tasks.length > 0 && (
                <Box mb="md">
                  {tasks.map((task) => (
                    <Text key={task.id}>
                      {task.description}{" "}
                      {task.assignedTo &&
                        `(Assigned to: ${task.assignedTo})`} (Author:{" "}
                      {task.author})
                    </Text>
                  ))}
                </Box>
              )}
              <TextInput
                label="Task Description"
                placeholder="Enter task description"
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
              />
              <TextInput
                label="Assigned To (optional)"
                placeholder="Enter assignee name"
                value={newTaskAssignedTo}
                onChange={(e) => setNewTaskAssignedTo(e.target.value)}
                mt="sm"
              />
              <Button mt="sm" onClick={handleAddTask}>
                Add Task
              </Button>
            </Box>

            <Group mt="md">
              <Button onClick={() => handleSubmit(false)}>Submit</Button>
              {mode === "add" && (
                <Button variant="outline" onClick={() => handleSubmit(true)}>
                  Submit and add another day
                </Button>
              )}
            </Group>
            {mode === "modify" && (
              <Group mt="md">
                <Button color="red" onClick={handleDelete}>
                  Delete Data
                </Button>
              </Group>
            )}
          </>
        )}
      </Box>
    </Modal>
  );
};

export default CalendarViews;