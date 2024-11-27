// Load environment variables from .env file
require('dotenv').config();

// Database connection
require('./config/db'); 

// Import necessary modules
const express = require('express');
const app = express();
const port = process.env.PORT || 3001;

// Import User Router
const UserRouter = require('./api/User');

// Middleware for parsing JSON request bodies
app.use(express.json());

// Set up routes
app.use('/user', UserRouter);

// Default route for health check or debugging
app.get('/', (req, res) => {
    res.send('Authentication Server is Running');
});

// Error handling middleware for unexpected errors
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        status: "FAILED",
        message: "An internal server error occurred"
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
