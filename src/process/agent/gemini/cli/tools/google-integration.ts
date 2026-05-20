/**
 * @license
 * Copyright 2025 ThairaAI
 * SPDX-License-Identifier: Apache-2.0
 */

import { Type } from '@google/genai';
import type { ToolResult, ToolInvocation, ToolLocation, ToolCallConfirmationDetails, MessageBus } from '@office-ai/aioncli-core';
import { BaseDeclarativeTool, BaseToolInvocation, Kind, ToolErrorType } from '@office-ai/aioncli-core';
import { googleIntegrationService } from '@process/services/google/GoogleIntegrationService';
import type { CreateEventParams } from '@process/services/google/GoogleIntegrationService';

// ─── google_auth_status ───────────────────────────────────────────────────────

export class GoogleAuthStatusTool extends BaseDeclarativeTool<Record<string, never>, ToolResult> {
  static readonly Name = 'google_auth_status';

  constructor(messageBus: MessageBus) {
    super(
      GoogleAuthStatusTool.Name,
      'Check Google Auth',
      'Check whether the user has already connected their Google account. Returns connection status and email. Always call this before any Google Calendar or Gmail operation.',
      Kind.Other,
      { type: Type.OBJECT, properties: {}, required: [] },
      messageBus,
      false,
      false
    );
  }

  protected createInvocation(params: Record<string, never>, messageBus: MessageBus): ToolInvocation<Record<string, never>, ToolResult> {
    return new GoogleAuthStatusInvocation(params, messageBus);
  }
}

class GoogleAuthStatusInvocation extends BaseToolInvocation<Record<string, never>, ToolResult> {
  getDescription(): string { return 'Checking Google connection status…'; }
  override toolLocations(): ToolLocation[] { return []; }
  override async shouldConfirmExecute(): Promise<ToolCallConfirmationDetails | false> { return false; }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    try {
      const status = await googleIntegrationService.getStatus();
      if (status.connected) {
        return {
          llmContent: `Google account connected: ${status.email}`,
          returnDisplay: `Connected as ${status.email}`,
        };
      }
      if (!status.hasCredentials) {
        return {
          llmContent: 'Google OAuth credentials are not configured. The app administrator must set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
          returnDisplay: 'Google credentials not configured.',
        };
      }
      return {
        llmContent: 'Google account not connected. Call google_connect to start the OAuth flow.',
        returnDisplay: 'Not connected.',
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { llmContent: `Error: ${msg}`, returnDisplay: `Error: ${msg}`, error: { message: msg, type: ToolErrorType.EXECUTION_FAILED } };
    }
  }
}

// ─── google_connect ───────────────────────────────────────────────────────────

export class GoogleConnectTool extends BaseDeclarativeTool<Record<string, never>, ToolResult> {
  static readonly Name = 'google_connect';

  constructor(messageBus: MessageBus) {
    super(
      GoogleConnectTool.Name,
      'Connect Google Account',
      "Open the browser for Google OAuth so the user can sign in. Only call this when google_auth_status says the account is not connected.",
      Kind.Other,
      { type: Type.OBJECT, properties: {}, required: [] },
      messageBus,
      false,
      false
    );
  }

  protected createInvocation(params: Record<string, never>, messageBus: MessageBus): ToolInvocation<Record<string, never>, ToolResult> {
    return new GoogleConnectInvocation(params, messageBus);
  }
}

class GoogleConnectInvocation extends BaseToolInvocation<Record<string, never>, ToolResult> {
  getDescription(): string { return 'Opening Google sign-in…'; }
  override toolLocations(): ToolLocation[] { return []; }
  override async shouldConfirmExecute(): Promise<ToolCallConfirmationDetails | false> { return false; }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    try {
      const result = await googleIntegrationService.connect();
      if (result.success) {
        return {
          llmContent: `Google account connected successfully: ${result.email}`,
          returnDisplay: `Signed in as ${result.email}`,
        };
      }
      return {
        llmContent: `Google sign-in failed: ${result.error}`,
        returnDisplay: `Sign-in failed: ${result.error}`,
        error: { message: result.error ?? 'Unknown error', type: ToolErrorType.EXECUTION_FAILED },
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { llmContent: `Error: ${msg}`, returnDisplay: `Error: ${msg}`, error: { message: msg, type: ToolErrorType.EXECUTION_FAILED } };
    }
  }
}

