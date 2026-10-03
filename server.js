require("dotenv").config();

const path = require("node:path");
const express = require("express");
const nodemailer = require("nodemailer");
const { rateLimit } = require("express-rate-limit");

const port = Number(process.env.PORT) || 3001;
const smtpPort = Number(process.env.SMTP_PORT) || 587;
const contactRecipient = process.env.CONTACT_TO || "jhocelbduga@gmail.com";
const smtpConfigured = Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.MAIL_FROM
);

const mailer = smtpConfigured
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: smtpPort,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    })
    : null;

function createApp(options = {}) {
    const app = express();
    const contactMailer = options.mailer === undefined ? mailer : options.mailer;
    const recipient = options.recipient || contactRecipient;

    app.disable("x-powered-by");
    app.use((request, response, next) => {
        const allowedOrigin = "https://jhocelbduga.github.io";

        if (request.get("Origin") === allowedOrigin) {
            response.set("Access-Control-Allow-Origin", allowedOrigin);
            response.set("Vary", "Origin");

            if (request.method === "OPTIONS") {
                response.set("Access-Control-Allow-Methods", "POST");
                response.set("Access-Control-Allow-Headers", "Content-Type");
                return response.sendStatus(204);
            }
        }

        return next();
    });
    app.use(express.json({ limit: "10kb" }));
    app.use("/api/contact", rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 5,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        message: { error: "Too many messages sent. Please try again later." }
    }));

    app.get("/healthz", (request, response) => {
        response.status(200).json({ status: "ok" });
    });

    app.post("/api/contact", async (request, response) => {
        const contact = validateContact(request.body);

        if (!contact) {
            return response.status(400).json({
                error: "Please provide a valid name, email, phone number, and message."
            });
        }

        if (!contactMailer) {
            return response.status(503).json({
                error: "The contact service is not configured yet. Please try again later."
            });
        }

        try {
            await contactMailer.sendMail({
                from: process.env.MAIL_FROM || "website-contact@example.invalid",
                to: recipient,
                replyTo: contact.email,
                subject: "Website contact form message",
                text: [
                    `Name: ${contact.name}`,
                    `Email: ${contact.email}`,
                    `Phone: ${contact.phone}`,
                    "",
                    contact.message
                ].join("\n")
            });

            return response.status(200).json({ message: "Your message has been sent. Thank you!" });
        } catch (error) {
            console.error("Contact email delivery failed.", error && error.code ? { code: error.code } : {});
            return response.status(500).json({
                error: "We could not send your message right now. Please try again later."
            });
        }
    });

    app.get("/", (request, response) => {
        response.sendFile(path.join(__dirname, "index.html"));
    });
    for (const directory of ["assets", "css", "js"]) {
        app.use(`/${directory}`, express.static(path.join(__dirname, directory)));
    }

    return app;
}

function validateContact(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return null;
    }

    const fields = ["name", "email", "phone", "message"];

    if (fields.some((field) => typeof body[field] !== "string")) {
        return null;
    }

    const contact = Object.fromEntries(
        fields.map((field) => [field, body[field].trim()])
    );

    if (
        !contact.name ||
        contact.name.length > 100 ||
        !contact.email ||
        contact.email.length > 254 ||
        !/^[^\s@<>]+@[^\s@<>.]+(?:\.[^\s@<>.]+)+$/.test(contact.email) ||
        !contact.phone ||
        contact.phone.length > 40 ||
        !contact.message ||
        contact.message.length > 5000
    ) {
        return null;
    }

    return contact;
}

const app = createApp();

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Contact site listening on http://localhost:${port}`);
        if (!smtpConfigured) {
            console.warn("Email delivery is disabled until SMTP settings are configured.");
        }
    });
}

module.exports = { app, createApp, validateContact };
