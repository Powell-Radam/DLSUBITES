const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const app = new express();
const hbs = require('hbs');
const session = require('express-session');
const fileUpload = require('express-fileupload');
app.set('view engine','hbs');
require("dotenv").config();

mongoose.connect(process.env.MONGODB_URI);

const Post = require("./database/models/Post");
const Comment = require("./database/models/Comment");
const User = require("./database/models/User");
const Reaction = require("./database/models/Reaction");

app.use(express.json());
app.use(express.urlencoded( {extended: true}));
app.use(express.static('public'));
app.use(fileUpload());

const bcrypt = require('bcrypt');
var count_salt = 10;

hbs.registerPartials(path.join(__dirname, "views", "partials"));

app.use(
    session({
            secret: "secret-key",
            resave: false, 
            saveUninitialized: false,
            cookie: {maxAge: null}
    })
);

function buildCommentTree(comments) {
    const map = {};
    const roots = [];

    comments.forEach((comment) => {
        comment.children = [];
        comment.createdAt = formatDate(comment.createdAt);
        map[comment._id.toString()] = comment;
    });

    comments.forEach((comment) => {
        if (comment.parentId) {
            const parent = map[comment.parentId.toString()];
            if (parent) {
                parent.children.push(comment);
            } else {
                roots.push(comment);
            }
        } else {
            roots.push(comment);
        }
    });

    return roots;
}

function formatDate(date) {
    const d = new Date(date);

    const datePart = d.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "numeric",
        day: "numeric"
    });

    const timePart = d.toLocaleTimeString("en-PH", {
        hour: "2-digit",
        minute: "2-digit"
    });

    return `${datePart}, ${timePart}`;
}

app.get("/", async (req, res) => {

    const sort = req.query.sort || "recent";
    const search = req.query.search || "";
    
    let sortOption = { createdAt: -1 };

    if (sort === "popular") {
        sortOption = { score: -1 };
    }

    let query = {};

    if (search) { 
        query = {
            $or: [
                { title: { $regex: search, $options: "i" } },
                { store: { $regex: search, $options: "i" } },
                { location: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
                { author: { $regex: search, $options: "i" } }
            ]
        };
    }

    const posts = await Post.find(query).sort(sortOption).lean();

    for (let post of posts) {
        post.commentCount = await Comment.countDocuments({ postId: post._id });
        post.userReaction = 0;
        post.createdAt = formatDate(post.createdAt);
    }

    if (sort === "comments") {
        posts.sort((a, b) => b.commentCount - a.commentCount);
    }
    

    if (req.session.user && posts.length > 0) {
        const postIds = posts.map(post => post._id);

        const reactions = await Reaction.find({
            username: req.session.user.username,
            postId: { $in: postIds }
        }).lean();

        const reactionMap = {};
        reactions.forEach(r => {
            reactionMap[r.postId.toString()] = r.value;
        });

        posts.forEach(post => {
            post.userReaction = reactionMap[post._id.toString()] || 0;
            post.liked = post.userReaction === 1;
            post.disliked = post.userReaction === -1;
        });
    }

    res.render("index", {
        posts,
        recentSelected: sort === "recent",
        popularSelected: sort === "popular",
        commentsSelected: sort === "comments",
        search,
        user: req.session.user
    });

});



app.get("/post/:id", async (req, res) => {
    try {
        const post = await Post.findById(req.params.id).lean();

        if (!post) {
            return res.status(404).send("Post not found");
        }

        post.createdAt = formatDate(post.createdAt);

        post.isOwner = req.session.user && req.session.user.username === post.author;

        const comments = await Comment.find({ postId: req.params.id })
            .sort({ createdAt: 1 })
            .lean();

        const commentCount = comments.length;

        comments.forEach((comment) => {
            comment.isOwner =
                req.session.user &&
                req.session.user.username === comment.author;
        });

        const threadedComments = buildCommentTree(comments);

        let userReaction = 0;

        if (req.session.user) {
            const reaction = await Reaction.findOne({
                postId: req.params.id,
                username: req.session.user.username
            }).lean();

            if (reaction) {
                userReaction = reaction.value;
            }
        }

        res.render("post", {
            post,
            comments: threadedComments,
            commentCount,
            user: req.session.user,
            liked: userReaction === 1,
            disliked: userReaction === -1
        });
    } catch (err) {
        console.log(err);
        res.status(500).send("Error loading post");
    }
});

app.post("/post/:id/edit", async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect("/login");
        }

        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).send("Post not found");
        }

        if (post.author !== req.session.user.username) {
            return res.status(403).send("Not allowed");
        }

        const title = req.body.title ? req.body.title.trim() : "";
        const location = req.body.location ? req.body.location.trim() : "";
        const store = req.body.store ? req.body.store.trim() : "";
        const description = req.body.description ? req.body.description.trim() : "";

        if (!title || !location || !store || !description) {
            return res.redirect("/post/" + req.params.id);
        }
        if(post.title !== title || post.location !== location || post.store !== store || post.description !== description)
            post.isEdited = true;

        post.title = title;
        post.location = location;
        post.store = store;
        post.description = description;
        

        await post.save();

        res.redirect("/post/" + req.params.id);
    } catch (err) {
        console.log(err);
        res.status(500).send("Error editing post");
    }
});

