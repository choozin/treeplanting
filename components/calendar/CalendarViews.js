"use client";

import React, { useState, useEffect } from "react";
import { ref, onValue, set, remove } from "firebase/database";
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

const mealDifficultyColors = (difficulty) => {
  switch (difficulty) {
    case "1":
      return "blue";
    case "2":
      return "green";
    case "3":
      return "yellow";
    case "4":
      return "orange";
    case "5":
      return "red";
    default:
      return "black";
  }
};

const CalendarViews = ({ user, campID, isCalendarVisible, setIsCalendarVisible, handleComponentChange }) => {
  const [calendarData, setCalendarData] = useState(null);
  const [activeView, setActiveView] = useState("calendar");

  // State to control the AddDay/Modify modal (for both global and cell buttons)
  const [addDayModalOpen, setAddDayModalOpen] = useState(false);
  const [addDayInitialDate, setAddDayInitialDate] = useState(null);
  const [dayModalMode, setDayModalMode] = useState("add"); // "add" or "modify"
  const [dayModalExistingData, setDayModalExistingData] = useState(null);

  useEffect(() => {
    if (!campID) return; // Ensure campID is available before subscribing
    const calendarRef = ref(database, "camps/" + campID + "/calendar");
    const unsubscribe = onValue(
      calendarRef,
      (snapshot) => {
        setCalendarData(snapshot.val());
      },
      (error) => {
        console.error("Error fetching calendar data:", error);
      }
    );

    // Clean up the listener when the component unmounts or campID changes
    return () => unsubscribe();
  }, [campID]);

  // Handler for the "Add Next Day" button.
  const handleAddDay = () => {
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

  // Callbacks to be passed to the Daily view.
  const handleAddDayFromDaily = (date) => {
    setDayModalMode("add");
    setAddDayInitialDate(date);
    setDayModalExistingData(null);
    setAddDayModalOpen(true);
  };

  const handleModifyDayFromDaily = (date, existingData) => {
    setDayModalMode("modify");
    setAddDayInitialDate(date);
    setDayModalExistingData(existingData);
    setAddDayModalOpen(true);
  };

  return (
    campID ? (
      <div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ marginBottom: "16px" }}>
            <div>Schedule View: </div>
            {activeView === "daily" ? (
              <Button onClick={() => setActiveView("calendar")}>
                Switch to Calendar
              </Button>
            ) : (
              <Button onClick={() => setActiveView("daily")}>
                Switch to Daily
              </Button>
            )}
          </div>

          <div style={{ marginBottom: "16px" }}>
            <div>Quick Actions: </div>
            <Button onClick={handleAddDay}>Add Next Day</Button>
          </div>
        </div>

        {activeView === "daily" && (
          <DailyView
            data={calendarData}
            onAddDay={handleAddDayFromDaily}
            onModifyDay={handleModifyDayFromDaily}
          />
        )}
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

        {/* AddDay/Modify modal */}
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
    ) : (
      <div>You must select a camp in the Menu.</div>
    )
  );
};

const DailyView = ({ data, onAddDay, onModifyDay }) => {
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
          breakfastTitle={data[date].breakfastTitle}
          breakfastDifficulty={data[date].breakfastDifficulty}
          dinnerTitle={data[date].dinnerTitle}
          dinnerDifficulty={data[date].dinnerDifficulty}
          onAddDay={onAddDay}
          onModifyDay={onModifyDay}
        />
      ))}
    </div>
  );
};

const Daily = ({
  date,
  shiftDay,
  tasks,
  breakfastTitle,
  breakfastDifficulty,
  dinnerTitle,
  dinnerDifficulty,
  onAddDay,
  onModifyDay,
}) => {
  // Compose dayData from props
  const dayData = {
    shiftDay,
    tasks,
    breakfastTitle,
    breakfastDifficulty,
    dinnerTitle,
    dinnerDifficulty,
  };
  // Assume date is already in YYYY-MM-DD format
  const formattedDate = date;
  return (
    <div style={{ marginBottom: "24px" }}>
      <h2>
        {date} (Day {shiftDay === 0 ? "Off" : shiftDay})
      </h2>
      {breakfastTitle && (
        <span style={{ display: "block", marginBottom: "8px", color: mealDifficultyColors(breakfastDifficulty) }}>
          Breakfast: {breakfastTitle}
        </span>
      )}
      {dinnerTitle && (
        <span style={{ display: "block", marginBottom: "8px", color: mealDifficultyColors(dinnerDifficulty) }}>
          Dinner: {dinnerTitle}
        </span>
      )}
      {tasks ? (
        Object.keys(tasks).map((taskId) => (
          <div key={taskId} style={{ paddingLeft: "16px" }}>
            <p>{tasks[taskId].description || "Task details"}</p>
          </div>
        ))
      ) : (
        <p>No tasks for this day.</p>
      )}
      <div>
        <Button
          size="xs"
          mt="sm"
          onClick={() => onModifyDay(formattedDate, dayData)}
          style={{ width: "100%" }}
        >
          Modify Data
        </Button>
      </div>
    </div>
  );
};

