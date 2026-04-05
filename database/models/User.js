const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    bio: {
        type: String,
        default: "No bio yet."
    },
    avatar: {
        type: String,
        default: "/images/default.jpg"
    }
});

const User = mongoose.model("User", UserSchema);

module.exports = User;