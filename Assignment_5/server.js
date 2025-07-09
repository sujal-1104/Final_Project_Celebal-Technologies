const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const userRoutes = require('./routes/userRoutes');

dotenv.config();
const app = express();

app.use(express.json());
app.use('/api/users', userRoutes);
app.get('/', (req, res) => {
  res.redirect('/api/users');
});

// Connect to MongoDB
mongoose.set('strictQuery', true);
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
  app.listen(process.env.PORT, () => {
    console.log(`Server running on http://localhost:${process.env.PORT}`);
  });
})
.catch((err) => console.error('MongoDB connection error:', err));
