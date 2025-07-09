const express = require('express');
const app = express();
const port = 3000;

let name="sujal"
let password=12345

// ---------- MIDDLEWARE ----------
// Built-in middleware to parse JSON request bodies
app.use(middleware);
app.use(express.json());

// Custom middleware to log requests
function middleware(req, res, next) {
  if(name=="sujal" && password==12345)
  next();
else
    res.send("cannot authenticate user")
};

// ---------- ROUTES ----------

// GET /
app.get('/', (req, res) => {
  res.send('Welcome to the Home Page!');
});

// GET /about
app.get('/about', (req, res) => {
  res.send('This is the About Page!');
});

// GET /contact
app.get('/contact', (req, res) => {
  res.send('Contact us at celebal@example.com');
});

// POST /submit
app.post('/submit', (req, res) => {
  const { name, message } = req.body;
  if (!name || !message) {
    return res.status(400).json({ error: 'Missing name or message' });
  }
  res.json({ success: true, name, message });
});

// ---------- START SERVER ----------
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