// ─── google_list_events ───────────────────────────────────────────────────────

type ListEventsParams = { max_results?: number };

export class GoogleListEventsTool extends BaseDeclarativeTool<ListEventsParams, ToolResult> {
  static readonly Name = 'google_list_events';

  constructor(messageBus: MessageBus) {
    super(
      GoogleListEventsTool.Name,
      'List Calendar Events',
      'Fetch upcoming events from Google Calendar. Requires the user to be connected (check with google_auth_status first).',
      Kind.Other,
      {
        type: Type.OBJECT,
        properties: {
          max_results: { type: Type.NUMBER, description: 'Maximum number of events to return (default 10, max 50)' },
        },
        required: [],
      },
      messageBus,
      true,
      false
    );
  }

  protected createInvocation(params: ListEventsParams, messageBus: MessageBus): ToolInvocation<ListEventsParams, ToolResult> {
    return new GoogleListEventsInvocation(params, messageBus);
  }
}

class GoogleListEventsInvocation extends BaseToolInvocation<ListEventsParams, ToolResult> {
  getDescription(): string { return 'Fetching calendar events…'; }
  override toolLocations(): ToolLocation[] { return []; }
  override async shouldConfirmExecute(): Promise<ToolCallConfirmationDetails | false> { return false; }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    try {
      const events = await googleIntegrationService.listEvents(Math.min(this.params.max_results ?? 10, 50));
      if (events.length === 0) {
        return { llmContent: 'No upcoming calendar events found.', returnDisplay: 'No events found.' };
      }
      const formatted = events
        .map((e) => `- **${e.summary}** | ${e.start} → ${e.end}${e.location ? ` | 📍 ${e.location}` : ''}`)
        .join('\n');
      return { llmContent: formatted, returnDisplay: formatted };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { llmContent: `Error: ${msg}`, returnDisplay: `Error: ${msg}`, error: { message: msg, type: ToolErrorType.EXECUTION_FAILED } };
    }
  }
}

// ─── google_list_emails ───────────────────────────────────────────────────────

type ListEmailsParams = { max_results?: number };

export class GoogleListEmailsTool extends BaseDeclarativeTool<ListEmailsParams, ToolResult> {
  static readonly Name = 'google_list_emails';

  constructor(messageBus: MessageBus) {
    super(
      GoogleListEmailsTool.Name,
      'List Gmail Messages',
      'Fetch recent emails from Gmail. Requires the user to be connected (check with google_auth_status first).',
      Kind.Other,
      {
        type: Type.OBJECT,
        properties: {
          max_results: { type: Type.NUMBER, description: 'Maximum number of emails to return (default 10, max 50)' },
        },
        required: [],
      },
      messageBus,
      true,
      false
    );
  }

  protected createInvocation(params: ListEmailsParams, messageBus: MessageBus): ToolInvocation<ListEmailsParams, ToolResult> {
    return new GoogleListEmailsInvocation(params, messageBus);
  }
}

class GoogleListEmailsInvocation extends BaseToolInvocation<ListEmailsParams, ToolResult> {
  getDescription(): string { return 'Fetching Gmail messages…'; }
  override toolLocations(): ToolLocation[] { return []; }
  override async shouldConfirmExecute(): Promise<ToolCallConfirmationDetails | false> { return false; }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    try {
      const messages = await googleIntegrationService.listEmails(Math.min(this.params.max_results ?? 10, 50));
      if (messages.length === 0) {
        return { llmContent: 'No emails found.', returnDisplay: 'No emails found.' };
      }
      const formatted = messages
        .map((m) => `- **${m.subject}** | From: ${m.from} | ${m.date}\n  ${m.snippet}`)
        .join('\n\n');
      return { llmContent: formatted, returnDisplay: formatted };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { llmContent: `Error: ${msg}`, returnDisplay: `Error: ${msg}`, error: { message: msg, type: ToolErrorType.EXECUTION_FAILED } };
    }
  }
}

