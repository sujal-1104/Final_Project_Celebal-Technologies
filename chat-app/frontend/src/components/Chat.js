import React, { useEffect, useState, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

const socket = io('http://localhost:5000');

const Chat = ({ username }) => {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [deletedMessages, setDeletedMessages] = useState([]);
  const [calling, setCalling] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [file, setFile] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [target, setTarget] = useState(null);

  const token = localStorage.getItem('token');

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const ringtoneRef = useRef(new Audio('/ringtone.mp3'));
  const callTimerRef = useRef(null);

  const cleanupCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
    clearInterval(callTimerRef.current);
    setCallDuration(0);
    setCalling(false);
    setIncomingCall(null);
    setTarget(null);
  };

  const handleHangUp = useCallback(() => {
    socket.emit('hangUp', { to: target });
    cleanupCall();
  }, [target]);

  useEffect(() => {
    if (username) socket.emit('register', username);

    const fetchChatHistory = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/messages/history', {
          headers: { Authorization: token },
        });
        setMessages(res.data);
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    };

    if (token) fetchChatHistory();

    socket.on('loadMessages', (msgs) => setMessages(msgs));
    socket.on('receiveMessage', (msg) => setMessages((prev) => [...prev, msg]));
    socket.on('messageUndone', ({ id }) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== id));
    });
    socket.on('messageDeleted', ({ id }) => {
      setDeletedMessages((prev) => [...prev, id]);
    });
    socket.on('receiveFile', ({ sender, fileName, fileData }) => {
      setMessages((prev) => [
        ...prev,
        { sender, message: `📁 File: `, fileName, fileData, isFile: true, time: new Date().toLocaleTimeString() },
      ]);
    });
    socket.on('messageSeen', ({ messageId, reader }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId ? { ...msg, seenBy: [...(msg.seenBy || []), reader] } : msg
        )
      );
    });

    socket.on('callUser', ({ offer, caller}) => {
      setIncomingCall({ offer, caller});
      setTarget(caller);
      if (ringtoneRef.current) {
        ringtoneRef.current.loop = true;
        ringtoneRef.current.play();
      }
    });

    socket.on('answerCall', async ({ answer }) => {
      if (peerRef.current) {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on('iceCandidate', async ({ candidate }) => {
      if (peerRef.current && candidate) {
        try {
          await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error adding ICE candidate', e);
        }
      }
    });

    socket.on('hangUp', cleanupCall);

    socket.on('callRejected', () => {
      alert('Your call was rejected.');
      cleanupCall();
    });

    return () => {
      socket.off('loadMessages');
      socket.off('receiveMessage');
      socket.off('messageUndone');
      socket.off('messageDeleted');
      socket.off('callUser');
      socket.off('receiveFile');
      socket.off('answerCall');
      socket.off('iceCandidate');
      socket.off('hangUp');
      socket.off('callRejected');
    };
  }, [token, username]);

  useEffect(() => {
    messages.forEach((msg) => {
      if (msg.sender !== username && !msg.seenBy?.includes(username)) {
        socket.emit('markAsRead', { messageId: msg._id, reader: username });
      }
    });
  }, [messages, username]);
  
  const handleSend = () => {
    if (username && message.trim()) {
      socket.emit('sendMessage', { sender: username, message });
      setMessage('');
    }
  };

  const handleUndo = (id) => socket.emit('undoMessage', { id });
  const handleDelete = (id) => socket.emit('deleteMessage', { id });

  const handleArchive = async (id) => {
    try {
      await axios.put(`http://localhost:5000/api/messages/archive/${id}`, {}, {
        headers: { Authorization: token },
      });
      setMessages((prev) => prev.filter((msg) => msg._id !== id));
    } catch (err) {
      console.error('Archive error:', err);
    }
  };

  const handleFileSend = () => {
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        socket.emit('sendFile', {
          sender: username,
          fileName: file.name,
          fileData: reader.result,
        });
        setFile(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('iceCandidate', { candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    return pc;
  };
  
  const startVoiceCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true});
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      peerRef.current = pc;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('callUser', { offer, caller: username });
      setCalling(true);
    } catch (err) {
      console.error('Voice call error:', err);
    }
    callTimerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
  };

  const startVideoCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      peerRef.current = pc;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('callUser', { offer, caller: username });
      setCalling(true);
    } catch (err) {
      console.error('Video call error:', err);
    }
    callTimerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
  };

  const acceptCall = async () => {
  if (ringtoneRef.current) {
    ringtoneRef.current.pause();
    ringtoneRef.current.currentTime = 0;
  }

  const hasVideo = incomingCall.offer.sdp.includes('m=video');

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: hasVideo,
  });

  localStreamRef.current = stream;
  if (localVideoRef.current) localVideoRef.current.srcObject = stream;

  const pc = createPeerConnection();
  stream.getTracks().forEach((track) => pc.addTrack(track, stream));
  peerRef.current = pc;

  await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  socket.emit('answerCall', { answer });
  setCalling(true);
  setIncomingCall(null);
  callTimerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
  };

  const rejectCall = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
    socket.emit('callRejected');
    setIncomingCall(null);
  };

  return (
    <div className="chat-container">
      <h2>Yappy!</h2>

      <input
        type="text"
        placeholder="🔍 Search messages"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        />

      <div className="chat-messages">

        <ul>
          {messages
            .filter((msg) =>
              !msg.archived &&
              msg.message.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map((msg, i) => (
              <li key={i}>
                <strong>{msg.sender}</strong> ({msg.time}):{" "}
                {msg.isFile ? (
                  <a href={msg.fileData} download={msg.fileName}>{msg.fileName}</a>
                ) : deletedMessages.includes(msg._id) ? (
                  <i>message deleted</i>
                ) : (
                  msg.message
                )}

                {msg.sender === username && !deletedMessages.includes(msg._id) && !msg.isFile && (
                  <>
                    {' '}
                    <span style={{ fontSize: '12px', color: 'gray' }}>
                      {msg.seenBy?.length > 0 ? '✔️✔️' : '✔️'}
                    </span>{' '}
                      <button onClick={() => handleUndo(msg._id)}>Undo</button>
                      <button onClick={() => handleDelete(msg._id)}>Delete</button>
                      <button onClick={() => handleArchive(msg._id)}>Archive</button>
                    </>
                  )}
              </li>
            ))}
        </ul>
      </div>

  <div className="chat-controls">
  <input
    type="text"
    placeholder="Type your message"
    value={message}
    onChange={(e) => setMessage(e.target.value)}
  />
  <button onClick={handleSend}>Send</button>

  <input type="file" onChange={(e) => setFile(e.target.files[0])} />
  <button onClick={handleFileSend}>Send File</button>
  </div>


      <div className="chat-controls">
  <button onClick={startVoiceCall}> Voice Call</button>
  <button onClick={startVideoCall}> Video Call</button>
</div>


      <div className="chat-video-section">
  <p>🕒 Call Duration: {Math.floor(callDuration / 60)}:{('0' + (callDuration % 60)).slice(-2)}</p>
  <div>
    <p>Me</p>
    <video ref={localVideoRef} autoPlay playsInline muted width="150" />
  </div>
  <div>
    <p>Friend</p>
    <video ref={remoteVideoRef} autoPlay playsInline width="150" />
  </div>
</div>


      {calling && (
  <div className="chat-controls">
    <button onClick={handleHangUp}>☎️ Hang Up</button>
  </div>
)}


      {incomingCall && (
        <div className="incoming-call">
          <p>📞 Incoming call from <strong>{incomingCall.caller}</strong></p>
          <button onClick={acceptCall}>Accept</button>
          <button onClick={rejectCall}>Reject</button>
        </div>
      )}
    </div>
  );
};

export default Chat;
