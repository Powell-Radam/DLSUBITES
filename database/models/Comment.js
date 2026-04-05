const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema({
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
        required: true
    },

    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
        default: null
    },

    author: {
        type: String,
        required: true
    },

    text: {
        type: String,
        required: true
    },

    createdAt: {
        type: Date,
        default: Date.now
    },
    isEdited: {
        type: Boolean,
        default: false
    }
});

const Comment = mongoose.model("Comment", CommentSchema);

module.exports = Comment;