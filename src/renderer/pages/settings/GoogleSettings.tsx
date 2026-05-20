/**
 * @license
 * Copyright 2025 ThairaAI
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import { Button, Message, Spin } from '@arco-design/web-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SettingsPageWrapper from './components/SettingsPageWrapper';

type ConnectionStatus = {
  connected: boolean;
  email: string;
  hasCredentials: boolean;
};

const GoogleSettingsContent: React.FC = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ConnectionStatus>({ connected: false, email: '', hasCredentials: false });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [message, messageContext] = Message.useMessage();

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await ipcBridge.googleIntegration.status.invoke({});
      if (res.success && res.data) {
        setStatus(res.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await ipcBridge.googleIntegration.connect.invoke({});
      if (res.success) {
        message.success(t('settings.google.connectSuccess'));
        await loadStatus();
      } else {
        message.error(res.msg ?? t('settings.google.connectFailed'));
      }
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    const res = await ipcBridge.googleIntegration.disconnect.invoke({});
    if (res.success) {
      message.success(t('settings.google.disconnectSuccess'));
      await loadStatus();
    }
  };

  return (
    <div className='flex flex-col gap-24px'>
      {messageContext}

      <div className='text-16px font-semibold text-t-primary'>{t('settings.google.title')}</div>

      <div className='flex items-center gap-12px p-16px rd-8px bg-fill-2'>
        {loading ? (
          <Spin size={16} />
        ) : (
          <>
            <span className={`w-8px h-8px rd-full ${status.connected ? 'bg-green-500' : 'bg-fill-4'}`} />
            <span className='text-t-secondary text-14px'>
              {status.connected
                ? t('settings.google.connectedAs', { email: status.email })
                : t('settings.google.notConnected')}
            </span>
            <span className='flex-1' />
            {status.connected ? (
              <Button size='small' type='outline' status='danger' onClick={() => void handleDisconnect()}>
                {t('settings.google.disconnect')}
              </Button>
            ) : (
              <Button
                size='small'
                type='primary'
                loading={connecting}
                disabled={!status.hasCredentials}
                onClick={() => void handleConnect()}
              >
                {t('settings.google.connect')}
              </Button>
            )}
          </>
        )}
      </div>

      {!loading && !status.hasCredentials && (
        <div className='text-12px text-t-tertiary'>{t('settings.google.notConfigured')}</div>
      )}
    </div>
  );
};

const GoogleSettings: React.FC = () => {
  return (
    <SettingsPageWrapper>
      <GoogleSettingsContent />
    </SettingsPageWrapper>
  );
};

export default GoogleSettings;