// ─── google_create_event ──────────────────────────────────────────────────────

export class GoogleCreateEventTool extends BaseDeclarativeTool<CreateEventParams, ToolResult> {
  static readonly Name = 'google_create_event';

  constructor(messageBus: MessageBus) {
    super(
      GoogleCreateEventTool.Name,
      'Create Calendar Event',
      'Create a new event in Google Calendar. Always confirm details with the user before calling.',
      Kind.Other,
      {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING, description: 'Event title' },
          start: { type: Type.STRING, description: 'Start datetime in ISO 8601, e.g. 2026-05-21T08:00:00' },
          end: { type: Type.STRING, description: 'End datetime in ISO 8601, e.g. 2026-05-21T09:00:00' },
          description: { type: Type.STRING, description: 'Optional event description' },
          location: { type: Type.STRING, description: 'Optional location' },
          attendees: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Optional list of attendee emails' },
        },
        required: ['summary', 'start', 'end'],
      },
      messageBus,
      false,
      false
    );
  }

  protected createInvocation(params: CreateEventParams, messageBus: MessageBus): ToolInvocation<CreateEventParams, ToolResult> {
    return new GoogleCreateEventInvocation(params, messageBus);
  }
}

class GoogleCreateEventInvocation extends BaseToolInvocation<CreateEventParams, ToolResult> {
  getDescription(): string { return `Creating event "${this.params.summary}"…`; }
  override toolLocations(): ToolLocation[] { return []; }
  override async shouldConfirmExecute(): Promise<ToolCallConfirmationDetails | false> { return false; }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    try {
      const event = await googleIntegrationService.createEvent(this.params);
      const result = `Event created: **${event.summary}** | ${event.start} → ${event.end}${event.location ? ` | 📍 ${event.location}` : ''}`;
      return { llmContent: result, returnDisplay: result };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { llmContent: `Error: ${msg}`, returnDisplay: `Error: ${msg}`, error: { message: msg, type: ToolErrorType.EXECUTION_FAILED } };
    }
  }
}

// ─── google_send_email ────────────────────────────────────────────────────────

type SendEmailParams = { to: string; subject: string; body: string };

export class GoogleSendEmailTool extends BaseDeclarativeTool<SendEmailParams, ToolResult> {
  static readonly Name = 'google_send_email';

  constructor(messageBus: MessageBus) {
    super(
      GoogleSendEmailTool.Name,
      'Send Gmail',
      'Send an email via Gmail. Always confirm with the user before sending.',
      Kind.Other,
      {
        type: Type.OBJECT,
        properties: {
          to: { type: Type.STRING, description: 'Recipient email address' },
          subject: { type: Type.STRING, description: 'Email subject' },
          body: { type: Type.STRING, description: 'Plain text email body' },
        },
        required: ['to', 'subject', 'body'],
      },
      messageBus,
      false,
      false
    );
  }

  protected createInvocation(params: SendEmailParams, messageBus: MessageBus): ToolInvocation<SendEmailParams, ToolResult> {
    return new GoogleSendEmailInvocation(params, messageBus);
  }
}

class GoogleSendEmailInvocation extends BaseToolInvocation<SendEmailParams, ToolResult> {
  getDescription(): string { return `Sending email to ${this.params.to}…`; }
  override toolLocations(): ToolLocation[] { return []; }
  override async shouldConfirmExecute(): Promise<ToolCallConfirmationDetails | false> { return false; }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    try {
      await googleIntegrationService.sendEmail(this.params.to, this.params.subject, this.params.body);
      return { llmContent: `Email sent to ${this.params.to}`, returnDisplay: `Email sent to ${this.params.to}` };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { llmContent: `Error: ${msg}`, returnDisplay: `Error: ${msg}`, error: { message: msg, type: ToolErrorType.EXECUTION_FAILED } };
    }
  }
}
