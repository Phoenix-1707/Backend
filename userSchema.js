const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        unique: true
    },
    phone:{
        type: Number,
        unique: true
        },
    password: {
        type:String,
        required: true
    },
    role: String,state: {
        type: Boolean,
        default: false // Default value is false
    },
    qrCodeToken: { type: String},
    usageCount: {
        type: Number,
        default: 0 // Set default value to 0
    }
});

module.exports = mongoose.model('User', userSchema);
