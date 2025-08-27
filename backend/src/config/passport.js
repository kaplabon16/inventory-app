import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Strategy as GitHubStrategy } from 'passport-github2'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export function configurePassport() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK,
          GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_CALLBACK } = process.env

  if (GOOGLE_CLIENT_ID) {
    passport.use(new GoogleStrategy({
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value
        const name = profile.displayName || profile.username || email
        const avatar = profile.photos?.[0]?.value
        let user = await prisma.user.findUnique({ where: { email } })
        if (!user) {
          user = await prisma.user.create({
            data: { email, name, avatar, provider: 'google', providerId: profile.id }
          })
        }
        return done(null, user)
      } catch (e) { done(e) }
    }))
  }

  if (GITHUB_CLIENT_ID) {
    passport.use(new GitHubStrategy({
      clientID: GITHUB_CLIENT_ID,
      clientSecret: GITHUB_CLIENT_SECRET,
      callbackURL: GITHUB_CALLBACK,
      scope: ['user:email']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value || `${profile.username}@users.noreply.github.com`
        const name = profile.displayName || profile.username || email
        const avatar = profile.photos?.[0]?.value
        let user = await prisma.user.findUnique({ where: { email } })
        if (!user) {
          user = await prisma.user.create({
            data: { email, name, avatar, provider: 'github', providerId: profile.id }
          })
        }
        return done(null, user)
      } catch (e) { done(e) }
    }))
  }
}
