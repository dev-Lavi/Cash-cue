// Load environment variables 
require('dotenv').config();
require('./config/passport');

const express = require('express');
const cors = require('cors'); // Import CORS
const session = require('express-session');
const passport = require('passport'); // Import Passport
const ExpenseRouter = require('./api/expense');

// Database connection
require('./config/db'); 

// Import necessary modules
const app = express();
const port = process.env.PORT || 3001;

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests from the web frontend or no origin (for Flutter or server-side clients)
        if (!origin || origin === 'http://localhost:5173') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));

app.use(cors({}));

// Set up session middleware to handle OAuth session data
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'default_secret', // Set a session secret
        resave: false,
        saveUninitialized: false,
    })
);

// Initialize Passport and session
app.use(passport.initialize());
app.use(passport.session());

// Import User Router
const UserRouter = require('./api/User');
console.log('User routes loaded');

// Middleware for parsing JSON request bodies
app.use(express.json());

// Serve static files from the uploads directory
app.use('/uploads', express.static('uploads'));

// Set up routes
app.use('/user', UserRouter);
app.use('/expense', ExpenseRouter); // Expense routes

// Default route for health check or debugging
app.get('/', (req, res) => {
    res.send('Authentication Server is Running');
});

// Error handling middleware for unexpected errors


// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
