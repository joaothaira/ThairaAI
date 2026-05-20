/**
 * @license
 * Copyright 2025 ThairaAI
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Built-in MCP server for Google Calendar and Gmail.
 * Runs as a standalone stdio process. Reads config from environment variables:
 *   AIONUI_USER_DATA_PATH  — app userData directory (for token storage)
 *   GOOGLE_CLIENT_ID       — OAuth client ID
 *   GOOGLE_CLIENT_SECRET   — OAuth client secret
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as http from 'node:http';
import * as net from 'node:net';
import { exec } from 'node:child_process';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/userinfo.email',
];

type StoredTokens = {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
  email?: string;
};

function getTokenPath(): string {
  const userDataPath = process.env.AIONUI_USER_DATA_PATH;
  if (!userDataPath) throw new Error('AIONUI_USER_DATA_PATH env var not set');
  return path.join(userDataPath, 'google-integration-tokens.json');
}

function getCredentials(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

async function loadTokens(): Promise<StoredTokens | null> {
  try {
    const content = await fs.readFile(getTokenPath(), 'utf-8');
    return JSON.parse(content) as StoredTokens;
  } catch {
    return null;
  }
}

async function saveTokens(tokens: StoredTokens): Promise<void> {
  await fs.writeFile(getTokenPath(), JSON.stringify(tokens, null, 2), 'utf-8');
}

async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      server.close((err) => {
        if (err) reject(err);
        else resolve(port);
      });
    });
  });
}

function openBrowser(url: string): void {
  const platform = process.platform;
  const cmd =
    platform === 'darwin' ? `open "${url}"` : platform === 'win32' ? `start "" "${url}"` : `xdg-open "${url}"`;
  exec(cmd);
}

async function getAuthenticatedClient(): Promise<OAuth2Client | null> {
  const creds = getCredentials();
  if (!creds) return null;
  const tokens = await loadTokens();
  if (!tokens?.refresh_token && !tokens?.access_token) return null;

  const client = new google.auth.OAuth2(creds.clientId, creds.clientSecret);
  client.setCredentials(tokens);
  return client;
}

async function main(): Promise<void> {
  const server = new McpServer({
    name: 'aionui-google-integration',
    version: '1.0.0',
  });

  // ─── google_auth_status ────────────────────────────────────────────────────
  server.tool(
    'google_auth_status',
    'Check whether the user has already connected their Google account. Always call this before any Google Calendar or Gmail operation.',
    {},
    async () => {
      const creds = getCredentials();
      if (!creds) {
        return {
          content: [{ type: 'text' as const, text: 'Google OAuth credentials are not configured.' }],
          isError: true,
        };
      }
      const tokens = await loadTokens();
      if (!tokens?.refresh_token && !tokens?.access_token) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'Google account not connected. Call google_connect to start the OAuth flow.',
            },
          ],
        };
      }
      return {
        content: [
          { type: 'text' as const, text: `Google account connected: ${tokens.email ?? '(email unknown)'}` },
        ],
      };
    }
  );

  // ─── google_connect ────────────────────────────────────────────────────────
  server.tool(
    'google_connect',
    "Open the browser for Google OAuth so the user can sign in. Only call this when google_auth_status says the account is not connected.",
    {},
    async () => {
      const creds = getCredentials();
      if (!creds) {
        return {
          content: [{ type: 'text' as const, text: 'Google OAuth credentials are not configured.' }],
          isError: true,
        };
      }

      try {
        const port = await findFreePort();
        const redirectUri = `http://localhost:${port}/callback`;
        const oauth2Client = new google.auth.OAuth2(creds.clientId, creds.clientSecret, redirectUri);

        const authUrl = oauth2Client.generateAuthUrl({
          access_type: 'offline',
          scope: SCOPES,
          prompt: 'consent',
        });

        return await new Promise((resolve) => {
          const httpServer = http.createServer(async (req, res) => {
            if (!req.url?.startsWith('/callback')) return;

            const url = new URL(req.url, `http://localhost:${port}`);
            const code = url.searchParams.get('code');

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<html><body><h2>Connected! You can close this tab.</h2></body></html>');
            httpServer.close();

            if (!code) {
              resolve({ content: [{ type: 'text' as const, text: 'OAuth cancelled — no code received.' }], isError: true });
              return;
            }

            try {
              const { tokens } = await oauth2Client.getToken(code);
              oauth2Client.setCredentials(tokens);

              // Fetch user email
              let email = '';
              try {
                const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
                const info = await oauth2.userinfo.get();
                email = info.data.email ?? '';
              } catch {
                // non-fatal
              }

              await saveTokens({ ...tokens, email });
              resolve({
                content: [{ type: 'text' as const, text: `Google account connected: ${email}` }],
              });
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              resolve({ content: [{ type: 'text' as const, text: `OAuth failed: ${msg}` }], isError: true });
            }
          });

          httpServer.listen(port, () => {
            openBrowser(authUrl);
          });

          // Timeout after 5 minutes
          setTimeout(() => {
            httpServer.close();
            resolve({ content: [{ type: 'text' as const, text: 'OAuth timed out after 5 minutes.' }], isError: true });
          }, 300_000);
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text' as const, text: `Error: ${msg}` }], isError: true };
      }
    }
  );

  // ─── google_list_events ────────────────────────────────────────────────────
  server.tool(
    'google_list_events',
    'Fetch upcoming events from Google Calendar. Requires the user to be connected (check with google_auth_status first).',
    { max_results: z.number().optional().describe('Maximum number of events to return (default 10, max 50)') },
    async ({ max_results }) => {
      try {
        const auth = await getAuthenticatedClient();
        if (!auth) {
          return {
            content: [{ type: 'text' as const, text: 'Not connected. Call google_connect first.' }],
            isError: true,
          };
        }

        const calendar = google.calendar({ version: 'v3', auth });
        const res = await calendar.events.list({
          calendarId: 'primary',
          timeMin: new Date().toISOString(),
          maxResults: Math.min(max_results ?? 10, 50),
          singleEvents: true,
          orderBy: 'startTime',
        });

        const events = res.data.items ?? [];
        if (events.length === 0) {
          return { content: [{ type: 'text' as const, text: 'No upcoming calendar events found.' }] };
        }

        const formatted = events
          .map((e) => {
            const start = e.start?.dateTime ?? e.start?.date ?? '';
            const end = e.end?.dateTime ?? e.end?.date ?? '';
            const loc = e.location ? ` | 📍 ${e.location}` : '';
            return `- **${e.summary ?? '(no title)'}** | ${start} → ${end}${loc}`;
          })
          .join('\n');

        return { content: [{ type: 'text' as const, text: formatted }] };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text' as const, text: `Error: ${msg}` }], isError: true };
      }
    }
  );

  // ─── google_create_event ──────────────────────────────────────────────────
  server.tool(
    'google_create_event',
    'Create a new event in Google Calendar. Always confirm details with the user before calling.',
    {
      summary: z.string().describe('Event title'),
      start: z.string().describe('Start datetime in ISO 8601, e.g. 2026-05-21T08:00:00'),
      end: z.string().describe('End datetime in ISO 8601, e.g. 2026-05-21T09:00:00'),
      description: z.string().optional().describe('Optional event description'),
      location: z.string().optional().describe('Optional location'),
      attendees: z.array(z.string()).optional().describe('Optional list of attendee emails'),
    },
    async ({ summary, start, end, description, location, attendees }) => {
      try {
        const auth = await getAuthenticatedClient();
        if (!auth) {
          return { content: [{ type: 'text' as const, text: 'Not connected. Call google_connect first.' }], isError: true };
        }

        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const calendar = google.calendar({ version: 'v3', auth });
        const res = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: {
            summary,
            description,
            location,
            start: { dateTime: start, timeZone: tz },
            end: { dateTime: end, timeZone: tz },
            attendees: attendees?.map((email) => ({ email })),
          },
        });

        const e = res.data;
        const eStart = e.start?.dateTime ?? e.start?.date ?? start;
        const eEnd = e.end?.dateTime ?? e.end?.date ?? end;
        const loc = e.location ? ` | 📍 ${e.location}` : '';
        return {
          content: [{ type: 'text' as const, text: `Event created: **${e.summary ?? summary}** | ${eStart} → ${eEnd}${loc}` }],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text' as const, text: `Error: ${msg}` }], isError: true };
      }
    }
  );

  // ─── google_send_email ─────────────────────────────────────────────────────
  server.tool(
    'google_send_email',
    'Send an email via Gmail. Always confirm with the user before sending.',
    {
      to: z.string().describe('Recipient email address'),
      subject: z.string().describe('Email subject'),
      body: z.string().describe('Plain text email body'),
    },
    async ({ to, subject, body }) => {
      try {
        const auth = await getAuthenticatedClient();
        if (!auth) {
          return { content: [{ type: 'text' as const, text: 'Not connected. Call google_connect first.' }], isError: true };
        }

        const gmail = google.gmail({ version: 'v1', auth });
        const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`;
        const encodedBody = Buffer.from(body, 'utf-8').toString('base64');
        const message = [
          `To: ${to}`,
          `Subject: ${encodedSubject}`,
          'MIME-Version: 1.0',
          'Content-Type: text/plain; charset=utf-8',
          'Content-Transfer-Encoding: base64',
          '',
          encodedBody,
        ].join('\r\n');
        const encoded = Buffer.from(message).toString('base64url');
        await gmail.users.messages.send({ userId: 'me', requestBody: { raw: encoded } });
        return { content: [{ type: 'text' as const, text: `Email sent to ${to}` }] };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text' as const, text: `Error: ${msg}` }], isError: true };
      }
    }
  );

  // ─── google_list_emails ────────────────────────────────────────────────────
  server.tool(
    'google_list_emails',
    'Fetch recent emails from Gmail. Requires the user to be connected (check with google_auth_status first).',
    { max_results: z.number().optional().describe('Maximum number of emails to return (default 10, max 50)') },
    async ({ max_results }) => {
      try {
        const auth = await getAuthenticatedClient();
        if (!auth) {
          return {
            content: [{ type: 'text' as const, text: 'Not connected. Call google_connect first.' }],
            isError: true,
          };
        }

        const gmail = google.gmail({ version: 'v1', auth });
        const listRes = await gmail.users.messages.list({
          userId: 'me',
          maxResults: Math.min(max_results ?? 10, 50),
        });

        const msgs = listRes.data.messages ?? [];
        if (msgs.length === 0) {
          return { content: [{ type: 'text' as const, text: 'No emails found.' }] };
        }

        const details = await Promise.all(
          msgs.map(async (m) => {
            const detail = await gmail.users.messages.get({ userId: 'me', id: m.id! });
            const headers = detail.data.payload?.headers ?? [];
            const get = (name: string) => headers.find((h) => h.name?.toLowerCase() === name)?.value ?? '';
            return `- **${get('subject') || '(no subject)'}** | From: ${get('from')} | ${get('date')}\n  ${detail.data.snippet ?? ''}`;
          })
        );

        return { content: [{ type: 'text' as const, text: details.join('\n\n') }] };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text' as const, text: `Error: ${msg}` }], isError: true };
      }
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('[GoogleIntegrationMCP] Fatal error:', err);
  process.exit(1);
});
