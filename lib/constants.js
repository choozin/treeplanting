import { IconMessage, IconCheckbox, IconUser } from "@tabler/icons-react";

export const ROLES = {
    0: 'Disabled',
    1: 'Visitor',
    2: 'Jr. Tree Planter',
    3: 'Tree Planter',
    4: 'Sr. Tree Planter',
    5: 'Crew Boss',
    6: 'Camp Boss',
    7: 'Company Boss',
    8: 'Company Owner',
    9: 'App Admin',
    10: 'Super Admin'
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
    myAccount: 'My Account',
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
};

export const MAIN_LINKS = [
    { key: 'messages', icon: IconMessage, label: "Messages", isFunctional: true },
    { key: 'tasks', icon: IconCheckbox, label: "Tasks", isFunctional: false },
    { key: 'calendar', icon: IconUser, label: "Calendar", isFunctional: false },
];

export const ALL_COLLECTIONS = [
    { emoji: "💡", label: "App Feedback", key: "appFeedback", isFunctional: false },
    { emoji: "🌦️", label: "Weather", key: "weather", isFunctional: true },
    { emoji: "📊", label: "Polls", key: "polls", isFunctional: true },
    { emoji: "🤝", label: "Classifieds", key: "classifieds", isFunctional: true },
    { emoji: "🎵", label: "Music Share", key: "musicShare", isFunctional: true },
    { emoji: "🎂", label: "Birthdays", key: "birthdays", isFunctional: true },
    { emoji: "👤", label: "My Account", key: "myAccount", isFunctional: true },
    { emoji: "👥", label: "User Management", key: "userManagement", isFunctional: true },
    { emoji: "🏕️", label: "Camp Management", key: "campManagement", isFunctional: true },
    { emoji: "👨‍👩‍👧‍👦", label: "Crew Management", key: "crewManagement", isFunctional: true },
    { emoji: "📦", label: "Inventory", key: "inventory", isFunctional: false },
    { emoji: "🍲", label: "Recipes", key: "recipes", isFunctional: false },
    { emoji: "🛒", label: "Orders", key: "orders", isFunctional: false },
    { emoji: "🚚", label: "Deliveries", key: "deliveries", isFunctional: false },
    { emoji: "💸", label: "Budget", key: "budget", isFunctional: false },
    { emoji: "📊", label: "Reports", key: "reports", isFunctional: false },
    { emoji: "📋", label: "Staff List", key: "staff", isFunctional: false },
]; 