const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const { app, createApp } = require("../server");

let server;
let baseUrl;

async function startServer(application) {
    const server = application.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    return {
        server,
        baseUrl: `http://127.0.0.1:${server.address().port}`
    };
}

before(async () => {
    ({ server, baseUrl } = await startServer(app));
});

after(async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
    });
});

test("serves the portfolio page", async () => {
    const response = await fetch(baseUrl);

    assert.equal(response.status, 200);
    assert.match(await response.text(), /id="contactForm"/);
});

test("provides a healthy Render health-check response", async () => {
    const response = await fetch(`${baseUrl}/healthz`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok" });
});

test("allows the GitHub Pages site to submit cross-origin contact requests", async () => {
    const response = await fetch(`${baseUrl}/api/contact`, {
        method: "OPTIONS",
        headers: {
            Origin: "https://jhocelbduga.github.io",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type"
        }
    });

    assert.equal(response.status, 204);
    assert.equal(response.headers.get("access-control-allow-origin"), "https://jhocelbduga.github.io");
    assert.equal(response.headers.get("access-control-allow-methods"), "POST");
});

test("does not expose backend source or configuration files", async () => {
    const [serverSource, packageManifest] = await Promise.all([
        fetch(`${baseUrl}/server.js`),
        fetch(`${baseUrl}/package.json`)
    ]);

    assert.equal(serverSource.status, 404);
    assert.equal(packageManifest.status, 404);
});

test("rejects invalid contact data", async () => {
    const response = await fetch(`${baseUrl}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Visitor" })
    });

    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /valid name, email, phone number, and message/);
});

test("reports an explicit configuration error when SMTP is not configured", async () => {
    const response = await fetch(`${baseUrl}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: "Visitor",
            email: "visitor@example.com",
            phone: "555-0100",
            message: "Hello"
        })
    });

    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /not configured/);
});

test("sends valid contact details to the configured recipient", async () => {
    let deliveredMessage;
    const testApp = createApp({
        mailer: {
            async sendMail(message) {
                deliveredMessage = message;
            }
        },
        recipient: "owner@example.com"
    });
    const testServer = await startServer(testApp);

    try {
        const response = await fetch(`${testServer.baseUrl}/api/contact`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "Visitor",
                email: "visitor@example.com",
                phone: "555-0100",
                message: "Hello there"
            })
        });

        assert.equal(response.status, 200);
        assert.match((await response.json()).message, /has been sent/);
        assert.equal(deliveredMessage.to, "owner@example.com");
        assert.equal(deliveredMessage.replyTo, "visitor@example.com");
        assert.match(deliveredMessage.text, /Hello there/);
    } finally {
        testServer.server.closeAllConnections();
        await new Promise((resolve, reject) => {
            testServer.server.close((error) => error ? reject(error) : resolve());
        });
    }
});
