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

router.post('/groups/:groupId/transactions', authenticate, async (req, res) => {
    try {
        const { groupId } = req.params;
        const { amount, splitType, splitDetails } = req.body; // splitDetails provided for unequally and percentage splits
        const userId = req.user.id;

        // Find the group
        const group = await Group.findById(groupId).populate('members');
        if (!group) {
            return res.status(404).json({
                status: "FAILED",
                message: "Group not found.",
            });
        }

        let calculatedSplitDetails;

        if (splitType === 'equally') {
            const splitAmount = amount / group.members.length;
            calculatedSplitDetails = group.members.map(member => ({
                member: member._id,
                share: splitAmount,
            }));
        } else if (splitType === 'unequally') {
            calculatedSplitDetails = splitDetails; // Ensure splitDetails contain member ID and their respective share
        } else if (splitType === 'percentage') {
            calculatedSplitDetails = splitDetails.map(detail => ({
                member: detail.member,
                share: (detail.percentage / 100) * amount,
            }));
        } else {
            return res.status(400).json({
                status: "FAILED",
                message: "Invalid split type.",
            });
        }

        // Add the transaction
        const newTransaction = {
            amount,
            splitType,
            initiatedBy: userId,
            splitDetails: calculatedSplitDetails,
        };
        group.transactions.push(newTransaction);
        await group.save();

        res.status(201).json({
            status: "SUCCESS",
            message: "Transaction added successfully!",
            group,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: "FAILED",
            message: "An error occurred while adding the transaction.",
        });
    }
});
 

router.get('/groups/:groupId', authenticate, async (req, res) => {
    try {
        const { groupId } = req.params;

        const group = await Group.findById(groupId)
            .populate('members', 'name email') // Populate members
            .populate('transactions.initiatedBy', 'name email') // Populate initiators
            .populate('transactions.splitDetails.member', 'name email'); // Populate split details

        if (!group) {
            return res.status(404).json({
                status: "FAILED",
                message: "Group not found.",
            });
        }

        res.status(200).json({
            status: "SUCCESS",
            group,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: "FAILED",
            message: "An error occurred while fetching the group details.",
        });
    }
});


module.exports = router;
