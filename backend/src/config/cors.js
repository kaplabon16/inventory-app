import dotenv from 'dotenv'
dotenv.config()

const origin = process.env.FRONTEND_URL || 'http://localhost:5173'
export default {
  origin,
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE'
}
