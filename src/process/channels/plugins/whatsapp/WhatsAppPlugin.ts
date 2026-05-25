/**
 * @license
 * Copyright 2025 ThairaAI
 * SPDX-License-Identifier: Apache-2.0
 */

import { BasePlugin } from '../BasePlugin';
import { toUnifiedIncomingMessage, type WhatsAppWebhookPayload } from './WhatsAppAdapter';
import type { IChannelPluginConfig, IUnifiedOutgoingMessage, PluginType } from '../../types';
import { SERVER_CONFIG } from '@process/webserver/config/constants';
import { getWebServerInstance, setWebServerInstance } from '@process/bridge/webuiBridge';
import { startWebServerWithInstance } from '@process/webserver';
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

const WHATSAPP_WEBHOOK_PATH = '/channels/whatsapp/webhook';

let _activePlugin: WhatsAppPlugin | null = null;

export function setActiveWhatsAppPlugin(plugin: WhatsAppPlugin | null): void {
  _activePlugin = plugin;
}

export function getActiveWhatsAppPlugin(): WhatsAppPlugin | null {
  return _activePlugin;
}

export class WhatsAppPlugin extends BasePlugin {
  readonly type: PluginType = 'whatsapp';

  private serverUrl = '';
  private instanceName = '';
  private apiKey = '';
  private jwtToken = ''; // resolved at start via apiKey
  private readonly activeUsers = new Set<string>();
  // Tracks chats where "⏳ Thinking..." was sent but final reply not yet delivered.
  // Used to suppress intermediate status messages (e.g. "⏳ claude") from leaking as new WA messages.
  private readonly thinkingChats = new Set<string>();

  isRunning(): boolean {
    return this._status === 'running';
  }

  // Reads AUTHENTICATION_GLOBAL_AUTH_TOKEN from sibling whatsapp-api .env files.
  private discoverApiKey(): string {
    const appRoot = app.getAppPath();
    const candidates = [
      path.join(appRoot, '..', 'whatsapp-api', '.env'),
      path.join(appRoot, '..', 'codechat-api', '.env'),
      path.join(process.cwd(), '..', 'whatsapp-api', '.env'),
    ];
    for (const p of candidates) {
      try {
        const content = fs.readFileSync(p, 'utf8');
        const m = content.match(/^AUTHENTICATION_GLOBAL_AUTH_TOKEN=(.+)$/m);
        if (m?.[1]) {
          console.log(`[WhatsAppPlugin] Auto-discovered API key from ${p}`);
          return m[1].trim();
        }
      } catch {
        // file not found — try next
      }
    }
    return '';
  }

  protected async onInitialize(config: IChannelPluginConfig): Promise<void> {
    const serverUrl = config.credentials?.serverUrl?.toString().trim() || 'http://localhost:8084';
    const instanceName = config.credentials?.instanceName?.toString().trim() || 'thairaai';
    const apiKey = config.credentials?.apiKey?.toString().trim() || this.discoverApiKey();

    if (!apiKey) throw new Error('WhatsApp: Global API Key not found. Enter it in settings or place whatsapp-api adjacent to this app.');

    this.serverUrl = serverUrl;
    this.instanceName = instanceName;
    this.apiKey = apiKey;
  }

  // Creates the instance if not exists; returns its JWT either way.
  private async fetchOrCreateJwt(): Promise<string> {
    const headers = { 'content-type': 'application/json', apikey: this.apiKey };

    const createResp = await fetch(`${this.serverUrl}/instance/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ instanceName: this.instanceName }),
    });

    if (createResp.ok) {
      const body = (await createResp.json()) as { Auth?: { token?: string } };
      const token = body.Auth?.token;
      if (!token) throw new Error('WhatsApp: instance created but no JWT in response');
      console.log(`[WhatsAppPlugin] Instance created: ${this.instanceName}`);
      return token;
    }

    // 400 "already exists" — fetch the existing instance to get its JWT
    const errBody = (await createResp.json().catch(() => ({}))) as { message?: string | string[]; error?: string };
    const msgRaw = errBody.message ?? errBody.error ?? '';
    const msg = (Array.isArray(msgRaw) ? msgRaw.join(' ') : String(msgRaw)).toLowerCase();
    // 400 = "already exists" (from service), 403 = "already in use" (from InstanceGuard when connected)
    const alreadyExists = msg.includes('already exists') || msg.includes('already in use');
    if ((createResp.status === 400 || createResp.status === 403) && alreadyExists) {
      const fetchResp = await fetch(
        `${this.serverUrl}/instance/fetchInstances?instanceName=${encodeURIComponent(this.instanceName)}`,
        { headers: { apikey: this.apiKey } },
      );
      if (!fetchResp.ok) {
        throw new Error(`WhatsApp: failed to fetch instance JWT: HTTP ${fetchResp.status}`);
      }
      const instances = (await fetchResp.json()) as Array<{ Auth?: { token?: string } }>;
      const token = instances[0]?.Auth?.token;
      if (!token) throw new Error('WhatsApp: instance exists but JWT not found — check DB');
      return token;
    }

    throw new Error(
      `WhatsApp: failed to create instance: HTTP ${createResp.status} ${JSON.stringify(errBody)}`,
    );
  }

  private async ensureWebServerRunning(): Promise<void> {
    if (getWebServerInstance()) return;
    const instance = await startWebServerWithInstance(SERVER_CONFIG.DEFAULT_PORT, false);
    setWebServerInstance(instance);
    console.log(`[WhatsAppPlugin] Auto-started webserver on port ${instance.port}`);
  }

  protected async onStart(): Promise<void> {
    setActiveWhatsAppPlugin(this);

    await this.ensureWebServerRunning();

    this.jwtToken = await this.fetchOrCreateJwt();

    const webhookUrl = `${SERVER_CONFIG.BASE_URL}${WHATSAPP_WEBHOOK_PATH}`;

    const response = await fetch(`${this.serverUrl}/webhook/set/${this.instanceName}`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.jwtToken}`,
      },
      body: JSON.stringify({
        url: webhookUrl,
        enabled: true,
        events: { messagesUpsert: true, connectionUpdated: true },
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`WhatsApp: webhook registration failed: HTTP ${response.status} ${body}`.trim());
    }

    console.log(`[WhatsAppPlugin] Webhook registered: ${webhookUrl}`);
  }

