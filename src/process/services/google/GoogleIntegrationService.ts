/**
 * @license
 * Copyright 2025 ThairaAI
 * SPDX-License-Identifier: Apache-2.0
 */

import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import { app, shell } from 'electron';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as http from 'node:http';
import * as net from 'node:net';
import { ProcessConfig } from '@process/utils/initStorage';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/userinfo.email',
];

type GoogleCredentials = {
  clientId: string;
  clientSecret: string;
};

type StoredTokens = {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
  email?: string;
};

export type GmailMessage = {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
};

export type CalendarEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
};

export type CreateEventParams = {
  summary: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
  attendees?: string[];
};

export type GoogleIntegrationStatus = {
  connected: boolean;
  email: string;
  hasCredentials: boolean;
};

export class GoogleIntegrationService {
  private get tokenPath(): string {
    return path.join(app.getPath('userData'), 'google-integration-tokens.json');
  }

  async getCredentials(): Promise<GoogleCredentials | null> {
    const envClientId = process.env.GOOGLE_CLIENT_ID;
    const envClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (envClientId && envClientSecret) {
      return { clientId: envClientId, clientSecret: envClientSecret };
    }

    const config = await ProcessConfig.get('google.integration');
    if (config?.clientId && config?.clientSecret) {
      return { clientId: config.clientId, clientSecret: config.clientSecret };
    }

    return null;
  }

  private async loadTokens(): Promise<StoredTokens | null> {
    try {
      const content = await fs.readFile(this.tokenPath, 'utf-8');
      return JSON.parse(content) as StoredTokens;
    } catch {
      return null;
    }
  }

  private async saveTokens(tokens: StoredTokens): Promise<void> {
    await fs.writeFile(this.tokenPath, JSON.stringify(tokens, null, 2), 'utf-8');
  }

  private createOAuth2Client(creds: GoogleCredentials, redirectUri: string): OAuth2Client {
    return new google.auth.OAuth2(creds.clientId, creds.clientSecret, redirectUri);
  }

  async getStatus(): Promise<GoogleIntegrationStatus> {
    const creds = await this.getCredentials();
    if (!creds) {
      return { connected: false, email: '', hasCredentials: false };
    }

    const tokens = await this.loadTokens();
    if (!tokens?.refresh_token) {
      return { connected: false, email: '', hasCredentials: true };
    }

    return { connected: true, email: tokens.email ?? '', hasCredentials: true };
  }

  private getFreePort(): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = net.createServer();
      server.listen(0, () => {
        const address = server.address();
        const port = typeof address === 'object' && address ? address.port : 0;
        server.close(() => resolve(port));
      });
      server.on('error', reject);
    });
  }

  async connect(): Promise<{ success: boolean; email?: string; error?: string }> {
    const creds = await this.getCredentials();
    if (!creds) {
      return {
        success: false,
        error: 'No Google OAuth credentials configured. Add Client ID and Client Secret in settings.',
      };
    }

    const port = await this.getFreePort();
    const redirectUri = `http://localhost:${port}/oauth2callback`;
    const oauth2Client = this.createOAuth2Client(creds, redirectUri);

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
    });

    return new Promise((resolve) => {
      const server = http.createServer(async (req, res) => {
        const url = new URL(req.url ?? '', `http://localhost:${port}`);
        if (url.pathname !== '/oauth2callback') {
          res.end('Not found');
          return;
        }

        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(
          `<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>${error ? 'Authentication failed' : 'Authentication successful!'}</h2><p>You can close this window.</p><script>window.close();</script></body></html>`
        );
        server.close();

        if (error || !code) {
          resolve({ success: false, error: error ?? 'No authorization code received' });
          return;
        }

        try {
          const { tokens } = await oauth2Client.getToken(code);
          oauth2Client.setCredentials(tokens);

          const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
          const userInfo = await oauth2.userinfo.get();
          const email = userInfo.data.email ?? '';

          await this.saveTokens({ ...tokens, email });
          resolve({ success: true, email });
        } catch (err) {
          resolve({ success: false, error: err instanceof Error ? err.message : String(err) });
        }
      });

      server.listen(port, () => {
        shell.openExternal(authUrl).catch(() => {
          server.close();
          resolve({ success: false, error: 'Failed to open browser' });
        });
      });

      server.on('error', (err: Error) => {
        resolve({ success: false, error: err.message });
      });

      setTimeout(
        () => {
          server.close();
          resolve({ success: false, error: 'Authentication timed out after 5 minutes' });
        },
        5 * 60 * 1000
      );
    });
  }

  async disconnect(): Promise<void> {
    try {
      await fs.unlink(this.tokenPath);
    } catch {
      // token file may not exist
    }
  }

  private async getAuthenticatedClient(): Promise<OAuth2Client | null> {
    const creds = await this.getCredentials();
    if (!creds) return null;

    const tokens = await this.loadTokens();
    if (!tokens?.refresh_token) return null;

    const oauth2Client = this.createOAuth2Client(creds, '');
    oauth2Client.setCredentials(tokens);
    return oauth2Client;
  }

  async listEmails(maxResults = 10): Promise<GmailMessage[]> {
    const auth = await this.getAuthenticatedClient();
    if (!auth) return [];

    const gmail = google.gmail({ version: 'v1', auth });
    const listRes = await gmail.users.messages.list({ userId: 'me', maxResults });
    const messages = listRes.data.messages ?? [];

    return Promise.all(
      messages.map(async (msg) => {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'Date'],
        });
        const headers = detail.data.payload?.headers ?? [];
        const get = (name: string) => headers.find((h) => h.name === name)?.value ?? '';
        return {
          id: msg.id!,
          threadId: msg.threadId!,
          subject: get('Subject'),
          from: get('From'),
          date: get('Date'),
          snippet: detail.data.snippet ?? '',
        };
      })
    );
  }

  async listEvents(maxResults = 10): Promise<CalendarEvent[]> {
    const auth = await this.getAuthenticatedClient();
    if (!auth) return [];

    const calendar = google.calendar({ version: 'v3', auth });
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return (res.data.items ?? []).map((event) => ({
      id: event.id ?? '',
      summary: event.summary ?? '(no title)',
      start: event.start?.dateTime ?? event.start?.date ?? '',
      end: event.end?.dateTime ?? event.end?.date ?? '',
      location: event.location ?? undefined,
      description: event.description ?? undefined,
    }));
  }

  async createEvent(params: CreateEventParams): Promise<CalendarEvent> {
    const auth = await this.getAuthenticatedClient();
    if (!auth) throw new Error('Not connected. Call connect() first.');

    const calendar = google.calendar({ version: 'v3', auth });
    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: params.summary,
        description: params.description,
        location: params.location,
        start: { dateTime: params.start, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        end: { dateTime: params.end, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        attendees: params.attendees?.map((email) => ({ email })),
      },
    });

    const e = res.data;
    return {
      id: e.id ?? '',
      summary: e.summary ?? params.summary,
      start: e.start?.dateTime ?? e.start?.date ?? params.start,
      end: e.end?.dateTime ?? e.end?.date ?? params.end,
      location: e.location ?? undefined,
      description: e.description ?? undefined,
    };
  }

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    const auth = await this.getAuthenticatedClient();
    if (!auth) throw new Error('Not connected. Call connect() first.');

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
  }
}

export const googleIntegrationService = new GoogleIntegrationService();
