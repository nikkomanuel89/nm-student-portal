require('dotenv').config();
const express = require('express');
const cors = require('cors');
const methodOverride = require('method-override');

const app = express();

// MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static('public'));

// FIXED & WORKING ROUTES
app.use('/api/users', require('./routes/users'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/submissions', require('./routes/submissions'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/chat', require('./routes/chat'));

// Test route
app.get('/', (req, res) => {
  res.json({
    message: "NM Student Portal Backend - WORKING",
    status: "Connected",
    endpoints: [
      "/api/users",
      "/api/users?role=student",
      "/api/users?role=instructor",
      "/api/courses",
      "/api/assignments",
      "/api/announcements"
    ]
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});