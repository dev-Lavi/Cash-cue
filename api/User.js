const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken'); // For creating and verifying JWTs
const nodemailer = require('nodemailer');

const JWT_SECRET = "your_jwt_secret"; // Replace with a strong secret key
const JWT_EXPIRES_IN = "5m";
const User = require('./../models/User');

// password handler
const bcrypt = require('bcryptjs');

//signup
router.post('/signup', async (req, res) => {
    let { name, email, password } = req.body;
    name = name.trim();
    email = email.trim();
    password = password.trim();

    if (!name || !email || !password) {
        return res.json({ status: "FAILED", message: "Empty input fields!" });
    }

    if (!/^[a-zA-Z]+(\s[a-zA-Z]+)*$/.test(name)) {
        return res.json({ status: "FAILED", message: "Invalid name entered" });
    }

    if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
        return res.json({ status: "FAILED", message: "Invalid email entered" });
    }

    if (password.length < 8) {
        return res.json({ status: "FAILED", message: "Password is too short!" });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.json({
                status: "FAILED",
                message: "User with the provided email already exists",
            });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user
        const newUser = new User({ name, email, password: hashedPassword });
        const savedUser = await newUser.save();

        // Generate verification token
        const verificationToken = jwt.sign(
            { id: savedUser._id, email: savedUser.email },
            JWT_SECRET,
            { expiresIn: "30m" } // Token valid for 1 hour
        );

        // Send verification email
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL, // Your email
                pass: process.env.EMAIL_PASSWORD, // Your email password
            },
        });

        const verificationLink = `https://cash-cue.onrender.com/user/verify-email/${verificationToken}`;

        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: "Verify Your Email Address",
            html: `
                <p>Hi ${name},</p>
                <p>Thank you for signing up. Please verify your email by clicking the link below:</p>
                <a href="${verificationLink}">Verify Email</a>
                <p>This link will expire in 1 hour.</p>
            `,
        };

        await transporter.sendMail(mailOptions);

        return res.json({
            status: "SUCCESS",
            message: "Signup successful! Verification email sent.",
        });
    } catch (error) {
        console.error(error);
        return res.json({
            status: "FAILED",
            message: "An error occurred during signup. Please try again.",
        });
    }
});

//verify gmail by token
router.get('/verify-email/:token', async (req, res) => {
    const { token } = req.params;

    try {
        // Verify the token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Find the user by ID
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.json({
                status: "FAILED",
                message: "Invalid or expired token!",
            });
        }

        // Mark the user as verified
        user.isVerified = true;
        await user.save();

        return res.json({
            status: "SUCCESS",
            message: "Email verified successfully!",
        });
    } catch (error) {
        console.error(error);
        return res.json({
            status: "FAILED",
            message: "Invalid or expired token!",
        });
    }
});

//signin
router.post('/signin', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.json({ status: "FAILED", message: "Empty credentials supplied!" });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.json({ status: "FAILED", message: "Invalid credentials!" });
        }

        if (!user.isVerified) {
            return res.json({
                status: "FAILED",
                message: "Email not verified. Please check your email for the verification link.",
            });
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.json({ status: "FAILED", message: "Invalid password!" });
        }

        return res.json({
            status: "SUCCESS",
            message: "Sign-in successful!",
            data: user,
        });
    } catch (error) {
        console.error(error);
        return res.json({
            status: "FAILED",
            message: "An error occurred during sign-in.",
        });
    }
});

// Forgot Password: Send Reset Token
router.post('/forgot-password', (req, res) => {
    const { email } = req.body;

    if (!email || email.trim() === "") {
        return res.json({
            status: "FAILED",
            message: "Email is required!"
        });
    }

    User.findOne({ email }).then(user => {
        if (!user) {
            return res.json({
                status: "FAILED",
                message: "No user found with this email!"
            });
        }

                // Generate a JWT token
                const resetToken = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

                // Send reset email
                const transporter = nodemailer.createTransport({
                    service: "gmail",
                    auth: {
                        user: process.env.EMAIL, //my email
                        pass: process.env.EMAIL_PASSWORD // my email password in an environment variable
                    }
                });
        
                const mailOptions = {
                    from: process.env.EMAIL,
                    to: email,
                    subject: "Password Reset",
                    html: `
                        <p>You requested a password reset</p>
                        <p>Click the link below to reset your password:</p>
                        <a href="https://cash-cue.onrender.com/reset-password/${resetToken}">Reset Password</a>
                        <p>This link will expire in 15 minutes.</p>
                    `
                };

                transporter.sendMail(mailOptions, (err, info) => {
                    if (err) {
                        return res.json({
                            status: "FAILED",
                            message: "Failed to send email!",
                            error: err
                        });
                    }
        
                    res.json({
                        status: "SUCCESS",
                        message: "Password reset email sent!"
                    });
                });
            }).catch(err => {
                res.json({
                    status: "FAILED",
                    message: "An error occurred while finding user!",
                    error: err
                });
            });
        });

// Reset Password: Update the Password
router.post('/reset-password/:token', (req, res) => {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
        return res.json({
            status: "FAILED",
            message: "Password must be at least 8 characters long!"
        });
    }
        
// Verify the JWT token
jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
        return res.json({
            status: "FAILED",
            message: "Invalid or expired reset token!"
        });
    }

    // Token is valid, find the user and update the password
    User.findById(decoded.id).then(user => {
        if (!user) {
            return res.json({
                status: "FAILED",
                message: "User not found!"
            });
        }

        // Hash the new password
        bcrypt.hash(newPassword, 10).then(hashedPassword => {
            user.password = hashedPassword;

            user.save().then(() => {
                res.json({
                    status: "SUCCESS",
                    message: "Password reset successful!"
                });
            }).catch(err => {
                res.json({
                    status: "FAILED",
                    message: "An error occurred while updating the password!",
                    error: err
                });
            });
        }).catch(err => {
            res.json({
                status: "FAILED",
                message: "An error occurred while hashing the password!",
                error: err
            });
        });
    }).catch(err => {
        res.json({
            status: "FAILED",
            message: "An error occurred while finding the user!",
            error: err
        });
    });
});
});

module.exports = router;
