require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const passport = require("passport");
const TelegramStrategy = require("passport-telegram-official").Strategy;
const session = require("express-session");

const app = express();

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

// User model
const User = mongoose.model("User", new mongoose.Schema({
    telegramId: String,
    username: String,
    first_name: String,
    last_name: String,
    photo_url: String,
}));

// Session middleware
app.use(session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

// Telegram authentication strategy
passport.use(new TelegramStrategy({
    botToken: process.env.TELEGRAM_BOT_TOKEN
}, async (profile, done) => {
    let user = await User.findOne({ telegramId: profile.id });
    if (!user) {
        user = await User.create({
            telegramId: profile.id,
            username: profile.username,
            first_name: profile.first_name,
            last_name: profile.last_name,
            photo_url: profile.photo_url,
        });
    }
    return done(null, user);
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    const user = await User.findById(id);
    done(null, user);
});

// Routes
app.get("/auth/telegram", passport.authenticate("telegram"));
app.get("/auth/telegram/callback", passport.authenticate("telegram", {
    successRedirect: "/dashboard",
    failureRedirect: "/login"
}));

app.get("/dashboard", (req, res) => {
    if (!req.isAuthenticated()) return res.redirect("/login");
    res.send(`Welcome, ${req.user.username}`);
});

app.get("/logout", (req, res) => {
    req.logout(err => {
        if (err) return next(err);
        res.redirect("/");
    });
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));