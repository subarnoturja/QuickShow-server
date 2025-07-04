import express from "express";
import cors from "cors";
import 'dotenv/config';
import connectDB from "./configs/db.js";
import { clerkMiddleware } from '@clerk/express'
import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/server.js";
import showRouter from "./routes/showRoutes.js";
import bookingRouter from "./routes/bookingRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import userRouter from "./routes/userRoutes.js";
import { stripeWebhooks } from "./controllers/stripeWebhooks.js";

const app = express();
const port = 3000;

await connectDB()

// Stripe Webhooks Route
app.use('/api/stripe', express.raw({type: "application/json"}), stripeWebhooks)

// Middleware
app.use(express.json())
app.use(cors())
app.use(clerkMiddleware())

// API Routes
app.get('/', (req, res) => {
    res.send("Quick Server is running now!")
})

app.use('/api/inngest', serve({ client: inngest, functions }))
// Show Routes
app.use('/api/show', showRouter)
// Booking Routes
app.use('/api/booking', bookingRouter)
// Admin Routes
app.use('/api/admin', adminRouter);
// User Routes
app.use('/api/user', userRouter)

// API for listening the server
app.listen(port, () => {
    console.log(`Server is running on ${port}`)
})