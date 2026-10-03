# Jhocel personal site

## Deploy with Render

This project includes a Render Blueprint in `render.yaml`. The Node web service
serves the portfolio and its contact API from the same origin.

1. Push this project to a GitHub repository.
2. Sign in to [Render](https://dashboard.render.com/) and choose **New +
   > Blueprint**.
3. Connect the repository containing this project and select the branch to
   deploy. The project files, including `render.yaml`, should be at the
   repository root.
4. Enter the requested environment variables in Render:
   - `SMTP_USER`: the email account used to send mail.
   - `SMTP_PASS`: an app password or SMTP credential for that account. For
     Gmail, use a Google App Password, not the normal account password.
   - `MAIL_FROM`: the sender address authorized by the SMTP account.
5. Review and apply the Blueprint. Render builds and starts the service and
   checks `/healthz`.
6. Open the deployed `onrender.com` URL and test the Contact Me form.

Keep SMTP credentials in Render's environment settings. Never commit them to
the repository or put them in frontend JavaScript.

To run the site locally, copy `.env.example` to `.env`, set the SMTP values,
then run `npm install` and `npm start`. The site will be available at
`http://localhost:3001` unless `PORT` is set.