  protected async onStop(): Promise<void> {
    setActiveWhatsAppPlugin(null);
    this.activeUsers.clear();
    this.thinkingChats.clear();

    if (!this.jwtToken) return;

    fetch(`${this.serverUrl}/webhook/set/${this.instanceName}`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.jwtToken}`,
      },
      body: JSON.stringify({ enabled: false }),
    }).catch((err) => {
      console.warn('[WhatsAppPlugin] Webhook deregistration failed (non-fatal):', err);
    });
  }

  async sendMessage(chatId: string, message: IUnifiedOutgoingMessage): Promise<string> {
    // Strip HTML tags — WhatsApp renders plain text only
    const text = (message.text || '').replace(/<[^>]*>/g, '').trim();
    if (!text) return `whatsapp-empty-${Date.now()}`;

    const isThinkingMsg = text === '⏳ Thinking...';
    const isStatusMsg = text.startsWith('⏳') && !isThinkingMsg;

    if (isStatusMsg && this.thinkingChats.has(chatId)) {
      console.log('[WhatsAppPlugin] Suppressing intermediate status for chatId=%s: %s', chatId, text);
      return `whatsapp-suppressed-${Date.now()}`;
    }

    if (isThinkingMsg) {
      this.thinkingChats.add(chatId);
    } else if (!text.startsWith('⏳')) {
      this.thinkingChats.delete(chatId);
    }

    console.log('[WhatsAppPlugin] sendMessage → chatId=%s textLen=%d', chatId, text.length);

    const response = await fetch(`${this.serverUrl}/message/sendText/${this.instanceName}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.jwtToken}`,
      },
      body: JSON.stringify({
        number: chatId,
        textMessage: { text },
        options: { delay: 1000 },
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error('[WhatsAppPlugin] sendMessage failed: HTTP %d %s', response.status, body);
      throw new Error(`WhatsApp: sendMessage failed: HTTP ${response.status} ${body}`.trim());
    }

    const result = (await response.json()) as { key?: { id?: string } };
    const msgId = result?.key?.id || `whatsapp-msg-${Date.now()}`;
    console.log('[WhatsAppPlugin] sendMessage ✓ msgId=%s', msgId);
    return msgId;
  }

  async editMessage(_chatId: string, _messageId: string, message: IUnifiedOutgoingMessage): Promise<void> {
    // WhatsApp cannot edit messages — only send on stream_end (replyMarkup set).
    if (!message.replyMarkup) return;
    await this.sendMessage(_chatId, message);
  }

  async handleInboundWebhook(body: WhatsAppWebhookPayload): Promise<void> {
    console.log('[WhatsAppPlugin] handleInboundWebhook called, event:', body.event, 'hasHandler:', !!this.messageHandler);

    if (!this.messageHandler) {
      console.warn('[WhatsAppPlugin] No messageHandler set — dropping message');
      return;
    }

    const data = body.data;
    if (!data) {
      console.warn('[WhatsAppPlugin] No data in webhook body');
      return;
    }

    console.log('[WhatsAppPlugin] data fields: keyId=%s keyFromMe=%s keyRemoteJid=%s messageType=%s infoType=%s',
      data.keyId, data.keyFromMe, data.keyRemoteJid, data.messageType, data.info?.type);

    // Skip historical/synced messages — only handle real-time events
    if (data.info?.type && data.info.type !== 'notify') {
      console.log('[WhatsAppPlugin] Skipping non-notify message (type=%s)', data.info.type);
      return;
    }

    const unified = toUnifiedIncomingMessage(data);
    if (!unified) {
      console.log('[WhatsAppPlugin] toUnifiedIncomingMessage returned null (fromMe=%s)', data.keyFromMe);
      return;
    }

    console.log('[WhatsAppPlugin] Dispatching message from %s chatId=%s text=%s', unified.user.id, unified.chatId, unified.content.text?.substring(0, 50));
    this.activeUsers.add(unified.user.id);
    void this.messageHandler(unified).catch((err) => {
      console.error('[WhatsAppPlugin] messageHandler failed:', err);
    });
  }

  handleConnectionUpdate(body: WhatsAppWebhookPayload): void {
    const state = (body.data as Record<string, unknown> | undefined)?.state;
    console.log(`[WhatsAppPlugin] connectionUpdated: state=${state || 'unknown'}`);
  }

  getActiveUserCount(): number {
    return this.activeUsers.size;
  }

  getBotInfo(): { displayName: string } {
    return { displayName: `WhatsApp (${this.instanceName})` };
  }
}
