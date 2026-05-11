const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { User, Student, Company } = require('../models');

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findByPk(id);
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
                let user = await User.findOne({ where: { googleId: profile.id } });

                if (user) {
                    user.lastLogin = new Date();
                    await user.save();
                    return done(null, user);
                }

                user = await User.findOne({ where: { email: profile.emails[0].value } });

                if (user) {
                    user.googleId = profile.id;
                    user.isEmailVerified = true;
                    user.avatar = (profile.photos && profile.photos[0]) ? profile.photos[0].value : user.avatar;
                    user.lastLogin = new Date();
                    await user.save();
                    return done(null, user);
                }

                const role = req.session.oauthRole || 'student';

                user = await User.create({
                    email: profile.emails[0].value,
                    googleId: profile.id,
                    role,
                    isEmailVerified: true,
                    avatar: (profile.photos && profile.photos[0]) ? profile.photos[0].value : null,
                    lastLogin: new Date()
                });

                const names = profile.displayName.split(' ');
                const firstName = names[0] || '';
                const lastName = names.slice(1).join(' ') || firstName;

                if (role === 'student') {
                    await Student.create({ userId: user.id, firstName, lastName });
                } else if (role === 'company') {
                    await Company.create({
                        userId: user.id,
                        companyName: profile.displayName,
                        industry: 'Unknown',
                        contactEmail: profile.emails[0].value
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
