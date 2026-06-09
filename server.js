import express from 'express';
import { createPool } from 'mysql2/promise';
import { genSalt, hash, compare } from 'bcrypt';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

const { verify, sign } = jwt;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ==========================================
// MIDDLEWARE & STATIC ASSETS
// ==========================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve all assets inside the public folder directly from the root route
app.use(express.static(path.join(__dirname, 'public')));

// Fallback safety to check if users or scripts request /public paths directly
app.use('/public', express.static(path.join(__dirname, 'public')));

// Fallback for node_modules configurations if required by client elements
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

// JWT Secret Key Handling configuration
const JWT_SECRET = process.env.JWT_SECRET || 'service_wala_super_secret_session_token_key';

const pool = createPool({
    host: 'localhost',
    user: 'root',
    port: 3306,
    password: 'dvaraka2003', 
    database: 'chinmay',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function testConnection() {
    try {
        const [rows] = await pool.query('SELECT 1 + 1 AS result');
        console.log('✅ Database pool connection successful!');
    } catch (error) {
        console.error('❌ Database pool connection failed:');
        console.error(error.message);
    }
    // CRITICAL FIX: Removed pool.end() from here so the app can reuse connections!
}
testConnection();

// ==========================================
// FRONTEND VIEWS ROUTING
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

// Authentication Validation Protection Interceptor Middleware
const authenticateUser = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Access denied. Login required." });

    verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Session expired. Please log in again." });
        req.user = user;
        next();
    });
};

// ==========================================
// API ENDPOINTS
// ==========================================

// Add a Provider
app.post('/api/providers', async (req, res) => {
    const { name, category, location, phone_number, rating } = req.body;

    try {
        // Find the maximum ID to manual increment if table relies on direct assignment
        const [maxIdRow] = await pool.query('SELECT MAX(id) as maxId FROM providers');
        const nextId = (maxIdRow[0].maxId || 0) + 1;

        const [result] = await pool.query(
            `INSERT INTO providers (id, name, category, location, rating, phone_number) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [nextId, name, category, location, rating || 5.0, phone_number]
        );

        res.status(201).json({ message: "Provider profile registered successfully!", providerId: nextId });
    } catch (error) {
        console.error("Error adding provider:", error);
        res.status(500).json({ error: "Failed to create provider record." });
    }
});

// Customer Registration / Sign Up
app.post('/api/register', async (req, res) => {
    const { username, email, password, phone_number, street_address, city, state, postal_code } = req.body;
    try {
        const salt = await genSalt(10);
        const password_hash = await hash(password, salt);

        const [result] = await pool.query(
            `INSERT INTO users (username, email, password_hash, street_address, city, state, postal_code, phone_number) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [username, email, password_hash, street_address || null, city || null, state || null, postal_code || null, phone_number]
        );

        res.status(201).json({ message: "Customer registered successfully!", userId: result.insertId });
    } catch (error) {
        console.error("Error during customer signup:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: "Username or Email already exists." });
        }
        res.status(500).json({ error: "Internal registration error." });
    }
});

// Login Execution Pipeline
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [users] = await pool.query(`SELECT * FROM users WHERE email = ?`, [email]);
        
        if (users.length === 0) {
            return res.status(41) && res.status(401).json({ error: "Invalid email or password parameters." });
        }

        const user = users[0];
        const validPassword = await compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: "Invalid email or password parameters." });
        }

        const token = sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ message: "Logged in successfully", token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error execution." });
    }
});

// Categories Retrieval Pipeline
app.get('/api/categories', async (req, res) => {
    try {
        const [categories] = await pool.query(`SELECT * FROM categories WHERE is_active = 1`);
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch active category listings." });
    }
});

// Providers Dynamic Filter Queries
app.get('/api/providers', async (req, res) => {
    const { category, location } = req.query;
    try {
        let query = `SELECT id, name, category, location, rating, phone_number FROM providers WHERE 1=1`;
        let params = [];

        if (category) {
            query += ` AND category = ?`;
            params.push(category);
        }
        if (location) {
            query += ` AND location LIKE ?`;
            params.push(`%${location}%`);
        }

        const [providers] = await pool.query(query, params);
        res.json(providers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch providers." });
    }
});

// Create a Booking Record
app.post('/api/bookings', authenticateUser, async (req, res) => {
    const { provider_id, service_id, scheduled_date, scheduled_time, service_address, pincode, total_amount } = req.body;
    const customer_id = req.user.id;

    try {
        const [result] = await pool.query(
            `INSERT INTO bookings 
            (customer_id, provider_id, service_id, scheduled_date, scheduled_time, service_address, pincode, total_amount, booking_status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [customer_id, provider_id || null, service_id, scheduled_date, scheduled_time, service_address, pincode, total_amount || 0.00]
        );

        res.status(201).json({ message: "Booking saved into sequence!", bookingId: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Booking execution failed." });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 ServiceWala server running on http://localhost:${PORT}`);
});