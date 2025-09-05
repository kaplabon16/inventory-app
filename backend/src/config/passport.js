import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Strategy as GitHubStrategy } from 'passport-github2'
import { prisma } from '../services/prisma.js' 

export function configurePassport() {
  const {
    GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK
  } = process.env
  const {
    GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_CALLBACK
  } = process.env

  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_CALLBACK) {
    passport.use(new GoogleStrategy(
      { clientID: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET, callbackURL: GOOGLE_CALLBACK },
      async (_at, _rt, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase()
          const name = profile.displayName || profile.username || email
          const avatar = profile.photos?.[0]?.value
          if (!email) return done(null, false)
          let user = await prisma.user.findUnique({ where: { email } })
          if (!user) {
            user = await prisma.user.create({
              data: { email, name: name || email, avatar, provider: 'google', providerId: profile.id, roles: [] }
            })
          }
          return done(null, { id: user.id, roles: user.roles, name: user.name, email: user.email, blocked: user.blocked })
        } catch (e) { return done(e) }
      }
    ))
  }

  if (GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET && GITHUB_CALLBACK) {
    passport.use(new GitHubStrategy(
      { clientID: GITHUB_CLIENT_ID, clientSecret: GITHUB_CLIENT_SECRET, callbackURL: GITHUB_CALLBACK, scope: ['user:email'] },
      async (_at, _rt, profile, done) => {
        try {
          const email = (profile.emails?.find(e => e.verified)?.value || profile.emails?.[0]?.value ||
                        (profile.username ? `${profile.username}@users.noreply.github.com` : null))?.toLowerCase()
          const name = profile.displayName || profile.username || email
          const avatar = profile.photos?.[0]?.value
          if (!email) return done(null, false)
          let user = await prisma.user.findUnique({ where: { email } })
          if (!user) {
            user = await prisma.user.create({
              data: { email, name: name || email, avatar, provider: 'github', providerId: profile.id, roles: [] }
            })
          }
          return done(null, { id: user.id, roles: user.roles, name: user.name, email: user.email, blocked: user.blocked })
        } catch (e) { return done(e) }
      }
    ))
  }
}


