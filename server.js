const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const User = require('./userSchema');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
// app.use(express.static('public'));

app.use(express.static(path.join(__dirname, 'HTML')));
app.use('/css', express.static(path.join(__dirname, 'CSS')));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

app.use(express.json());
mongoose.connect('mongodb://localhost:27017/AdiosArrival');
let userDetails = {};
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'HTML', 'index.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'HTML', 'login.html'));
});
app.post('/login-form', async (req, res) => {
    try {
        const { username, password, role } = req.body;
        const user = await User.findOne({ email: username });

        const qrCodeToken = user.qrCodeToken;
        if (!user) {
            return res.redirect('/register.html?message=Please register first.');
        }

        if (user.password !== password) {
            return res.redirect('/login.html?message=Incorrect password.');
        }

        if (user.role !== role) {
            return res.redirect('/login.html?message=Incorrect role selected.');
        }

        if (user.role === 'security') {
            // If user role is "security", redirect them to a different page
            return res.redirect('/security_dashboard.html?message=' + qrCodeToken);
        } else {
            // If user role is not "security", redirect them to the normal successful login page
            return res.redirect('/success_login.html?message=' + qrCodeToken);
        }
    } catch (error) {
        console.error(error);
        res.sendFile(path.join(__dirname, 'HTML', 'error.html'));
    }
});




app.post('/registration-form', async (req, res) => {
    try {
        const formData = req.body;
        console.log(formData);
        // Check if the user already exists in the database
        const existingUser = await User.findOne({ email: formData.email });

        if (existingUser) {
            // If user already exists, redirect to login page with a message
            return res.redirect('/login.html?message=You are a ' + existingUser.role + ' and already exists. Please login.');
        }

        // If user doesn't exist, create a new user and save to the database
        const token = crypto.randomBytes(16).toString('hex'); // Generate a random token
        // formData.token=token;
        const newUser = await User.create({ ...formData, qrCodeToken: token });
        console.log(token);// const newUser = await User.create(formData);
        await newUser.save();

        // Redirect to success page after successful registration
        res.sendFile(path.join(__dirname, 'HTML', 'success_signup.html'));
    } catch (error) {
        console.error(error);
        // If any error occurs, redirect to error page
        res.sendFile(path.join(__dirname, 'HTML', 'error.html'));
    }
});
app.post('/backend-endpoint', (req, res) => {
    // Assuming you process the token here and send back some data
    const token = req.body.token;
    // Here you can do some processing with the token and send back some data
    const responseData = { message: 'Token received and processed successfully', token: token };
    res.json(responseData);
});
app.post('/qrcheck', async (req, res) => {
    try {
        const qrToken = req.body.data; // Assuming the data is sent as { "data": "Your QR token here" }

        // Fetch user details based on the QR token
        const user = await User.findOne({ qrCodeToken: qrToken });

        // Check if user exists
        if (!user) {
            return res.status(404).send('User not found');
        }

        // Store user details
        userDetails = {
            email: user.email,
            phone: user.phone,
            role: user.role,
            state: user.state,
            usageCount: user.usageCount,
            qrCodeToken: user.qrCodeToken,
            // Add more user details as needed
        };

        console.log(userDetails); // Log the user details for debugging purposes

        res.sendStatus(200); // Send success response
    } catch (error) {
        console.error('Error processing data:', error);
        res.status(500).send('Internal Server Error');
    }
});

// GET endpoint to render user details page
app.get('/userdetails', (req, res) => {
    try {
        // Read the user-details.html file
        let data = fs.readFileSync(path.join(__dirname, 'HTML', 'userdetails.html'), 'utf8');
        // console.log(data); // Log the HTML content for debugging purposes
        // Replace placeholders in the HTML file with dynamic user details
        data = data.replace('{{email}}', userDetails.email || '');
        data = data.replace('{{phone}}', userDetails.phone || '');
        data = data.replace('{{role}}', userDetails.role || '');
        data = data.replace('{{state}}', userDetails.state ? 'ENTRY SUCCESSFUL:-) YOU R ONBOARD' : 'EXITED SUCCESSFUL:-) ADIOS');
        data = data.replace('{{usageCount}}', userDetails.usageCount || 0);

        // Send the modified HTML content as a response
        res.send(data);
    } catch (error) {
        console.error('Error rendering user-details page:', error);
        res.status(500).send('Internal Server Error');
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
