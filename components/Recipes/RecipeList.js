"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { ref, onValue, get } from "firebase/database";
import { auth, database, logoutUser } from "../../firebase/firebase";

const RecipeList = ( { isRecipesListVisible, setIsRecipesListVisible }) => {
  const originalRecipes = [
    {
      recipeName: "Penne Bake w/ Italian Sausage",
      difficulty: 1,
      cost: 3,
      excitement: 4,
      month: 6,
      meal: "dinner",
    },
    {
      recipeName: "Spaghetti w/ Bolognese",
      difficulty: 1,
      cost: 3,
      excitement: 4,
      month: 6,
      meal: "dinner",
    },
    {
      recipeName: "Lasagna",
      difficulty: 4,
      cost: 4,
      excitement: 3,
      month: 6,
      meal: "dinner",
    },
    {
      recipeName: "Chicken Parm",
      difficulty: 3,
      cost: 3,
      excitement: 3,
      month: 6,
      meal: "dinner",
    },
    {
      recipeName:
        "Cold Cut/Meatball Subs (w/ lettuce, onion, tomato, cucumber, spinach, etc.)",
      difficulty: 1,
      cost: 2,
      excitement: 3,
      month: 7,
      meal: "dinner",
    },
    {
      recipeName: "Pulled Pork Sandwiches w/ Roasted Potatoes & Veg",
      difficulty: 3,
      cost: 3,
      excitement: 3,
      month: 6,
      meal: "dinner",
    },
    {
      recipeName: "Hamburgers/Hot Dogs w/ Fries & Onion Rings",
      difficulty: 3,
      cost: 3,
      excitement: 3,
      month: 6,
      meal: "dinner",
    },
    {
      recipeName: "Sloppy Joes on Fresh Buns",
      difficulty: 2,
      cost: 2,
      excitement: 3,
      month: 6,
      meal: "dinner",
    },
    {
      recipeName: "(Vegetarian) Chilli Cheese Dogs",
      difficulty: 2,
      cost: 2,
      excitement: 4,
      month: 6,
      meal: "dinner",
    },
    {
      recipeName: "Korean Beef w/ Shredded Carrot, Rice & Bok Choi",
      difficulty: 3,
      cost: 3,
      excitement: 3,
      month: 6,
      meal: "dinner",
    },
    {
      recipeName: "Cabbage & Sweet & Salty (Ground) Pork on Rice w/ Shredded Carrot",
      difficulty: 3,
      cost: 2,
      excitement: 3,
      month: 6,
      meal: "dinner",
    },
    {
      recipeName: "Chicken Chow Mein w/ carrot, beansprout, something else green?",
      difficulty: 2,
      cost: 3,
      excitement: 3,
      month: 6,
      meal: "dinner",
    },
    {
      recipeName: "Beef & Broccoli w/ egg fried rice",
      difficulty: 4,
      cost: 3,
      excitement: 4,
      month: 6,
      meal: "dinner",
    },
    {
      recipeName: "Dumplings",
      difficulty: 4,
      cost: 2,
      excitement: 3,
      month: 6,
      meal: "dinner",
    },
    {
      recipeName: "Chicken, Broccoli, Cheesy Scalloped Potatoes",
      difficulty: 4,
      cost: 3,
      excitement: 4,
      month: 5,
      meal: "dinner",
    },
    {
      recipeName: "Chili con Carne & Loaded Baked Potatoes",
      difficulty: 3,
      cost: 3,
      excitement: 4,
      month: 5,
      meal: "dinner",
    },
    {
      recipeName: "Macaroni & Cheese w/ Sliced Hot Dog & Cous Cous Salad",
      difficulty: 1,
      cost: 3,
      excitement: 4,
      month: 6,
      meal: "dinner",
    },
    {
      recipeName: "Shepards Pie",
      difficulty: 3,
      cost: 3,
      excitement: 3,
      month: 6,
      meal: "dinner",
    },
    {
      recipeName:
        "Chicken Noodle Soup & Grilled Cheese & Bacon Sandwiches (disposable bowls)",
      difficulty: 1,
      cost: 2,
      excitement: 4,
      month: 5,
      meal: "dinner",
    },
    {
      recipeName: "BBQ Chicken Drumsticks/Thighs w/ corn on the cob & potato salad",
      difficulty: 3,
      cost: 3,
      excitement: 3,
      month: 7,
      meal: "dinner",
    },
    {
      recipeName: "Tacos",
      difficulty: 2,
      cost: 2,
      excitement: 3,
      month: 7,
      meal: "dinner",
    },
    {
      recipeName: "Burritos",
      difficulty: 3,
      cost: 3,
      excitement: 3,
      month: 6,
      meal: "dinner",
    },
    {
      recipeName: "Fajitas",
      difficulty: 3,
      cost: 4,
      excitement: 3,
      month: 6,
      meal: "dinner",
    },
    {
      recipeName: "Quesadillas & Mexican Salad",
      difficulty: 2,
      cost: 2,
      excitement: 3,
      month: 6,
      meal: "dinner",
    },
    {
      recipeName:
        "Murgh Saagwala (Chicken curry with tomato/onion base and leafy greens)",
      difficulty: 3,
      cost: 3,
      excitement: 3,
      month: 5,
      meal: "dinner",
    },
    {
      recipeName: "Chicken Souvlaki wraps",
      difficulty: 2,
      cost: 3,
      excitement: 3,
      month: 7,
      meal: "dinner",
    },
    {
      recipeName: "Tandoori Chicken w/ Curried Lentils & Roasted Vegetables",
      difficulty: 3,
      cost: 3,
      excitement: 3,
      month: 6,
      meal: "dinner",
    },
  ];

  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [recipes, setRecipes] = useState(originalRecipes);
  const tableRef = useRef(null);

  const accessDB = false;

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = ref(database, `users/${currentUser.uid}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          setRole(snapshot.val().role);
        }
      } else {
        setRole(null);
      }
    });

    const dataRef = ref(database, "/recipes");
    const unsubscribeData = onValue(
      dataRef,
      (snapshot) => {
        if (accessDB) { // should be if (snapshot.exists()) {
          const dataObject = snapshot.val();
          // Convert object to array
          const dataArray = Object.keys(dataObject).map((key) => ({
            id: key,
            ...dataObject[key],
          }));
          setRecipes(dataArray);
        } else {
          // alert("Connected to Firebase, but no data found.");
          console.log("Connected to Firebase, but no data found. UNLESS accessDB is false");
        }
      },
      (error) => {
        alert("Firebase connection error:" + error);
        console.error("Firebase connection error:", error);
      }
    );

    return () => {
      unsubscribeAuth();
      unsubscribeData();
    };
  }, []);

  // CSV generation helper functions
  const getWeather = (month) => {
    switch (month) {
      case 5:
        return "Cold";
      case 6:
        return "Anytime";
      case 7:
        return "Hot";
      default:
        return "Invalid month";
    }
  };

  const getNotes = (excitement) => {
    switch (excitement) {
      case 1:
        return "None";
      case 2:
        return "Some";
      case 3:
        return "";
      case 4:
        return "Of Note";
      case 5:
        return "All";
      default:
        return "Invalid month";
    }
  };

  // CSV download function in the parent component
  const handleDownloadCSV = () => {
    // Get sorted data from the child via ref
    const sortedData =
      (tableRef.current && tableRef.current.getSortedData()) || recipes;
    const headers = ["Recipe Name", "Difficulty", "Weather", "Notes"];
    const csvRows = [];
    csvRows.push(headers.join(","));

    sortedData.forEach((row) => {
      const rowData = [
        row.recipeName,
        row.difficulty,
        getWeather(row.month),
        getNotes(row.excitement),
      ];
      // Wrap fields in quotes and escape any quotes within
      const csvRow = rowData
        .map((field) => `"${String(field).replace(/"/g, '""')}"`)
        .join(",");
      csvRows.push(csvRow);
    });

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "table-data.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Print function remains in the parent
  const handlePrint = () => {
    window.print();
  };

  // Modify SortableTable to use forwardRef so the parent can access its sorted data
  const SortableTable = forwardRef(({ data }, ref) => {
    const [sortConfig, setSortConfig] = useState({
      key: "month",
      direction: "ascending",
    });

    const sortedData = useMemo(() => {
      const sortableData = [...recipes];
      if (sortConfig.key !== "") {
        sortableData.sort((a, b) => {
          let aValue = a[sortConfig.key];
          let bValue = b[sortConfig.key];

          if (sortConfig.key === "recipeName") {
            aValue = String(aValue).toLowerCase();
            bValue = String(bValue).toLowerCase();
            if (aValue < bValue)
              return sortConfig.direction === "ascending" ? -1 : 1;
            if (aValue > bValue)
              return sortConfig.direction === "ascending" ? 1 : -1;
            return 0;
          } else {
            return sortConfig.direction === "ascending"
              ? aValue - bValue
              : bValue - aValue;
          }
        });
      }
      return sortableData;
    }, [data, sortConfig]);

    const requestSort = (key) => {
      let direction = "ascending";
      if (sortConfig.key === key && sortConfig.direction === "ascending") {
        direction = "descending";
      }
      setSortConfig({ key, direction });
    };

    const getSortIndicator = (key) => {
      if (sortConfig.key === key) {
        return (
          <span style={{ display: "inline-block", minWidth: "20px" }}>
            {sortConfig.direction === "ascending" ? "▲" : "▼"}
          </span>
        );
      }
      return <div style={{ display: "inline-block", minWidth: "20px" }}> </div>;
    };

    // Expose sortedData to parent via ref
    useImperativeHandle(ref, () => ({
      getSortedData: () => sortedData,
    }));

    return (
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th
                style={{
                  cursor: "pointer",
                  borderBottom: "2px solid #ccc",
                  padding: "8px",
                  paddingLeft: "28px",
                }}
                onClick={() => requestSort("recipeName")}
              >
                Recipe Name{getSortIndicator("recipeName")}
              </th>
              <th
                style={{
                  cursor: "pointer",
                  borderBottom: "2px solid #ccc",
                  padding: "8px",
                  paddingLeft: "24px",
                }}
                onClick={() => requestSort("difficulty")}
              >
                Difficulty{getSortIndicator("difficulty")}
              </th>
              <th
                style={{
                  cursor: "pointer",
                  borderBottom: "2px solid #ccc",
                  padding: "8px",
                  paddingLeft: "24px",
                }}
                onClick={() => requestSort("month")}
              >
                Weather{getSortIndicator("month")}
              </th>
              <th
                style={{
                  cursor: "pointer",
                  borderBottom: "2px solid #ccc",
                  padding: "8px",
                  paddingLeft: "24px",
                }}
                onClick={() => requestSort("excitement")}
              >
                Notes{getSortIndicator("excitement")}
              </th>
            </tr>
          </thead>
          <tbody style={{ textAlign: "center" }}>
            {sortedData.map((row, index) => (
              <tr key={index} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "8px" }}>{row.recipeName}</td>
                <td style={{ padding: "8px" }}>{row.difficulty}</td>
                <td style={{ padding: "8px" }}>{getWeather(row.month)}</td>
                <td style={{ padding: "8px" }}>{getNotes(row.excitement)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  });

  return (
    <div>
      {/* Buttons placed side by side */}
      <div style={{ marginBottom: "16px" }}>
        <button onClick={handlePrint} style={{ marginRight: "8px" }}>
          Print Table
        </button>
        <button onClick={handleDownloadCSV} style={{ marginRight: "8px" }}>Download CSV</button>
        <button onClick={() => setIsRecipesListVisible(false)}>Close Recipe List</button>
      </div>

      {/* Wrap the table in a container with an id for printing */}
      <div id="printable">
        <SortableTable data={recipes} ref={tableRef} />
      </div>

      {/* Print-specific CSS */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable,
          #printable * {
            visibility: visible;
          }
          #printable {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default RecipeList;
