// Load environment variables from .env file
require('dotenv').config();

const cors = require('cors'); // Import CORS

// Database connection
require('./config/db'); 

// Import necessary modules
const express = require('express');
const app = express();
const port = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173', credentials: true,
}));

// Import User Router
const UserRouter = require('./api/User');

// Middleware for parsing JSON request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up routes
app.use('/user', UserRouter);

// Default route for health check or debugging
app.get('/', (req, res) => {
    res.send('Authentication Server is Running');
});

// Error handling middleware for unexpected errors


// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
