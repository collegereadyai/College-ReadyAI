// College ReadyAI — a guardian-message relay for testing. Development only.
//
//   node tests/notify-relay.mjs            # listens on 8788
//   node tests/notify-relay.mjs 9000       # or a port you pick
//
// Point GUARDIAN_NOTIFY_URL at it and sign up as a 13-17-year-old. The message
// the guardian would have received is printed here, with the approval link
// pulled out ready to paste.
//
// Use this instead of a public request-bin service. That link is the approval:
// anyone who holds it can open the account, so it must not be posted to a
// third-party inbox you do not control.
//
// It is not a mail provider and does not send anything. When you are ready to
// send real mail, point GUARDIAN_NOTIFY_URL at your provider or your own relay
// — see "The notify contract" in README-backend.md.

import { createServer } from 'node:http';

const PORT = Number(process.argv[2]) || 8788;
const TOKEN = process.env.GUARDIAN_NOTIFY_TOKEN || '';

let count = 0;

const server = createServer((req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'content-type': 'text/plain' });
    res.end('POST only. This is the guardian relay for local testing.\n');
    return;
  }

  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > 100_000) req.destroy();
  });

  req.on('end', () => {
    if (TOKEN) {
      const sent = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      if (sent !== TOKEN) {
        console.log('\n  refused a message with the wrong bearer token\n');
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end('{"error":"bad token"}');
        return;
      }
    }

    let message;
    try {
      message = JSON.parse(body);
    } catch {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end('{"error":"not json"}');
      return;
    }

    count += 1;
    const link = (message.text || '').match(/https?:\/\/\S+/)?.[0] || '(no link found)';

    console.log(`\n${'='.repeat(72)}`);
    console.log(`  message ${count}  ·  ${message.channel}  ·  to ${message.to}`);
    if (message.channel === 'email') console.log(`  subject: ${message.subject}`);
    console.log('='.repeat(72));
    console.log(message.text);
    console.log('-'.repeat(72));
    console.log('  APPROVAL LINK:\n  ' + link);
    console.log('='.repeat(72) + '\n');

    res.writeHead(200, { 'content-type': 'application/json' });
    res.end('{"ok":true}');
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  Guardian relay listening on http://127.0.0.1:${PORT}`);
  console.log('  Development only — it prints messages, it does not send them.');
  console.log(TOKEN ? '  Checking the bearer token.\n' : '  No GUARDIAN_NOTIFY_TOKEN set, so any caller is accepted.\n');
});
