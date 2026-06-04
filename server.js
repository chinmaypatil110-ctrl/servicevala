import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import db from './db/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname))); 

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const FRONTEND_DIR = path.join(__dirname, '..');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));
app.use(cors());

// example route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});
app.get('/categories', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'categories.html'));
});
app.get('/booking', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'booking.html'));
});

app.get('/costomer-regi', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'customer-register.html'));
});

app.get('/providers', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'providers.html'));
});

// app.get('/sing', (req, res) => {
//   res.sendFile(path.join(__dirname, 'views', 'sing-in.html'));
// });

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'profile.html'));
});

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ providers: [], comments: [], bookings: [] }, null, 2));
  }
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getNextId(items) {
  return items.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;
}

app.get('/api/providers', (req, res) => {
  const data = readData();
  res.json(data.providers);
});

app.get('/api/providers/:id', (req, res) => {
  const data = readData();
  const provider = data.providers.find(p => p.id === Number(req.params.id));
  if (!provider) {
    return res.status(404).json({ error: 'Provider not found' });
  }
  res.json(provider);
});

app.post('/api/providers', (req, res) => {
  const data = readData();
  const provider = {
    id: getNextId(data.providers),
    name: req.body.name || '',
    category: req.body.category || '',
    location: req.body.location || '',
    rating: req.body.rating || 0,
    hourlyRate: req.body.hourlyRate || 0,
    experience: req.body.experience || 0,
    description: req.body.description || '',
    certifications: req.body.certifications || ''
  };

  if (!provider.name || !provider.category || !provider.location) {
    return res.status(400).json({ error: 'Name, category, and location are required' });
  }

  data.providers.push(provider);
  writeData(data);
  res.status(201).json(provider);
});

app.get('/api/comments', (req, res) => {
  const data = readData();
  res.json(data.comments);
});

app.post('/api/comments', (req, res) => {
  const data = readData();
  const comment = {
    id: getNextId(data.comments),
    name: req.body.name || 'Anonymous',
    message: req.body.message || '',
    reply: req.body.reply || ''
  };

  if (!comment.message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  data.comments.unshift(comment);
  writeData(data);
  res.status(201).json(comment);
});

app.get('/api/bookings', (req, res) => {
  const data = readData();
  res.json(data.bookings);
});

app.post('/api/bookings', (req, res) => {
  const data = readData();
  const booking = {
    id: getNextId(data.bookings),
    providerId: req.body.providerId || null,
    name: req.body.name || '',
    phone: req.body.phone || '',
    date: req.body.date || '',
    time: req.body.time || '',
    location: req.body.location || ''
  };

  if (!booking.providerId || !booking.name || !booking.phone || !booking.date || !booking.time || !booking.location) {
    return res.status(400).json({ error: 'All booking fields are required' });
  }

  data.bookings.push(booking);
  writeData(data);
  res.status(201).json(booking);
});

app.get('/api/status', (req, res) => {
  res.json({ status: 'OK', service: 'servicवाला backend' });
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(FRONTEND_DIR, '/'));
});

app.listen(PORT, () => {
  console.log(`servicवाला backend server running on http://localhost:${PORT}`);
});
