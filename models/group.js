const mongoose = require('mongoose'); 
const Schema = mongoose.Schema;

// Define the Group schema
const GroupSchema = new mongoose.Schema(
    {
        title: { type: String, required: true }, // Group title
        description: { type: String, required: true }, // Group description
        members: [
            {
                userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Member's user ID
                email: { type: String, required: true }, // Member's email address
                role: { type: String, enum: ['admin', 'member'], default: 'member' }, // Role in the group
            },
        ],
        transactions: [
            {
                description: { type: String, required: true }, // Transaction description
                amount: { type: Number, required: true }, // Transaction amount
                date: { type: Date, default: Date.now }, // Date of the transaction
                splitType: { type: String, enum: ['equally', 'unequally', 'percentage'], required: true }, // Split type
                initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Initiator
                status: { type: String, enum: ['pending', 'completed'], default: 'pending' }, // Transaction status
                splitDetails: [
                    {
                        member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Member ID
                        share: { type: Number, required: true }, // Share of the transaction amount
                        paid: { type: Boolean, default: false }, // Whether the member has paid their share
                    },
                ],x
            },
        ],
    },
    { timestamps: true } // Automatically add `createdAt` and `updatedAt` timestamps
);

// Middleware to handle splitting amount equally when transaction is created
GroupSchema.pre('save', function (next) {
    // For each transaction, calculate the equal split among members except for the initiator
    this.transactions.forEach((transaction) => {
        if (transaction.splitType === 'equally') {
            const nonInitiatorMembers = this.members.filter(member => member.userId.toString() !== transaction.initiatedBy.toString());

            // Calculate equal share for each non-initiating member
            const equalShare = transaction.amount / nonInitiatorMembers.length;

            // Add split details for each non-initiating member
            transaction.splitDetails = nonInitiatorMembers.map(member => ({
                member: member.userId,
                share: equalShare,
                paid: false, // Initially, no one has paid
            }));
        }
    });

    next();
});

// Create and export the Group model
const Group = mongoose.model('Group', GroupSchema);
module.exports = Group;
