const mongoose = require('mongoose');

const mongoURI = process.env.MONGO_URI;

if (!mongoURI) {
    console.warn("WARNING: MONGO_URI not found in .env! Database connection will fail unless provided.");
}

mongoose.connect(mongoURI || 'mongodb://localhost:27017/FallbackDB', {
    // Mongoose 6+ options are default, but safely connects anyway
}).then(() => {
    console.log('Connected to MongoDB.');
}).catch((err) => {
    console.error('Error connecting to MongoDB:', err.message);
    console.error('Please ensure MONGO_URI is set in your .env file.');
});

// Define Enquiry Schema
const enquirySchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    date: { type: String },
    eventType: { type: String },
    message: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const Enquiry = mongoose.model('Enquiry', enquirySchema);

module.exports = { Enquiry };
