/**
 * @license
 * Copyright 2025 ThairaAI
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IUnifiedIncomingMessage, MessageContentType } from '../../types';

// Flattened Prisma Message sent by whatsapp-api per messages.upsert event
export type WhatsAppMessageRaw = {
  keyId: string;
  keyFromMe: boolean;
  pushName?: string;
  keyRemoteJid: string;
  keyParticipant?: string; // group sender JID
  messageType: string; // 'conversation' | 'extendedTextMessage' | 'imageMessage' | ...
  content: Record<string, unknown>; // { text?: string; caption?: string; ... }
  messageTimestamp: number;
  instanceId: string;
  isGroup: boolean;
  info?: { type?: string }; // type: 'notify' = real-time, 'append' = historical
  media?: { path: string };
};

export type WhatsAppWebhookPayload = {
  event: string;
  instance?: { name: string };
  data?: WhatsAppMessageRaw & { state?: string };
};

export function toUnifiedIncomingMessage(
  msg: WhatsAppMessageRaw,
): IUnifiedIncomingMessage | null {
  if (msg.keyFromMe) return null;

  const c = msg.content;
  const text =
    (c.text as string | undefined) ||
    (c.caption as string | undefined) ||
    '';

  let contentType: MessageContentType = 'text';
  if (msg.messageType === 'audioMessage' || msg.messageType === 'audioOggOpusMessage') {
    contentType = 'voice';
  } else if (msg.messageType === 'imageMessage') {
    contentType = 'photo';
  } else if (msg.messageType === 'documentMessage' || msg.messageType === 'documentWithCaptionMessage') {
    contentType = 'document';
  }

  // For group messages use keyParticipant as the user JID
  const userId = msg.isGroup ? (msg.keyParticipant || msg.keyRemoteJid) : msg.keyRemoteJid;

  return {
    id: msg.keyId,
    platform: 'whatsapp',
    chatId: msg.keyRemoteJid,
    user: {
      id: userId,
      displayName: msg.pushName || userId.split('@')[0],
    },
    content: { type: contentType, text },
    timestamp: msg.messageTimestamp ? msg.messageTimestamp * 1000 : Date.now(),
    raw: msg,
  };
}
