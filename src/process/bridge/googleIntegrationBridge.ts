/**
 * @license
 * Copyright 2025 ThairaAI
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import { googleIntegrationService } from '@process/services/google/GoogleIntegrationService';

export function initGoogleIntegrationBridge(): void {
  ipcBridge.googleIntegration.status.provider(async (_params) => {
    try {
      const status = await googleIntegrationService.getStatus();
      return { success: true, data: status };
    } catch (error) {
      return { success: false, msg: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcBridge.googleIntegration.connect.provider(async (_params) => {
    try {
      const result = await googleIntegrationService.connect();
      if (result.success) {
        return { success: true, data: { email: result.email ?? '' } };
      }
      return { success: false, msg: result.error };
    } catch (error) {
      return { success: false, msg: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcBridge.googleIntegration.disconnect.provider(async (_params) => {
    try {
      await googleIntegrationService.disconnect();
      return { success: true };
    } catch (error) {
      return { success: false, msg: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcBridge.googleIntegration.listEmails.provider(async ({ maxResults }) => {
    try {
      const messages = await googleIntegrationService.listEmails(maxResults ?? 10);
      return { success: true, data: { messages } };
    } catch (error) {
      return { success: false, msg: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcBridge.googleIntegration.listEvents.provider(async ({ maxResults }) => {
    try {
      const events = await googleIntegrationService.listEvents(maxResults ?? 10);
      return { success: true, data: { events } };
    } catch (error) {
      return { success: false, msg: error instanceof Error ? error.message : String(error) };
    }
  });
}
