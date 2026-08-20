require('dotenv').config();

const crypto = require('crypto');
const express = require('express');
const app = express();

const {
    CLIENT_ID,
    CLIENT_SECRET,
    HACKCLUB_REDIRECT_URI = 'http://localhost:3000/auth/callback',
} = process.env;

app.use(express.static('public'));

function parseCookies(req) {
    const header = req.headers.cookie;
    const cookies = {};
    if (!header) return cookies;
    header.split(';').forEach((pair) => {
        const index = pair.indexOf('=');
        if (index < 0) return;
        const key = pair.slice(0, index).trim();
        const value = pair.slice(index + 1).trim();
        cookies[key] = decodeURIComponent(value);
    });
    return cookies;
}

// start hc auth flow
app.get('/auth/hackclub', (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');

    res.setHeader('Set-Cookie', `hackclub_oauth_state=${state}; HttpOnly; Path=/; Max-Age=300; SameSite=Lax`);

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: CLIENT_ID,
        redirect_uri: HACKCLUB_REDIRECT_URI,
        scope: 'openid profile email slack_id verification_status',
        state,
    });

    res.redirect(`https://auth.hackclub.com/oauth/authorize?${params.toString()}`);
});

// redirect post-auth
app.get('/callback', async (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
        return res.status(400).send(`Hack Club auth failed: ${error}`);
    }

    const cookies = parseCookies(req);
    if (!state || state !== cookies.hackclub_oauth_state) {
        return res.status(400).send('Invalid or missing state parameter.');
    }

    try {
        const tokenRes = await fetch('https://auth.hackclub.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                redirect_uri: HACKCLUB_REDIRECT_URI,
                code,
                grant_type: 'authorization_code',
            }),
        });
        const tokenData = await tokenRes.json();

        if (!tokenRes.ok) {
            return res.status(400).send(`Hack Club token exchange failed: ${tokenData.error || tokenRes.statusText}`);
        }

        const meRes = await fetch('https://auth.hackclub.com/api/v1/me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const { identity } = await meRes.json();

        res.setHeader('Set-Cookie', 'hackclub_oauth_state=; HttpOnly; Path=/; Max-Age=0');

        console.log('Signed in with Hack Club Auth:', identity.primary_email, identity.slack_id, identity.verification_status);

        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send('Something went wrong during Hack Club auth.');
    }
});

app.listen(3000, () => {
    console.log('server running @ localhost port 3000! awesome');
});
