/**
 * @license
 * Copyright 2025 ThairaAI
 * SPDX-License-Identifier: Apache-2.0
 */

export { BasePlugin } from './BasePlugin';
export type { PluginMessageHandler } from './BasePlugin';

// Telegram plugin
export { TelegramPlugin } from './telegram/TelegramPlugin';
export * from './telegram/TelegramAdapter';
export * from './telegram/TelegramKeyboards';

// DingTalk plugin
export { DingTalkPlugin } from './dingtalk/DingTalkPlugin';

// WeChat plugin
export { WeixinPlugin } from './weixin/WeixinPlugin';

// WeCom (Enterprise WeChat) plugin
export { WecomPlugin } from './wecom/WecomPlugin';

// WhatsApp plugin
export { WhatsAppPlugin } from './whatsapp/WhatsAppPlugin';
