import { useState, useMemo } from 'react';

const SortableTable = ({ data }) => {
  // sortConfig holds the key and direction for sorting
  const [sortConfig, setSortConfig] = useState({
    key: '',
    direction: 'ascending',
  });

  // Memoized sorted data so we only re-sort when data or sortConfig changes
  const sortedData = useMemo(() => {
    const sortableData = [...data];
    if (sortConfig.key !== '') {
      sortableData.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // For Recipe Name, do alphabetical (case-insensitive) sorting
        if (sortConfig.key === 'recipeName') {
          aValue = String(aValue).toLowerCase();
          bValue = String(bValue).toLowerCase();
          if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
          if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
          return 0;
        } else {
          // For numeric fields (difficulty, cost, excitement, month)
          return sortConfig.direction === 'ascending'
            ? aValue - bValue
            : bValue - aValue;
        }
      });
    }
    return sortableData;
  }, [data, sortConfig]);

  // Toggles sorting for a column
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Helper to render an arrow for the sorted column
  const getSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    }
    return '';
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th
              style={{ cursor: 'pointer', borderBottom: '2px solid #ccc', padding: '8px' }}
              onClick={() => requestSort('recipeName')}
            >
              Recipe Name{getSortIndicator('recipeName')}
            </th>
            <th
              style={{ cursor: 'pointer', borderBottom: '2px solid #ccc', padding: '8px' }}
              onClick={() => requestSort('difficulty')}
            >
              Difficulty{getSortIndicator('difficulty')}
            </th>
            <th
              style={{ cursor: 'pointer', borderBottom: '2px solid #ccc', padding: '8px' }}
              onClick={() => requestSort('cost')}
            >
              Cost{getSortIndicator('cost')}
            </th>
            <th
              style={{ cursor: 'pointer', borderBottom: '2px solid #ccc', padding: '8px' }}
              onClick={() => requestSort('excitement')}
            >
              Excitement{getSortIndicator('excitement')}
            </th>
            <th
              style={{ cursor: 'pointer', borderBottom: '2px solid #ccc', padding: '8px' }}
              onClick={() => requestSort('month')}
            >
              Month{getSortIndicator('month')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, index) => (
            <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '8px' }}>{row.recipeName}</td>
              <td style={{ padding: '8px' }}>{row.difficulty}</td>
              <td style={{ padding: '8px' }}>{row.cost}</td>
              <td style={{ padding: '8px' }}>{row.excitement}</td>
              <td style={{ padding: '8px' }}>{row.month}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SortableTable;
