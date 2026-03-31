const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const Student = require('../models/Student');
const Company = require('../models/Company');

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// Google OAuth Strategy - COMMENTED OUT (Configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env to enable)
/*
passport.use(
    new GoogleStrategy({
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
            passReqToCallback: true
        },
        async (req, accessToken, refreshToken, profile, done) => {
            try {
                // Check if user already exists
                let user = await User.findOne({
                    googleId: profile.id
                });

                if (user) {
                    // Update last login
                    user.lastLogin = Date.now();
                    await user.save();
                    return done(null, user);
                }

                // Check if email already exists
                user = await User.findOne({
                    email: profile.emails[0].value
                });

                if (user) {
                    // Link Google account to existing user
                    user.googleId = profile.id;
                    user.isEmailVerified = true;
                    user.avatar = (profile.photos && profile.photos[0]) ? profile.photos[0].value : user.avatar;
                    user.lastLogin = Date.now();
                    await user.save();
                    return done(null, user);
                }

                // Get role from session (set during OAuth initiation)
                const role = req.session.oauthRole || 'student';

                // Create new user
                user = await User.create({
                    email: profile.emails[0].value,
                    googleId: profile.id,
                    role: role,
                    isEmailVerified: true,
                    avatar: (profile.photos && profile.photos[0]) ? profile.photos[0].value : null,
                    lastLogin: Date.now()
                });

                // Create role-specific profile
                const names = profile.displayName.split(' ');
                const firstName = names[0] || '';
                const lastName = names.slice(1).join(' ') || '';

                if (role === 'student') {
                    await Student.create({
                        userId: user._id,
                        firstName,
                        lastName
                    });
                } else if (role === 'company') {
                    await Company.create({
                        userId: user._id,
                        companyName: profile.displayName,
                        contactInfo: {
                            email: profile.emails[0].value
                        }
                    });
                }

                done(null, user);
            } catch (error) {
                done(error, null);
            }
        }
    )
);
*/

module.exports = passport;