const express = require('express');
const router = express.Router();
const Group = require('../models/group');
const authenticate = require('../middleware/authenticate');

// Create a new group
router.post('/group', authenticate, async (req, res) => {
    try {
        const { title, description, members } = req.body;

        const newGroup = new Group({ title, description, members });
        await newGroup.save();

        res.status(201).json({
            status: "SUCCESS",
            message: "Group created successfully!",
            group: newGroup,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: "FAILED",
            message: "An error occurred while creating the group.",
        });
    }
});

module.exports = router;
