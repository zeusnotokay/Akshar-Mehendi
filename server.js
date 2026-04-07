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
        const newEnquiry = new Enquiry({ name, email, date, eventType, message });
        await newEnquiry.save();
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

        if (transporter) {
            try {
                const info = await transporter.sendMail(mailOptions);
                console.log('Email sent: ' + info.response);
            } catch (error) {
                console.error('Email error:', error);
            }
        } else {
            console.log("\n--- SIMULATED EMAIL ---");
            console.log(`To: ${mailOptions.to}`);
            console.log(`Subject: ${mailOptions.subject}`);
            console.log(`Message: \n${mailOptions.html}`);
            console.log("------------------------\n");
        }

        res.json({ success: true, message: 'Enquiry received successfully' });
    } catch (err) {
        console.error('Server error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to process enquiry' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Export the Express API for Vercel
module.exports = app;
