const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the Group schema
const GroupSchema = new mongoose.Schema({
    title: { type: String, required: true }, // Group title
    description: { type: String, required: true }, // Group description
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // List of user IDs
    transactions: [
        {
            amount: { type: Number, required: true },
            date: { type: Date, default: Date.now },
            splitType: { type: String, enum: ['equally', 'unequally', 'percentage'], required: true },
            initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // User initiating the transaction
            splitDetails: [
                {
                    member: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Member ID
                    share: { type: Number }, // Share of the transaction amount
                }
            ],
        }
    ],
}, { timestamps: true });

const Group = mongoose.model('Group', GroupSchema);

module.exports = Group;
