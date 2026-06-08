import express from 'express';
import { createPool } from 'mysql2/promise';
import { genSalt, hash, compare } from 'bcrypt';
import path from 'path';
import { fileURLToPath } from 'url'; // 1. Added for ES Module path tracking
import cors from 'cors';
import jwt from 'jsonwebtoken';
import 'dotenv/config'; // Ensures process.env.JWT_SECRET can be read

const { verify, sign } = jwt;

// 2. Safely define __filename and __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(cors());
app.use(express.json()); // Replaced bodyParser.json() with native Express parser
app.use(express.urlencoded({ extended: true })); // Replaced bodyParser.urlencoded()

// Static files routing
app.use(express.static(__dirname)); 
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

// ==========================================
// DATABASE CONNECTION
// ==========================================
const pool = createPool({
    host: 'localhost',
    user: 'root',
    password: 'dvaraka2003#',
    database: 'chinmay',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ==========================================
// FRONTEND VIEWS ROUTES
// ==========================================
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

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'profile.html'));
});
// Authentication Middleware
// This protects routes that only logged-in users should access
const authenticateUser = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Access denied. No token provided." });

    verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid token." });
        req.user = user;
        next();
    });
};

// ==========================================
// 1. AUTHENTICATION ROUTES (Signup & Login)
// ==========================================

// Sign Up
app.post('/api/signup', async (req, res) => {
    const { username, email, password, phone_number, street_address, city, state, postal_code } = req.body;

    try {
        // Hash the password before saving to the database
        const salt = await genSalt(10);
        const password_hash = await hash(password, salt);

        const [result] = await pool.query(
            `INSERT INTO users (username, email, password_hash, phone_number, street_address, city, state, postal_code) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [username, email, password_hash, phone_number, street_address, city, state, postal_code]
        );

        res.status(201).json({ message: "User created successfully!", userId: result.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: "Username or Email already exists." });
        }
        res.status(500).json({ error: "Internal server error." });
    }
});

// Log In
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [users] = await pool.query(`SELECT * FROM users WHERE email = ?`, [email]);
        
        if (users.length === 0) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        const user = users[0];
        const validPassword = await compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        // Generate JWT Token
        const token = sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.json({ message: "Logged in successfully", token });
    } catch (error) {
        res.status(500).json({ error: "Internal server error." });
    }
});

// ==========================================
// 2. CATEGORIES & PROVIDERS
// ==========================================

// Get all active categories
app.get('/api/categories', async (req, res) => {
    try {
        const [categories] = await pool.query(`SELECT * FROM categories WHERE is_active = 1`);
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch categories." });
    }
});

// Get providers (with optional category filter)
app.get('/api/providers', async (req, res) => {
    const { category } = req.query;
    try {
        let query = `SELECT id, name, category, location, rating FROM providers`;
        let params = [];

        if (category) {
            query += ` WHERE category = ?`;
            params.push(category);
        }

        const [providers] = await pool.query(query, params);
        res.json(providers);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch providers." });
    }
});

// ==========================================
// 3. BOOKINGS
// ==========================================

// Create a new booking (Protected Route)
app.post('/api/bookings', authenticateUser, async (req, res) => {
    const { provider_id, service_id, scheduled_date, scheduled_time, service_address, pincode, total_amount } = req.body;
    const customer_id = req.user.id; // Extracted from JWT token

    try {
        const [result] = await pool.query(
            `INSERT INTO bookings 
            (customer_id, provider_id, service_id, scheduled_date, scheduled_time, service_address, pincode, total_amount, booking_status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [customer_id, provider_id || null, service_id, scheduled_date, scheduled_time, service_address, pincode, total_amount]
        );

        res.status(201).json({ message: "Booking created successfully!", bookingId: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to create booking." });
    }
});

// Get logged-in user's bookings (Protected Route)
app.get('/api/bookings/my-bookings', authenticateUser, async (req, res) => {
    const customer_id = req.user.id;

    try {
        const [bookings] = await pool.query(
            `SELECT b.*, p.name AS provider_name, c.name AS service_name 
             FROM bookings b
             LEFT JOIN providers p ON b.provider_id = p.id
             JOIN categories c ON b.service_id = c.id
             WHERE b.customer_id = ?
             ORDER BY b.scheduled_date DESC, b.scheduled_time DESC`,
            [customer_id]
        );

        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch bookings." });
    }
});

// Start the Server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
});