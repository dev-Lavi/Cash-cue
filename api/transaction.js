const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authenticate = require('../middleware/authenticate');

// Add a transaction
router.post('/add', authenticate, async (req, res) => {
    const { type, amount, description, date } = req.body;

    // Validate input
    if (!type || (type !== "Expense" && type !== "Income")) {
        return res.status(400).json({
            status: "FAILED",
            message: "Transaction type must be either 'Expense' or 'Income'.",
        });
    }

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
        return res.status(400).json({
            status: "FAILED",
            message: "Amount must be a positive number.",
        });
    }

    if (!description || typeof description !== "string") {
        return res.status(400).json({
            status: "FAILED",
            message: "Description is required and must be a string.",
        });
    }

    if (!date || isNaN(Date.parse(date))) {
        return res.status(400).json({
            status: "FAILED",
            message: "Invalid date format.",
        });
    }

    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                status: "FAILED",
                message: "User not found.",
            });
        }

        const newTransaction = {
            type,
            amount,
            description,
            date: new Date(date),
        };

        user.transactions.push(newTransaction); // Store transactions in the `transactions` field
        await user.save();

        res.status(201).json({
            status: "SUCCESS",
            message: "Transaction added successfully!",
            transaction: newTransaction,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: "FAILED",
            message: "An error occurred while adding the transaction.",
        });
    }
});

// Get all transactions for the authenticated user
router.get('/list', authenticate, async (req, res) => {
    try {
        // Find the authenticated user by their ID
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                status: "FAILED",
                message: "User not found.",
            });
        }

               // Format the date for each transaction in UTC
               const transactions = user.transactions.map(transaction => {
                const d = new Date(transaction.date);
                const year = d.getUTCFullYear(); // Use UTC methods
                const month = String(d.getUTCMonth() + 1).padStart(2, '0');
                const day = String(d.getUTCDate()).padStart(2, '0');
                const hours = String(d.getUTCHours()).padStart(2, '0');
                const minutes = String(d.getUTCMinutes()).padStart(2, '0');
    
                return {
                    ...transaction.toObject(),
                    date: `${year}-${month}-${day} ${hours}:${minutes} `, // Formatted date in UTC
                };
            });
    

        // Respond with formatted transactions
        res.json({
            status: "SUCCESS",
            transactions,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: "FAILED",
            message: "An error occurred while fetching transactions.",
        });
    }
});


// Edit an expense
router.put('/edit/:expenseId', authenticate, async (req, res) => {
    const { expenseId } = req.params;
    const { amount, description, date } = req.body;

    // Validate input
    if (amount && (isNaN(amount) || Number(amount) <= 0)) {
        return res.status(400).json({
            status: "FAILED",
            message: "Amount must be a positive number.",
        });
    }

    if (date && isNaN(Date.parse(date))) {
        return res.status(400).json({
            status: "FAILED",
            message: "Invalid date format.",
        });
    }

    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                status: "FAILED",
                message: "User not found.",
            });
        }

        // Find the expense to edit
        const expense = user.expenses.id(expenseId);
        if (!expense) {
            return res.status(404).json({
                status: "FAILED",
                message: "Expense not found.",
            });
        }

        // Update fields if provided
        if (amount) expense.amount = amount;
        if (description) expense.description = description;
        if (date) expense.date = new Date(date);

        await user.save();

        res.json({
            status: "SUCCESS",
            message: "Expense updated successfully!",
            expense,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: "FAILED",
            message: "An error occurred while editing the expense.",
        });
    }
});

// Delete an expense
router.delete('/delete/:expenseId', authenticate, async (req, res) => {
    const { expenseId } = req.params;

    try {
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $pull: { expenses: { _id: expenseId } } },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                status: "FAILED",
                message: "User not found.",
            });
        }

        res.json({
            status: "SUCCESS",
            message: "Expense deleted successfully.",
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: "FAILED",
            message: "An error occurred while deleting the expense.",
        });
    }
});


router.get('/graph1', authenticate, async (req, res) => {  
    try {
        // Find the authenticated user by their ID
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                status: "FAILED",
                message: "User not found.",
            });
        }

        // Get the current date and time in IST
        const now = new Date();
        const istOffset = 5 * 60 + 30; // IST offset in minutes
        const istMidnight = new Date(now.getTime() + (istOffset * 60 * 1000));
        istMidnight.setUTCHours(0, 0, 0, 0); // Set to 00:00 IST

        // Filter transactions that occurred after 00:00 IST today
        const todayTransactions = user.transactions.filter(transaction => {
            const transactionDate = new Date(transaction.date); // Parse transaction date
            return transactionDate >= istMidnight; // Compare with today's 00:00 IST timestamp
        });

        // Format transactions for the frontend
        const formattedTransactions = todayTransactions.map(transaction => {
            const transactionDate = new Date(transaction.date);
            const hours = String(transactionDate.getHours()).padStart(2, '0'); // IST hours
            const minutes = String(transactionDate.getMinutes()).padStart(2, '0'); // IST minutes

            return {
                type: transaction.type, // Include type (e.g., "Expense" or "Income")
                amount: transaction.amount, // Include the transaction amount
                time: `${hours}:${minutes}`, // Format time as HH:mm in IST
            };
        });

        // Respond with today's transactions
        res.status(200).json({
            status: "SUCCESS",
            message: "Today's transactions fetched successfully.",
            data: formattedTransactions,
        });
    } catch (error) {
        console.error('Error fetching transactions:', error.message);

        res.status(500).json({
            status: "FAILED",
            message: "An error occurred while fetching today's transactions.",
        });
    }
});