const CalendarView = ({ data, onAddDay, onModifyDay }) => {
  const [weeksDisplayed, setWeeksDisplayed] = useState(5);

  if (!data) return <div>Loading...</div>;

  const dateKeys = Object.keys(data).sort((a, b) => new Date(a) - new Date(b));
  const earliestDate = new Date(dateKeys[0]);
  const startDay = earliestDate.getDay(); // Sunday = 0, Monday = 1, etc.
  const calendarStartDate = new Date(earliestDate);
  calendarStartDate.setDate(earliestDate.getDate() - startDay);

  const totalDays = weeksDisplayed * 7;
  const calendarDays = [];
  for (let i = 0; i < totalDays; i++) {
    const currentDate = new Date(calendarStartDate);
    currentDate.setDate(calendarStartDate.getDate() + i);
    calendarDays.push(currentDate);
  }

  // Helper to format date as YYYY-MM-DD
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(100px, 1fr))",
          gap: "8px",
        }}
      >
        {calendarDays.map((date, index) => {
          const formattedDate = formatDate(date);
          const dayData = data[formattedDate];
          return (
            <div
              key={index}
              style={{
                border: "1px solid #ccc",
                padding: "8px",
                minHeight: "100px",
                position: "relative",
              }}
            >
              <div style={{ fontWeight: "bold" }}>
                {date.getDate()}{" "}
                {dayData && dayData.shiftDay !== undefined
                  ? dayData.shiftDay === 0
                    ? "(Day Off)"
                    : `(Day ${dayData.shiftDay})`
                  : ""}
              </div>
              <div>{dayData && dayData.breakfastTitle}</div>
              <div>{dayData && dayData.dinnerTitle}</div>
              {dayData && dayData.tasks && (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {Object.entries(dayData.tasks).map(([taskId, task]) => (
                    <li
                      key={taskId}
                      style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        width: "100%",
                      }}
                    >
                      {task.description} ({task.author})
                    </li>
                  ))}
                </ul>
              )}
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "center",
                  marginTop: "8px",
                }}
              >
                {dayData ? (
                  <Button
                    size="xs"
                    mt="sm"
                    onClick={() => onModifyDay(formattedDate, dayData)}
                    style={{ width: "100%" }}
                  >
                    Modify Data
                  </Button>
                ) : (
                  <Button
                    size="xs"
                    mt="sm"
                    onClick={() => onAddDay(formattedDate)}
                    style={{ width: "100%" }}
                  >
                    Add Data
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
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
  existingData, // used in modify mode
}) => {
  const [date, setDate] = useState("");
  const [dateConfirmed, setDateConfirmed] = useState(false);
  const [breakfastTitle, setBreakfastTitle] = useState("");
  const [breakfastDifficulty, setBreakfastDifficulty] = useState(3);
  const [dinnerTitle, setDinnerTitle] = useState("");
  const [dinnerDifficulty, setDinnerDifficulty] = useState(3);
  const [tasks, setTasks] = useState([]);
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState("");
  const [shiftDay, setShiftDay] = useState(1);

  useEffect(() => {
    if (opened) {
      if (mode === "modify" && existingData) {
        setDate(initialDate);
        setDateConfirmed(true);
        setBreakfastTitle(existingData.breakfastTitle || "");
        setBreakfastDifficulty(existingData.breakfastDifficulty || 3);
        setDinnerTitle(existingData.dinnerTitle || "");
        setDinnerDifficulty(existingData.dinnerDifficulty || 3);
        setShiftDay(typeof existingData.shiftDay === "number" ? existingData.shiftDay : 1);
        const tasksArr = existingData.tasks ? Object.values(existingData.tasks) : [];
        setTasks(tasksArr);
      } else {
        if (initialDate) {
          setDate(initialDate);
        } else if (data) {
          const dates = Object.keys(data);
          if (dates.length > 0) {
            const sortedDates = dates.sort((a, b) => new Date(a) - new Date(b));
            const lastDateStr = sortedDates[sortedDates.length - 1];
            const lastDate = new Date(lastDateStr);
            const nextDate = new Date(lastDate);
            nextDate.setDate(lastDate.getDate() + 1);
            setDate(nextDate.toISOString().split("T")[0]);
          } else {
            setDate(new Date().toISOString().split("T")[0]);
          }
        } else {
          setDate(new Date().toISOString().split("T")[0]);
        }
      }
    }
  }, [opened, initialDate, data, mode, existingData]);

  useEffect(() => {
    if (opened && mode === "add" && dateConfirmed) {
      const currentDate = new Date(date);
      const prevDate = new Date(currentDate);
      prevDate.setDate(currentDate.getDate() - 1);
      const prevDateStr = prevDate.toISOString().split("T")[0];
      if (data && data[prevDateStr] && typeof data[prevDateStr].shiftDay === "number") {
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

  const handleAddTask = () => {
    if (newTaskDescription.trim() === "") return;
    const newTask = {
      id: Date.now(),
      description: newTaskDescription,
      assignedTo: newTaskAssignedTo,
      author: user.uid,
      completed: false,
    };
    setTasks((prev) => [...prev, newTask]);
    setNewTaskDescription("");
    setNewTaskAssignedTo("");
  };

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
      await set(ref(database, `camps/${campID}/calendar/${date}`), newData);
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

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete data for this day?")) {
      try {
        await remove(ref(database, `camps/${campID}/calendar/${date}`));
        alert("Data deleted successfully.");
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
            <Text mb="sm">Date: {date}</Text>
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
                      {task.assignedTo && `(Assigned to: ${task.assignedTo})`} (Author: {task.author})
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
