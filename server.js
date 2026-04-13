require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const { Enquiry } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configure Nodemailer transporter
let transporter;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
} else {
    console.warn("WARNING: EMAIL_USER or EMAIL_PASS not set in .env! Emails will be logged to console instead of actually sending.");
}

app.post('/api/enquire', async (req, res) => {
    const { name, email, date, eventType, message } = req.body;
    
    if (!name || !email) {
        return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    try {
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 1 && mongoose.connection.readyState !== 2) {
             console.warn('Database Warning: Not connected. Skipping db save (Safe for local UI testing).');
        } else {
             const newEnquiry = new Enquiry({ name, email, date, eventType, message });
             await Promise.race([
                 newEnquiry.save(),
                 new Promise((_, reject) => setTimeout(() => reject(new Error('Mongoose buffer timeout')), 2500))
             ]);
        }
    } catch (dbErr) {
        console.warn('Database Warning: Could not save to Mongo (Safe to ignore if testing locally without DB):', dbErr.message);
    }

    try {
        // Prepare email
        const mailOptions = {
            from: process.env.EMAIL_USER || 'no-reply@aksharmehendi.com',
            to: 'rajpanchal7706@gmail.com',
            subject: `New Enquiry from ${name} - Akshar Mehendi`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
                    <h2 style="color: #6C2B1D; border-bottom: 2px solid #D4AF37; padding-bottom: 10px;">New Booking Enquiry</h2>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Date requested:</strong> ${date || 'Not specified'}</p>
                    <p><strong>Event Type:</strong> ${eventType || 'Not specified'}</p>
                    <p><strong>Message:</strong></p>
                    <p style="background: #f9f9f9; padding: 10px; border-left: 3px solid #6C2B1D;">${message || 'No additional message.'}</p>
                </div>
            `
        };

        // Prepare client confirmation email
        const clientMailOptions = {
            from: process.env.EMAIL_USER || 'no-reply@aksharmehendi.com',
            to: email, // client email
            subject: 'Confirmation: Your Booking Enquiry - Akshar Mehendi',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; color: #1A1A1A;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                        <img src="cid:logo" alt="Akshar Mehendi Logo" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
                        <h1 style="color: #6C2B1D; margin: 0; font-family: serif;">Akshar Mehendi</h1>
                    </div>
                    <p>Hello ${name},</p>
                    <p>Thank you for reaching out! We have successfully received your enquiry for <strong>${eventType || 'henna services'}</strong>.</p>
                    <p>We will review your details and get back to you shortly with availability and a tailored quote.</p>
                    <br>
                    <p>Best regards,</p>
                    <p style="color: #6C2B1D; font-weight: bold;">The Akshar Mehendi Team</p>
                </div>
            `,
            attachments: [{
                filename: 'logo.jpg',
                path: path.join(__dirname, 'public', 'images', 'logo.jpg'),
                cid: 'logo'
            }]
        };

        if (transporter) {
            // Send emails in the background (asynchronously) so the user doesn't have to wait
            Promise.all([
                transporter.sendMail(mailOptions),
                transporter.sendMail(clientMailOptions)
            ]).then(() => console.log('Emails sent successfully'))
              .catch((error) => console.error('Email error:', error));
        } else {
            console.log("\n--- SIMULATED NOTIFICATION EMAIL ---");
            console.log(`To: ${mailOptions.to}`);
            console.log(`Subject: ${mailOptions.subject}`);
            console.log("\n--- SIMULATED CLIENT EMAIL ---");
            console.log(`To: ${clientMailOptions.to}`);
            console.log(`Subject: ${clientMailOptions.subject}`);
            console.log("------------------------\n");
        }

        res.json({ success: true, message: 'Enquiry received successfully' });
    } catch (err) {
        console.error('Server error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to process enquiry' });
    }
});

// Admin API to get all enquiries
app.get('/api/enquiries', async (req, res) => {
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    if (req.headers.authorization !== adminPassword) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    try {
        const mongoose = require('mongoose');
        // Check if mongoose is not connected (1) and not connecting (2)
        if (mongoose.connection.readyState !== 1 && mongoose.connection.readyState !== 2) {
            console.error('Database not connected. Returning 503 error to frontend.');
            return res.status(503).json({ success: false, message: 'Database disconnected. Check MongoDB Network Access (IP Whitelist).' });
        }

        // Add a 3 second timeout to the query so it doesn't hang for 10 seconds locally doing nothing
        const enquiries = await Enquiry.find().sort({ createdAt: -1 }).maxTimeMS(3000).exec();
        res.json({ success: true, enquiries });
    } catch (err) {
        console.error('Error fetching enquiries:', err.message);
        // If it was just a timeout, return empty array to prevent 500 error breaking the UI
        if (err.message && err.message.includes('buffering timed out')) {
            return res.json({ success: true, enquiries: [] });
        }
        res.status(500).json({ success: false, message: 'Failed to fetch enquiries' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Export the Express API for Vercel
module.exports = app;
