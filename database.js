const mongoose = require('mongoose');
const dns = require('dns');
// Use external DNS specifically to fix 'querySrv ECONNREFUSED' errors on local connections
dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoURI = process.env.MONGO_URI;

if (!mongoURI) {
    console.warn("WARNING: MONGO_URI not found in .env! Database connection will fail unless provided.");
}

mongoose.connect(mongoURI || 'mongodb://localhost:27017/FallbackDB', {
    serverSelectionTimeoutMS: 3000, // Reduced from 30s to 3s to prevent hangs
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
