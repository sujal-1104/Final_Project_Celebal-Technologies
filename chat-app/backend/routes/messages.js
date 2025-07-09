const express = require('express');
const Message = require('../models/Message');
const verifyToken = require('../middleware/auth');

const router = express.Router();

// DELETE a message
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.id); // Permanently delete from DB
    res.json({ message: 'Message deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UNDO a message (soft delete)
router.put('/undo/:id', verifyToken, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Not found' });

    msg.archived = true; // Hide from UI, keep in DB
    await msg.save();

    res.json({ message: 'Message archived (undo)' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ARCHIVE a message
router.put('/archive/:id', verifyToken, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Not found' });
    msg.archived = true;
    await msg.save();
    res.json({ message: 'Message archived' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get archived messages
router.get('/archived', verifyToken, async (req, res) => {
  try {
    const archived = await Message.find({ archived: true });
    res.json(archived);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load archived messages' });
  }
});
// Unarchive message
router.put('/unarchive/:id', verifyToken, async (req, res) => {
  try {
    const updated = await Message.findByIdAndUpdate(
      req.params.id,
      { archived: false },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to unarchive message' });
  }
});
// GET /api/messages/history
router.get('/history', verifyToken, async (req, res) => {
  const messages = await Message.find({}).sort({ createdAt: 1 });
  res.json(messages);
});


module.exports = router;