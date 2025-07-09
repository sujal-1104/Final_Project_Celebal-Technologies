import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Chat from './components/Chat';
import Auth from './components/Auth';
import ArchivedMessages from './components/ArchivedMessages';

function App() {
  const [user, setUser] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('username');
    if (stored) setUser(stored);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
  };

  const handleChat = () => {
    navigate('/');
  };

  const handleArchive = () => {
    navigate('/archived');
  };

  if (!user) {
    return <Auth onLogin={setUser} />;
  }

  return (
    <div style={{ padding: 10 }}>
      <nav
        style={{
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div>
          <button onClick={handleChat} style={{ marginLeft: 505 }}>Chat</button>
          <button onClick={handleArchive} style={{ marginLeft: 7}}>Archived</button>
        </div>
        <div>
          <span style={{ marginRight: 20 }}><strong>{user}</strong></span>
          <button onClick={handleLogout}style={{ marginRight: 505}}>Logout</button>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Chat username={user} />} />
        <Route path="/archived" element={<ArchivedMessages username={user} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}
