import { IconMessage } from "@tabler/icons-react";

export const ROLES = {
    0: 'Disabled',
    1: 'Visitor',
    2: 'Tree Planter',
    3: 'Crew Moderator',
    4: 'Crew Boss',
    5: 'Camp Moderator',
    6: 'Camp Boss',
    7: 'Company Moderator',
    8: 'Company Owner',
    9: 'App Admin',
    10: 'Super Admin'
};

export const MESSAGE_TYPES = {
    FORMAL: { key: 'Formal', color: 'red' },
    OPERATIONAL: { key: 'Operational', color: 'yellow' },
    SOCIAL: { key: 'Social', color: 'green' },
    SYSTEM: { key: 'System', color: 'blue' },
};

export const PAGE_TITLES = {
    messages: 'Messages',
    tasks: 'Tasks',
    calendar: 'Calendar',
    appFeedback: 'App Feedback',
    weather: 'Weather',
    polls: 'Polls',
    classifieds: 'Classifieds',
    musicShare: 'Music Share',
    birthdays: 'Birthdays',
    myProfile: 'My Profile',
    settings: 'Settings',
    userManagement: 'User Management',
    campManagement: 'Camp Management',
    crewManagement: 'Crew Management',
    inventory: 'Inventory',
    recipes: 'Recipes',
    orders: 'Orders',
    deliveries: 'Deliveries',
    budget: 'Budget',
    reports: 'Reports',
    staff: 'Staff List',
    treeTracker: 'Tree Tracker',
};

export const MAIN_LINKS = [
    { key: 'messages', emoji: "💬", label: "Messages", visibility: 'visible' },
    { key: 'tasks', emoji: "✅", label: "Tasks", visibility: 'hidden' },
    { key: 'calendar', emoji: "📅", label: "Calendar", visibility: 'disabled' },
];

export const ALL_COLLECTIONS = [
    { emoji: "💡", label: "App Feedback", key: "appFeedback", visibility: 'visible', icon: IconMessage },
    { emoji: "🌲", label: "Tree Tracker", key: "treeTracker", visibility: 'visible' },
    { emoji: "📋", label: "Staff List", key: "staff", visibility: 'visible' },
    { emoji: "📊", label: "Polls", key: "polls", visibility: 'visible' },
    { emoji: "🚗", label: "Day Off Rides", key: "dayOffRides", visibility: 'visible' },
    { emoji: "🤝", label: "Classifieds", key: "classifieds", visibility: 'visible' },
    { emoji: "🎵", label: "Music Share", key: "musicShare", visibility: 'visible' },
    { emoji: "🌦️", label: "Weather", key: "weather", visibility: 'visible' },
    { emoji: "🎂", label: "Birthdays", key: "birthdays", visibility: 'visible' },
    { emoji: "👤", label: "My Profile", key: "myProfile", visibility: 'visible' },
    { emoji: "⚙️", label: "Settings", key: "settings", visibility: 'visible' },
    { emoji: "👨‍👩‍👧‍👦", label: "Crew Management", key: "crewManagement", visibility: 'visible' },
    { emoji: "🏕️", label: "Camp Management", key: "campManagement", visibility: 'visible' },
    { emoji: "👥", label: "User Management", key: "userManagement", visibility: 'visible' },
    { emoji: "📦", label: "Inventory", key: "inventory", visibility: 'hidden' },
    { emoji: "🍲", label: "Recipes", key: "recipes", visibility: 'hidden' },
    { emoji: "🛒", label: "Orders", key: "orders", visibility: 'hidden' },
    { emoji: "🚚", label: "Deliveries", key: "deliveries", visibility: 'hidden' },
    { emoji: "💸", label: "Budget", key: "budget", visibility: 'hidden' },
    { emoji: "📊", label: "Reports", key: "reports", visibility: 'hidden' },
];