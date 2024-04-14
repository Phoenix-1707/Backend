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
        console.log(qrToken);
        // Fetch user details based on the QR token
        const user = await User.findOne({ qrCodeToken: qrToken });

        // Check if user exists
        if (!user) {
            return res.status(404).send('User not found');
        }

        // Update the state of the QR code in the database
        const updatedState = !user.state;
        await User.findByIdAndUpdate(user._id, { state: updatedState });

        // Increment the usage count of the QR token for the specific user
        
        const usageCount=user.usageCount+1;
        
        await User.findByIdAndUpdate(user._id, { usageCount: usageCount });
        console.log(usageCount);
        if (usageCount === 2) {
            const newToken = crypto.randomBytes(16).toString('hex'); // Generate a new random token
            await User.findByIdAndUpdate(user._id, { qrCodeToken: newToken, usageCount: 0 });
        }
        // If the usage count reaches 2, up date the QR token and reset usage count
        
        

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

        // console.log(userDetails);
        // res.sendStatus(200); // Send success response
    res.json(userDetails);
    } catch (error) {
        console.error('Error processing data:', error);
        res.status(500).send('Internal Server Error');
    }
});


// Handle GET request for user-details page
app.get('/user-details.html', (req, res) => {
    try {
        // Read the userdetails.html file
        fs.readFile(path.join(__dirname, 'HTML', 'userdetails.html'), 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading userdetails.html:', err);
                return res.status(500).send('Internal Server Error');
            }
            // Replace placeholders in the HTML file with dynamic data
            data = data.replace('{{email}}', userDetails.email);
            data = data.replace('{{phone}}', userDetails.phone);
            data = data.replace('{{role}}', userDetails.role);
            // data = data.replace('{{state}}', userDetails.state);
            // data = data.replace('{{usageCount}}', userDetails.usageCount);
            if(!userDetails.usageCount){
                data = data.replace('{{state}}', "ENTRY SUCCESSFUL:-) YOU R ONBOARD");
            }
            else{
                
                data = data.replace('{{state}}', "EXITED SUCCESSFUL:-) ADIOS");
                     }
            // Send the modified HTML content as a response
            res.send(data);

            // userDetails = {};
            // console.log(userDetails);
        });
    } catch (error) {
        console.error('Error rendering user-details page:', error);
        res.status(500).send('Internal Server Error');
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