app.post("/post/:id/delete", async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect("/login");
        }

        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).send("Post not found");
        }

        if (post.author !== req.session.user.username) {
            return res.status(403).send("Not allowed");
        }

        await Comment.deleteMany({ postId: req.params.id });
        await Reaction.deleteMany({ postId: req.params.id });
        await Post.findByIdAndDelete(req.params.id);

        res.redirect("/");
    } catch (err) {
        console.log(err);
        res.status(500).send("Error deleting post");
    }
});


app.post("/post/:id/comment", async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect("/login");
        }

        const text = req.body.text ? req.body.text.trim() : "";
        const parentId = req.body.parentId || null;

        if (!text) {
            return res.redirect("/post/" + req.params.id);
        }

        await Comment.create({
            postId: req.params.id,
            parentId: parentId,
            author: req.session.user.username,
            text: text
        });

        res.redirect("/post/" + req.params.id);
    } catch (err) {
        console.log(err);
        res.status(500).send("Error adding comment");
    }
});

app.post("/comment/:id/edit", async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect("/login");
        }

        const comment = await Comment.findById(req.params.id);

        if (!comment) {
            return res.status(404).send("Comment not found");
        }

        if (comment.author !== req.session.user.username) {
            return res.status(403).send("Not allowed");
        }

        const text = req.body.text ? req.body.text.trim() : "";

        if (!text) {
            return res.redirect("/post/" + comment.postId);
        }

        if(comment.text !== text)
            comment.isEdited = true;

        comment.text = text;
        
        await comment.save();

        res.redirect("/post/" + comment.postId);
    } catch (err) {
        console.log(err);
        res.status(500).send("Error editing comment");
    }
});

app.post("/comment/:id/delete", async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect("/login");
        }

        const comment = await Comment.findById(req.params.id);

        if (!comment) {
            return res.status(404).send("Comment not found");
        }

        if (comment.author !== req.session.user.username) {
            return res.status(403).send("Not allowed");
        }

        comment.text = "deleted";
        comment.author = "deleted";

        await comment.save();

        res.redirect("/post/" + comment.postId);
    } catch (err) {
        console.log(err);
        res.status(500).send("Error deleting comment");
    }
});

app.post("/post/:id/react", async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: "Login required" });
        }

        const postId = req.params.id;
        const username = req.session.user.username;
        const value = Number(req.body.value);

        if (![1, -1].includes(value)) {
            return res.status(400).json({ error: "Invalid reaction value" });
        }

        let reaction = await Reaction.findOne({ postId, username });

        let userReaction = 0;

        if (!reaction) {
            await Reaction.create({
                postId,
                username,
                value
            });
            userReaction = value;
        } else if (reaction.value === value) {
            await Reaction.deleteOne({ _id: reaction._id });
            userReaction = 0;
        } else {
            reaction.value = value;
            await reaction.save();
            userReaction = value;
        }

        const reactions = await Reaction.find({ postId }).lean();

        const score = reactions.reduce((sum, r) => sum + r.value, 0);

        await Post.findByIdAndUpdate(postId, { score });

        res.json({
            score,
            userReaction
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Error reacting to post" });
    }
});

