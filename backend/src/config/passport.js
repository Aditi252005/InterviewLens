const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

// Only the fields we actually need end up in the session/user document.
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user || false);
  } catch (err) {
    done(err);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : undefined;
        const name = profile.displayName;
        const profileImage = profile.photos && profile.photos[0] ? profile.photos[0].value : undefined;

        let user = await User.findOne({ googleId });

        if (!user) {
          user = await User.create({ googleId, name, email, profileImage });
        } else {
          // Keep basic profile info fresh on every login.
          user.name = name || user.name;
          user.email = email || user.email;
          user.profileImage = profileImage || user.profileImage;
          await user.save();
        }

        done(null, user);
      } catch (err) {
        done(err);
      }
    }
  )
);

module.exports = passport;