//get weekly data
router.get('/graph2', authenticate, async (req, res) => {
    try {
        console.log('Fetching user data...');

        // Fetch the user's transactions from the database
        const user = await User.findById(req.user.id);

        if (!user) {
            console.error('User not found.');
            return res.status(404).json({
                status: "FAILED",
                message: "User not found.",
            });
        }

        console.log('Processing transactions for the last 7 days...');

        // Get today's date and calculate the date 7 days ago
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 6); // Include today in the 7-day window

        // Initialize data structure to hold totals for the last 7 days
        const totals = {};

        // Populate the totals object with default values for each day
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(sevenDaysAgo.getDate() + i);
            const formattedDate = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
            totals[formattedDate] = { totalIncome: 0, totalExpense: 0 };
        }

        // Process transactions to calculate totals
        user.transactions.forEach((transaction) => {
            const transactionDate = new Date(transaction.date).toISOString().split('T')[0]; // Format as YYYY-MM-DD

            // Check if the transaction date is within the last 7 days
            if (totals[transactionDate]) {
                if (transaction.type === 'Income') {
                    totals[transactionDate].totalIncome += transaction.amount;
                } else if (transaction.type === 'Expense') {
                    totals[transactionDate].totalExpense += transaction.amount;
                }
            }
        });

        // Prepare the result as an array for easier graph plotting
        const result = Object.keys(totals).map((date) => ({
            date,
            totalIncome: totals[date].totalIncome,
            totalExpense: totals[date].totalExpense,
        }));

        console.log('Summary for the last 7 days:', result);

        // Respond with the calculated totals
        res.status(200).json({
            status: "SUCCESS",
            message: "Expense and income summary fetched successfully!",
            data: result,
        });
    } catch (error) {
        console.error('Error fetching summary:', error.message);

        // Handle errors gracefully
        res.status(500).json({
            status: "FAILED",
            message: "An error occurred while fetching the summary.",
        });
    }
});

//last month transaction
router.get('/graph3', authenticate, async (req, res) => {
    try {
        console.log('Fetching user data...');

        // Fetch the user's transactions from the database
        const user = await User.findById(req.user.id);

        if (!user) {
            console.error('User not found.');
            return res.status(404).json({
                status: "FAILED",
                message: "User not found.",
            });
        }

        console.log('Processing transactions for the last 4 weeks...');

        // Get today's date and calculate the start of the week (Sunday)
        const today = new Date();
        const currentDayOfWeek = today.getDay(); // 0 for Sunday, 1 for Monday, etc.
        const startOfWeek = new Date(today - currentDayOfWeek * 24 * 60 * 60 * 1000);

        // Define the start and end dates for the last 4 weeks
        const weeks = Array.from({ length: 4 }, (_, i) => {
            const end = new Date(startOfWeek - i * 7 * 24 * 60 * 60 * 1000);
            const start = new Date(end - 6 * 24 * 60 * 60 * 1000);
            return {
                weekLabel: `Week ${4 - i}`,
                start: start.toISOString().split('T')[0],
                end: end.toISOString().split('T')[0],
            };
        });

        // Initialize totals for each week
        const weeklyTotals = weeks.map((week) => ({
            weekLabel: week.weekLabel,
            totalIncome: 0,
            totalExpense: 0,
        }));

        // Process transactions and group by week
        user.transactions.forEach((transaction) => {
            const transactionDate = new Date(transaction.date);

            // Check which week this transaction belongs to
            for (let i = 0; i < weeks.length; i++) {
                const week = weeks[i];
                const startDate = new Date(week.start);
                const endDate = new Date(week.end);

                if (transactionDate >= startDate && transactionDate <= endDate) {
                    if (transaction.type === 'Income') {
                        weeklyTotals[i].totalIncome += transaction.amount;
                    } else if (transaction.type === 'Expense') {
                        weeklyTotals[i].totalExpense += transaction.amount;
                    }
                    break;
                }
            }
        });

        console.log('Summary for the last 4 weeks:', weeklyTotals);

        // Respond with the calculated weekly totals
        res.status(200).json({
            status: "SUCCESS",
            message: "Expense and income summary for the last 4 weeks fetched successfully!",
            data: weeklyTotals,
        });
    } catch (error) {
        console.error('Error fetching summary:', error.message);

        // Handle errors gracefully
        res.status(500).json({
            status: "FAILED",
            message: "An error occurred while fetching the summary.",
        });
    }
});


module.exports = router;