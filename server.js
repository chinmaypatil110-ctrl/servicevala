import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import multer from 'multer';
import { fileURLToPath } from 'url';
import db from './db/connection.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;
const VIEWS_DIR = path.join(__dirname, 'views');

const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const timestamp = Date.now();
      const safeName = file.originalname.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_.]/g, '');
      cb(null, `${timestamp}-${safeName}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'photo_file' && file.mimetype.startsWith('image/')) {
      return cb(null, true);
    }
    if (file.fieldname === 'video_file' && file.mimetype.startsWith('video/')) {
      return cb(null, true);
    }
    cb(null, false);
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

app.get('/', (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, 'index.html'));
});
app.get('/categories', (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, 'categories.html'));
});
app.get('/booking', (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, 'booking.html'));
});
app.get('/costomer-regi', (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, 'customer-register.html'));
});
app.get('/providers', (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, 'providers.html'));
});
app.get('/login', (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, 'login.html'));
});
app.get('/profile', (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, 'profile-register.html'));
});

async function ensureBookingsTable() {
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS bookings (
      id INT NOT NULL AUTO_INCREMENT,
      provider_id INT NOT NULL,
      customer_name VARCHAR(100) NOT NULL,
      customer_phone VARCHAR(20) NOT NULL,
      booking_date DATE NOT NULL,
      booking_time TIME NOT NULL,
      location VARCHAR(255) NOT NULL,
      description TEXT,
      photo_url VARCHAR(1024),
      video_url VARCHAR(1024),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  await db.execute(createTableSql);
}

ensureBookingsTable().catch(error => {
  console.error('Error creating bookings table:', error);
});

app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, name, image_url, is_active FROM categories WHERE is_active = 1 ORDER BY name'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error loading categories:', error);
    res.status(500).json({ error: 'Unable to load categories' });
  }
});

app.get('/api/providers', async (req, res) => {
  try {
    const { category, location } = req.query;
    let query = 'SELECT id, name, category, location, IFNULL(rating, 0) AS rating, phone_number FROM providers';
    const filters = [];
    const values = [];

    if (category) {
      filters.push('category = ?');
      values.push(category);
    }
    if (location) {
      filters.push('LOWER(location) LIKE ?');
      values.push(`%${location.toLowerCase()}%`);
    }
    if (filters.length) {
      query += ` WHERE ${filters.join(' AND ')}`;
    }
    query += ' ORDER BY name';

    const [rows] = await db.execute(query, values);
    res.json(rows);
  } catch (error) {
    console.error('Error loading providers:', error);
    res.status(500).json({ error: 'Unable to load providers' });
  }
});

app.get('/api/providers/:id', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, name, category, location, IFNULL(rating, 0) AS rating, phone_number FROM providers WHERE id = ?',
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Provider not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error loading provider:', error);
    res.status(500).json({ error: 'Unable to load provider' });
  }
});

app.post('/api/providers', async (req, res) => {
  try {
    const { name, category, location, phone_number } = req.body;
    if (!name || !category || !location) {
      return res.status(400).json({ error: 'Name, category, and location are required' });
    }

    const [maxRows] = await db.execute('SELECT MAX(id) AS maxId FROM providers');
    const nextId = (maxRows[0]?.maxId || 0) + 1;

    await db.execute(
      'INSERT INTO providers (id, name, category, location, rating, phone_number) VALUES (?, ?, ?, ?, ?, ?)',
      [nextId, name, category, location, 0, phone_number || null]
    );

    const [rows] = await db.execute(
      'SELECT id, name, category, location, IFNULL(rating, 0) AS rating, phone_number FROM providers WHERE id = ?',
      [nextId]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error adding provider:', error);
    res.status(500).json({ error: 'Unable to save provider' });
  }
});

app.post('/api/bookings', upload.fields([
  { name: 'photo_file', maxCount: 1 },
  { name: 'video_file', maxCount: 1 }
]), async (req, res) => {
  try {
    const { providerId, name, phone, date, time, location, description } = req.body;
    if (!providerId || !date || !time || !location) {
      return res.status(400).json({ error: 'Provider, date, time, and location are required' });
    }

    const customerName = name || 'Guest';
    const customerPhone = phone || 'N/A';
    const photoFile = req.files?.photo_file?.[0];
    const videoFile = req.files?.video_file?.[0];
    const photoUrl = photoFile ? `/public/uploads/${photoFile.filename}` : null;
    const videoUrl = videoFile ? `/public/uploads/${videoFile.filename}` : null;

    const [result] = await db.execute(
      `INSERT INTO bookings (provider_id, customer_name, customer_phone, booking_date, booking_time, location, description, photo_url, video_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [providerId, customerName, customerPhone, date, time, location, description || null, photoUrl, videoUrl]
    );

    res.status(201).json({
      id: result.insertId,
      providerId,
      name: customerName,
      phone: customerPhone,
      date,
      time,
      location,
      description: description || '',
      photo_url: photoUrl,
      video_url: videoUrl
    });
  } catch (error) {
    console.error('Error saving booking:', error);
    res.status(500).json({ error: 'Unable to save booking' });
  }
});

app.get('/api/status', (req, res) => {
  res.json({ status: 'OK', service: 'servicवाला backend' });
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(VIEWS_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`servicवाला backend server running on http://localhost:${PORT}`);
});
