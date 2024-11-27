const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken'); // For creating and verifying JWTs
const nodemailer = require('nodemailer');

const JWT_SECRET = "your_jwt_secret"; // Replace with a strong secret key
const JWT_EXPIRES_IN = "15m";
const User = require('./../models/User');

// password handler
const bcrypt = require('bcryptjs');

//signup
router.post('/signup', (req, res) => {
    let {name, email, password, dateOfBirth} = req.body;
    name = name.trim();
    email = email.trim();
    password = password.trim();
    dateOfBirth = dateOfBirth.trim();

    if (name == "" || email == "" || password == "" || dateOfBirth == "") {
        res.json({
            status: "FAILED",
            message: "Empty input fields!"
        });
    } else if (!/^[a-zA-Z]+(\s[a-zA-Z]+)*$/.test(name)) {
        res.json({
            status: "FAILED",
            message: "Invalid name entered"
        })
    } else if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
        res.json({
            status: "Failed",
            message: "invalied email entered"
        })
    } else if (!new Date(dateOfBirth).getTime()) {
        res.json({
            status: "FAILED",
            message: "Invalied date of birth entered"
        })
    } else if (password.length < 8) {
        res.json({
            status: "FAILED",
            message: "password is too short!"
        })
    } else {
        //checking is user already exists
        User.find({email}).then(result => {
            if (result.length) {
                //already exists
                res.json({
                    status: "FAILED",
                    message: "User  with the provided email already exists"
                })
            } else {
                //try to create new user

            //password handling
            const saltRounds = 10;
            bcrypt.hash(password, saltRounds).then(hashedPassword => {
                const newUser = new User({
                    name,
                    email,
                    password: hashedPassword,
                    dateOfBirth
                });

                newUser.save().then(result => {
                    res.json({
                        status: "SUCCESS",
                        message: "Signup successful",
                        data: result,
                    })
                })
                .catch(err => {
                    res.json({
                        status: "FAILED",
                        message: "An error occured while saving user account!"
                        })
                })
            })
            .catch(err => {
                res.json({
                status: "FAILED",
                message: "An error occured while hashing passowrd!"
                })
            })
            }
        }).catch(err => {
            console.log(err);
            res.json({
                status: "FAILED",
                message: "An error occured while checking for existing user!"
            })
        })
    }
})

//signin
router.post('/signin', (req, res) => {
    let {email, password} = req.body;
    email = email.trim();  
    password = password.trim();

    if (email == "" || password == "") {
        res.json({
            status: "FAILED",
            message: "Empty credentials supplied"
        })
    } else {
        //check if user exist
        User.find({email}).then(data=> {
            if (data.length) {
                //user exists

                const hashedPassword = data[0].password;
                bcrypt.compare(password, hashedPassword).then(result => {
                    if (result) {
                        //password match
                        res.json({
                            status: "SUCCESS",
                            message: "Signin successful",
                            data: data
                        })
                    } else {
                        res.json({
                            status: "FAILED",
                            message: "Invalid password entered!"
                        })
                    }
                })
                .catch(err => {
                    res.json({
                        status: "FAILED",
                        message: "An error occured while comparing passwords"
                    })
                })
            } else {
                res.json({
                    status: "FAILED",
                    message: "Invalid credentials entered!"
                })
            }
        })
        .catch(err => {
            res.json({
                status: "FAILED",
                message: "An error occured while checking for existing user"
            })
        })
    }
})

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
                        <a href="http://localhost:3001/reset-password/${resetToken}">Reset Password</a>
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
