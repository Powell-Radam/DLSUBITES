const mongoose = require("mongoose");

const ReactionSchema = new mongoose.Schema({
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
        required: true
    },
    username: {
        type: String,
        required: true
    },
    value: {
        type: Number,
        enum: [1, -1],
        required: true
    }
});

ReactionSchema.index({ postId: 1, username: 1 }, { unique: true });

const Reaction = mongoose.model("Reaction", ReactionSchema);

module.exports = Reaction;