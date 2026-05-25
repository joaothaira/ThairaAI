/**
 * @license
 * Copyright 2025 ThairaAI
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Express, Request, Response } from 'express';
import { apiRateLimiter } from '../middleware/security';
import { getActiveWhatsAppPlugin } from '@process/channels/plugins/whatsapp/WhatsAppPlugin';
import type { WhatsAppWebhookPayload } from '@process/channels/plugins/whatsapp/WhatsAppAdapter';

const WHATSAPP_WEBHOOK_PATH = '/channels/whatsapp/webhook';

export function registerWhatsAppChannelRoutes(app: Express): void {
  app.post(WHATSAPP_WEBHOOK_PATH, apiRateLimiter, whatsappWebhookHandler);
}

async function whatsappWebhookHandler(req: Request, res: Response): Promise<void> {
  // Respond immediately — whatsapp-api does not wait for our processing
  res.status(200).json({ ok: true });

  const plugin = getActiveWhatsAppPlugin();
  const body = req.body as WhatsAppWebhookPayload;
  const event = typeof body.event === 'string' ? body.event : '';

  console.log('[WhatsAppWebhook] received event=%s hasPlugin=%s isRunning=%s', event, !!plugin, plugin?.isRunning());

  if (!plugin || !plugin.isRunning()) return;

  if (event === 'messages.upsert') {
    void plugin.handleInboundWebhook(body).catch((err) => {
      console.error('[WhatsAppWebhook] handleInboundWebhook failed:', err);
    });
  } else if (event === 'connection.update') {
    plugin.handleConnectionUpdate(body);
  }
}
