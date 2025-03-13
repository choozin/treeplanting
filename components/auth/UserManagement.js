"use client";

import { useState, useEffect } from "react";
import { database } from "../../firebase/firebase";
import { ref, get, set, update, push } from "firebase/database";
import md5 from "md5";

const UserManagement = ({ currentUser, campID, handleComponentChange }) => {
    const [newUserEmail, setNewUserEmail] = useState("");
    const [newUserName, setNewUserName] = useState("");
    const [newUserRole, setNewUserRole] = useState("");
    const [selectedCamp, setSelectedCamp] = useState("");
    const [campUsers, setCampUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [availableCamps, setAvailableCamps] = useState([]);

    // Fetch the current user's role and assigned camps
    useEffect(() => {
        if (currentUser) {
            const userRef = ref(database, `users/${currentUser.uid}`);
            get(userRef).then((snapshot) => {
                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    setAvailableCamps(Object.keys(userData.roles || {}));
                }
            });
        }
    }, [currentUser]);

    // Fetch users in the selected camp
    useEffect(() => {
        if (selectedCamp) {
            const campRef = ref(database, `camps/${selectedCamp}/users`);
            get(campRef).then((snapshot) => {
                if (snapshot.exists()) {
                    const usersData = snapshot.val();
                    setCampUsers(Object.keys(usersData).map(userID => ({ id: userID, role: usersData[userID] })));
                } else {
                    setCampUsers([]);
                }
            });
        }
    }, [selectedCamp]);

    // Filter users based on search query
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredUsers(campUsers);
        } else {
            setFilteredUsers(
                campUsers.filter(user =>
                    user.id.includes(searchQuery.toLowerCase())
                )
            );
        }
    }, [searchQuery, campUsers]);

    // Register a new user (admin-register only)
    const handleRegisterUser = async () => {
        if (!newUserEmail.trim() || !newUserName.trim() || !newUserRole || !selectedCamp) {
            alert("All fields are required.");
            return;
        }

        try {
            const userID = push(ref(database, "users")).key; // Generate a new user ID
            const userData = {
                name: newUserName,
                email: newUserEmail,
                role: parseInt(newUserRole),
                createdAt: new Date().toISOString(),
                password: md5("password") // Default password is "password" but stored as MD5 hash
            };

            await set(ref(database, `users/${userID}`), userData);
            await update(ref(database, `camps/${selectedCamp}/users/${userID}`), { role: newUserRole });

            alert("User registered successfully.");
        } catch (error) {
            console.error("Error registering user:", error.message);
        }
    };

    return (
        <div>
            <h2>User Management</h2>

            {/* Camp Selection */}
            <label>
                Select Camp:
                <select value={campID ? campID : selectedCamp} onChange={(e) => setSelectedCamp(e.target.value)}>
                    <option value="" disabled>Select a camp</option>
                    {availableCamps.map((campID) => (
                        <option key={campID} value={campID}>{campID}</option>
                    ))}
                </select>
            </label>

            {/* Register New User */}
            <h3>Register New User</h3>
            <input
                type="text"
                placeholder="Name"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
            />
            <input
                type="email"
                placeholder="Email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
            />
            <input
                type="number"
                placeholder="Role Level (Lower than yours)"
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
            />
            <button onClick={handleRegisterUser}>Register User</button>

            {/* User List */}
            <h3>Manage Users</h3>
            <input
                type="text"
                placeholder="Search users by email"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
            <ul>
                {filteredUsers.map(user => (
                    <li key={user.id}>
                        {user.id} (Role: {user.role})
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default UserManagement;
