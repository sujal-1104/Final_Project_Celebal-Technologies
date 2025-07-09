import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ArchivedMessages = () => {
  const [archived, setArchived] = useState([]);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchArchived = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/messages/archived', {
          headers: { Authorization: token }
        });
        setArchived(res.data);
      } catch (err) {
        console.error('Error loading archived messages', err);
      }
    };

    fetchArchived();
  }, [token]);

  const handleUnarchive = async (id) => {
    try {
      await axios.put(`http://localhost:5000/api/messages/unarchive/${id}`, {}, {
        headers: { Authorization: token }
      });
      setArchived((prev) => prev.filter((msg) => msg._id !== id));
    } catch (err) {
      console.error('Unarchive failed:', err);
    }
  };

  return (
    <div className="chat-container">
      <h2>Archived Messages</h2>
      {archived.length === 0 ? (
        <p>No archived messages.</p>
      ) : (
        <ul>
          {archived.map((msg) => (
            <li key={msg._id} style={{ marginBottom: 10 }}>
              <strong>{msg.sender}</strong> ({msg.time}): {msg.message}
              <button
                style={{ marginLeft: 10 }}
                onClick={() => handleUnarchive(msg._id)}
              >
                Unarchive
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ArchivedMessages;
