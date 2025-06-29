import { Inngest } from "inngest";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import sendEmail from "../configs/nodeMailer.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "movie-ticket-booking" });

// Inngest Function to save user data to a database 
const syncUserCreation = inngest.createFunction(
    { id: 'sync-user-from-clerk' },
    { event: 'clerk/user.created' },
    async ({ event }) => {
        const { id, first_name, last_name, email_addresses, image_url } = event.data
        const userData = {
            _id: id,
            email: email_addresses[0].email_address,
            name: first_name + ' ' + last_name,
            image: image_url
        }
        await User.create(userData)
    }
)

// Inngest Function to delete user from database
const syncUserDeletion = inngest.createFunction(
    { id: 'delete-user-with-clerk' },
    { event: 'clerk/user.deleted' },
    async ({ event }) => {
        const { id } = event.data
        await User.findByIdAndDelete(id)
    }
)

// Inngest Function to update user from database
const syncUserUpdation = inngest.createFunction(
    { id: 'update-user-from-clerk' },
    { event: 'clerk/user.updated' },
    async ({ event }) => {
        const { id, first_name, last_name, email_addresses, image_url } = event.data
        const userData = {
            _id: id,
            email: email_addresses[0].email_address,
            name: first_name + ' ' + last_name,
            image: image_url
        }
        await User.findByIdAndUpdate(id, userData)
    }
)

// Inngest Function to cancel booking and releasing seats of show after 10 minutes of booking created if payment is not made
const releaseSeatsAndDeleteBooking = inngest.createFunction(
    { id: 'release-seats-delete-booking' },
    { event: "app/checkpayment" },
    async ({ event, step }) => {
        const tenMinutesLater = new Date(Date.now() + 10 * 60 * 1000);
        await step.sleepUntil('wait-for-10-minutes', tenMinutesLater);

        await step.run('check-payment-status', async () => {
            const bookingId = event.data.bookingId;
            const booking = await Booking.findById(bookingId);

            // If payment is not made, release seats and delete booking
            if(!booking.isPaid){
                const show = await Show.findById(booking.show);
                booking.bookedSeats.forEach((seat) => {
                    delete show.occupiedSeats[seat]
                })
                show.markModified('occupiedSeats')
                await show.save()
                await Booking.findByIdAndDelete(booking._id)
            }
        })
    }
)

// Inngest Function to send email when user books a show
const sendBookingConfirmationEmail = inngest.createFunction(
    { id: "send-booking-confirmation-email" },
    { event: "app/show.booked" },
    async ({ event, step }) => {
        const { bookingId } = event.data;
        const booking = await Booking.findById(bookingId).populate({
            path: 'show',
            populate: { path: "movie", model: "Movie" }
        }).populate('user');

        await sendEmail({
            to: booking.user.email,
            subject: `Payment Confirmation: "${booking.show.movie.title}" booked!`,
            body: `<div style="font-family": Arial, sans-serif; line-height: 1.5;">
                <h2>Hi ${booking.user.name}, </h2>
                <p>Your booking for <strong style="color: #F84565;">"${booking.show.movie.title}"</strong> is confirmed.</p>
                </div>
            `
        })
    }
)

// Inngest Function to send reminders
const sendShowReminders = inngest.createFunction(
    { id: "send-show-reminders"},
    { cron: "0 */8 * * *" }, // Every 8 hours
    async({ step }) => {
        const now = new Date();
        const in8Hours = new Date(now.getTime() + 8 * 60 * 60 * 1000);
        const windowStart = new Date(in8Hours.getTime() - 10 * 60 * 1000);

        // Prepare reminder tasks
        const reminderTasks = await step.run("prepare-reminder-tasks", async () => {
            const shows = await Show.find({
                showTime: { $gte: windowStart, $lte: in8Hours },
            }).populate('movie');
            const tasks = [];
            for(const show of shows){
                if(!show.movie || !show.occupiedSeats) continue ;

                const users = await User.find({ _id: { $in: userIds}}).select("name email");

                for(const user of users){
                    tasks.push({
                        userEmail:user.email,
                        userName: user.name,
                        movieTitle: show.movie.title, 
                        showTime: show.showTime,
                    })
                }
            }
            return tasks;
        })
        if(reminderTasks.length === 0){
            return {sent: 0, message: "No reminders to send"}
        }
        // send reminder emails
        const results = await step.run('send-all-reminders', async() => {
            return await Promise.allSettled(
                reminderTasks.map(task => sendEmail({
                    to: task.userEmail,
                    subject: `Reminder: Your movie "${task.movieTitle}" starts soon!`,
                    body: `<div style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.5', color: '#333' }}>
                    <h2>Hi ${task.userName},</h2>
                    <p>
                        Just a quick reminder! 🎬 Your movie <strong style={{ color: '#F84565' }}>"${task.movieTitle}"</strong> is starting soon.
                    </p>
                    <p>
                        <strong>Showtime:</strong> ${new Date(task.showTime).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}
                    </p>
                    <p>
                        Don’t forget to arrive at the venue a little early to grab your snacks and get comfortable.
                    </p>
                    <p>
                        Enjoy the show! 🍿
                    </p>
                    <p style={{ marginTop: '20px', fontSize: '0.9em', color: '#888' }}>
                        This is an automated reminder. Please do not reply to this email.
                    </p>
                    </div>
                    `
                }))
            )
        })
        const sent = results.filter(r => r.status === "fulfilled").length;
        const failed = results.length - sent;

        return { 
            sent,
            failed,
            message: `Sent ${sent} reminder(s), ${failed} failed`
        }
    }
)

// Inngest function to send notifications when a new show is added
const sendNewShowNotifications = inngest.createFunction(
    { id: "send-new-show-notifications" },
    { event: "app/show.added" },
    async ({ event }) => {
        const { movieTitle } = event.data;

        const users = await User.find({})

        for(const user of users){
            const userEmail = user.email;
            const userName = user.name;

            const subject = `🎬 New Show Added: ${movieTitle}`;
            const body = `<div style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.5', color: '#333' }}>
            <h2>Hi ${userName},</h2>
            <p>
                Exciting news! 🎉 A new show for <strong style={{ color: '#F84565' }}>"${movieTitle}"</strong> has just been added to our schedule.
            </p>
            <p>
                Don’t miss your chance to grab the best seats early and enjoy the experience on the big screen.
            </p>
            <p style={{ marginTop: '20px' }}>
                We can’t wait to see you at the movies! 🍿
            </p>
            <p style={{ fontSize: '0.9em', color: '#888' }}>
                You received this email because you're subscribed to new show updates.
            </p>
            </div>`;

            await sendEmail({
            to: userEmail,
            subject,
            body,
        })
        }
        return {message: "Notifications sent."}
    }
)

export const functions = [
    syncUserCreation, 
    syncUserDeletion,
    syncUserUpdation,
    releaseSeatsAndDeleteBooking,
    sendBookingConfirmationEmail,
    sendShowReminders,
    sendNewShowNotifications
];