app.get("/profile/:username", async (req, res) => {
    try {
        const username = req.params.username;

        const userProfile = await User.findOne({ username }).lean();

        if (!userProfile) {
            return res.status(404).send("User not found");
        }

        const posts = await Post.find({ author: username })
            .sort({ createdAt: -1 })
            .lean();

        for (let post of posts) {
            post.commentCount = await Comment.countDocuments({ postId: post._id });
            post.userReaction = 0;
            post.createdAt = formatDate(post.createdAt);
        }

        if (req.session.user && posts.length > 0) {
            const postIds = posts.map(post => post._id);

            const reactions = await Reaction.find({
                username: req.session.user.username,
                postId: { $in: postIds }
            }).lean();

            const reactionMap = {};
            reactions.forEach(r => {
                reactionMap[r.postId.toString()] = r.value;
            });

            posts.forEach(post => {
                post.userReaction = reactionMap[post._id.toString()] || 0;
                post.liked = post.userReaction === 1;
                post.disliked = post.userReaction === -1;
            });
        }

        const isOwner =
            req.session.user &&
            req.session.user.username === username;

        res.render("profile", {
            profile: userProfile,
            error: req.query.error,
            posts,
            isOwner,
            user: req.session.user
        });
    } catch (err) {
        console.log(err);
        res.status(500).send("Error loading profile");
    }
});


app.post("/profile/:username/edit", async function(req, res) {
    try {
        if (!req.session.user) {
            return res.redirect("/login");
        }

        const userData = req.session.user;

        if (userData.username !== req.params.username) {
            return res.status(403).send("Not allowed");
        }

        let updateData = {
            bio: req.body.bio ? req.body.bio.trim() : "No bio yet."
        };

        if (req.files && req.files.avatar) {
            const { avatar } = req.files;

            const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
            if (!allowedTypes.includes(avatar.mimetype)) {
                return res.redirect("/profile/" + userData.username + "?error=Only image files are allowed.");
            }

            const extension = path.extname(avatar.name).toLowerCase() || ".jpg";
            const fileName = userData.username + ".jpg";
            const uploadPath = path.resolve(__dirname, "public/images", fileName);

            await avatar.mv(uploadPath);

            updateData.avatar = "/images/" + fileName;
        }

        await User.findOneAndUpdate(
            { username: userData.username },
            updateData
        );

        res.redirect("/profile/" + userData.username);
    } catch (error) {
        console.log(error);
        res.status(500).send("Error updating profile.");
    }
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/signup", (req, res) => {
    res.render("signup");
});

app.post("/login", async (req, res) => {
    try {
        const username = req.body.username ? req.body.username.trim() : "";
        const password = req.body.password ? req.body.password : "";
        const rememberMe = req.body.rememberMe === "true";
        
        if (!username || !password) {
            return res.status(400).send("Username and password are required.");
        }


        const user = await User.findOne({ username }).lean();



        if (!user) {
            return res.render("login", { error: "Invalid username or password." });
        }

        var match = await bcrypt.compare(password, user.password);

        if(match)
        {
            req.session.user = { username: user.username };
        } else {
            return res.render("login", { error: "Invalid username or password." });
        }
        

        if (rememberMe) {
            req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 21;
        } else {
            req.session.cookie.maxAge = null;
        }

        res.redirect("/");
    } catch (err) {
        console.log(err);
        res.status(500).send("Error logging in.");
    }
});

app.post("/signup", async (req, res) => {
    try {
        const username = req.body.username ? req.body.username.trim() : "";
        const password = req.body.password ? req.body.password : "";
        const confirmPassword = req.body.confirmPassword ? req.body.confirmPassword : "";

        if (!username || !password || !confirmPassword) {
            return res.render("signup", { error: "All fields are required." });
            
        }

        if (password !== confirmPassword) {
            return res.render("signup", { error: "Passwords do not match." });
            
        }

        const existingUser = await User.findOne({ username });

        if (existingUser) {
            return res.render("signup", { error: "Username already exists." });
        }

        const saltRounds = count_salt;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const newUser = await User.create({
            username,
            password: hashedPassword
        });

        req.session.user = {
            username: newUser.username
        };

        res.redirect("/");
    } catch (err) {
        console.log(err);
        res.status(500).send("Error creating account.");
    }
});

app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.redirect("/");
    });
});

app.get("/new-post", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }

    res.render("new-post", {
        user: req.session.user
    });
});

app.post("/new-post", async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect("/login");
        }

        const title = req.body.title ? req.body.title.trim() : "";
        const location = req.body.location ? req.body.location : "";
        const store = req.body.store ? req.body.store.trim() : "";
        const description = req.body.description ? req.body.description.trim() : "";

        if (!title || !location || !store || !description) {
            return res.status(400).send("All fields are required.");
        }

        await Post.create({
            title,
            location,
            store,
            description,
            author: req.session.user.username,
            score: 0
        });

        res.redirect("/");
    } catch (err) {
        console.log(err);
        res.status(500).send("Error creating post.");
    }
});

app.get("/about", (req, res) => {
    res.render("about", {
        user: req.session.user
    });
});



const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('Listening on Port ' + PORT);
});
