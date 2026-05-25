/**
 * @license
 * Copyright 2025 ThairaAI
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IChannelPairingRequest, IChannelPluginStatus, IChannelUser } from '@process/channels/types';
import { acpConversation, channel } from '@/common/adapter/ipcBridge';
import { ConfigStorage } from '@/common/config/storage';
import GeminiModelSelector from '@/renderer/pages/conversation/platforms/gemini/GeminiModelSelector';
import type { GeminiModelSelection } from '@/renderer/pages/conversation/platforms/gemini/useGeminiModelSelection';
import WebviewHost from '@/renderer/components/media/WebviewHost';
import { Button, Dropdown, Empty, Input, Menu, Message, Spin, Tooltip } from '@arco-design/web-react';
import { CheckOne, CloseOne, Delete, Down, Refresh } from '@icon-park/react';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const DEFAULT_SERVER_URL = 'http://localhost:8084';
const DEFAULT_INSTANCE_NAME = 'thairaai';

const PreferenceRow: React.FC<{
  label: string;
  description?: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
}> = ({ label, description, required, children }) => (
  <div className='flex items-center justify-between gap-24px py-12px'>
    <div className='flex-1'>
      <div className='flex items-center gap-8px'>
        <span className='text-14px text-t-primary'>
          {label}
          {required && <span className='text-red-500 ml-2px'>*</span>}
        </span>
      </div>
      {description && <div className='text-12px text-t-tertiary mt-2px'>{description}</div>}
    </div>
    <div className='flex items-center'>{children}</div>
  </div>
);

const SectionHeader: React.FC<{ title: string; action?: React.ReactNode }> = ({ title, action }) => (
  <div className='flex items-center justify-between mb-12px'>
    <h3 className='text-14px font-500 text-t-primary m-0'>{title}</h3>
    {action}
  </div>
);

type WhatsAppConfigFormProps = {
  pluginStatus: IChannelPluginStatus | null;
  modelSelection: GeminiModelSelection;
  onStatusChange: (status: IChannelPluginStatus | null) => void;
};

const WhatsAppConfigForm: React.FC<WhatsAppConfigFormProps> = ({ pluginStatus, modelSelection, onStatusChange }) => {
  const { t } = useTranslation();

  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [instanceName, setInstanceName] = useState(DEFAULT_INSTANCE_NAME);
  const [apiKey, setApiKey] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [showQrPanel, setShowQrPanel] = useState(false);

  const [pairingLoading, setPairingLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [pendingPairings, setPendingPairings] = useState<IChannelPairingRequest[]>([]);
  const [authorizedUsers, setAuthorizedUsers] = useState<IChannelUser[]>([]);

  const [availableAgents, setAvailableAgents] = useState<
    Array<{ backend: string; name: string; customAgentId?: string; isPreset?: boolean }>
  >([]);
  const [selectedAgent, setSelectedAgent] = useState<{ backend: string; name?: string; customAgentId?: string }>({
    backend: 'gemini',
  });

  const qrUrl = `${serverUrl || DEFAULT_SERVER_URL}/instance/qrcode/${instanceName || DEFAULT_INSTANCE_NAME}`;

  const loadPendingPairings = useCallback(async () => {
    setPairingLoading(true);
    try {
      const result = await channel.getPendingPairings.invoke();
      if (result.success && result.data) {
        setPendingPairings(result.data.filter((p) => p.platformType === 'whatsapp'));
      }
    } catch (error) {
      console.error('[WhatsAppConfig] Failed to load pending pairings:', error);
    } finally {
      setPairingLoading(false);
    }
  }, []);

  const loadAuthorizedUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const result = await channel.getAuthorizedUsers.invoke();
      if (result.success && result.data) {
        setAuthorizedUsers(result.data.filter((u) => u.platformType === 'whatsapp'));
      }
    } catch (error) {
      console.error('[WhatsAppConfig] Failed to load authorized users:', error);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPendingPairings();
    void loadAuthorizedUsers();
    // Auto-discover API key from adjacent whatsapp-api .env
    void channel.detectWhatsAppApiKey.invoke().then((result) => {
      if (result.success && result.data && !apiKey) {
        setApiKey(result.data);
      }
    });
  }, [loadPendingPairings, loadAuthorizedUsers]); // apiKey intentionally omitted — only run once

  // If already configured, show QR panel by default
  useEffect(() => {
    if (pluginStatus?.hasToken) {
      setShowQrPanel(true);
    }
  }, [pluginStatus?.hasToken]);

  useEffect(() => {
    const loadAgentsAndSelection = async () => {
      try {
        const [agentsResp, saved] = await Promise.all([
          acpConversation.getAvailableAgents.invoke(),
          ConfigStorage.get('assistant.whatsapp.agent'),
        ]);

        if (agentsResp.success && agentsResp.data) {
          const list = agentsResp.data
            .filter((a) => !a.isPreset)
            .map((a) => ({
              backend: a.backend,
              name: a.name,
              customAgentId: a.customAgentId,
              isPreset: a.isPreset,
              isExtension: a.isExtension,
            }));
          setAvailableAgents(list);
        }

        if (saved && typeof saved === 'object' && 'backend' in saved && typeof (saved as Record<string, unknown>).backend === 'string') {
          setSelectedAgent({
            backend: (saved as Record<string, unknown>).backend as string,
            customAgentId: (saved as Record<string, unknown>).customAgentId as string | undefined,
            name: (saved as Record<string, unknown>).name as string | undefined,
          });
        } else if (typeof saved === 'string') {
          setSelectedAgent({ backend: saved });
        }
      } catch (error) {
        console.error('[WhatsAppConfig] Failed to load agents:', error);
      }
    };

    void loadAgentsAndSelection();
  }, []);

  const persistSelectedAgent = async (agent: { backend: string; customAgentId?: string; name?: string }) => {
    try {
      await ConfigStorage.set('assistant.whatsapp.agent', agent);
      await channel.syncChannelSettings
        .invoke({ platform: 'whatsapp', agent })
        .catch((err) => console.warn('[WhatsAppConfig] syncChannelSettings failed:', err));
      Message.success(t('settings.assistant.agentSwitched', 'Agent switched successfully'));
    } catch (error) {
      console.error('[WhatsAppConfig] Failed to save agent:', error);
      Message.error(t('common.saveFailed', 'Failed to save'));
    }
  };

  useEffect(() => {
    const unsubscribe = channel.pairingRequested.on((request) => {
      if (request.platformType !== 'whatsapp') return;
      setPendingPairings((prev) => {
        const exists = prev.some((p) => p.code === request.code);
        if (exists) return prev;
        return [request, ...prev];
      });
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = channel.userAuthorized.on((user) => {
      if (user.platformType !== 'whatsapp') return;
      setAuthorizedUsers((prev) => {
        const exists = prev.some((u) => u.id === user.id);
        if (exists) return prev;
        return [user, ...prev];
      });
      setPendingPairings((prev) => prev.filter((p) => p.platformUserId !== user.platformUserId));
    });
    return () => unsubscribe();
  }, []);

  const handleSaveAndEnable = async () => {
    const key = apiKey.trim();

    // apiKey is optional — plugin auto-discovers from adjacent whatsapp-api .env if not provided

    setSaveLoading(true);
    try {
      const config: Record<string, string> = {
        serverUrl: serverUrl.trim() || DEFAULT_SERVER_URL,
        instanceName: instanceName.trim() || DEFAULT_INSTANCE_NAME,
      };
      if (key) config.apiKey = key;

      const result = await channel.enablePlugin.invoke({
        pluginId: 'whatsapp_default',
        config,
      });

      if (result.success) {
        Message.success(t('settings.whatsapp.pluginEnabled', 'WhatsApp channel enabled'));
        const statusResult = await channel.getPluginStatus.invoke();
        if (statusResult.success && statusResult.data) {
          const waPlugin = statusResult.data.find((p) => p.type === 'whatsapp');
          onStatusChange(waPlugin || null);
        }
        // Auto-open QR panel after enabling
        setShowQrPanel(true);
      } else {
        console.error('[WhatsAppConfig] enablePlugin failed:', result.msg);
        Message.error(result.msg || t('settings.whatsapp.enableFailed', 'Failed to enable WhatsApp channel'));
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[WhatsAppConfig] Save failed:', error);
      Message.error(message || t('settings.whatsapp.enableFailed', 'Failed to enable WhatsApp channel'));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleApprovePairing = async (code: string) => {
    try {
      const result = await channel.approvePairing.invoke({ code });
      if (result.success) {
        Message.success(t('settings.assistant.pairingApproved', 'Pairing approved'));
        await loadPendingPairings();
        await loadAuthorizedUsers();
      } else {
        Message.error(result.msg || t('settings.assistant.approveFailed', 'Failed to approve pairing'));
      }
    } catch (error: unknown) {
      Message.error(error instanceof Error ? error.message : String(error));
    }
  };

  const handleRejectPairing = async (code: string) => {
    try {
      const result = await channel.rejectPairing.invoke({ code });
      if (result.success) {
        Message.info(t('settings.assistant.pairingRejected', 'Pairing rejected'));
        await loadPendingPairings();
      } else {
        Message.error(result.msg || t('settings.assistant.rejectFailed', 'Failed to reject pairing'));
      }
    } catch (error: unknown) {
      Message.error(error instanceof Error ? error.message : String(error));
    }
  };

  const handleRevokeUser = async (userId: string) => {
    try {
      const result = await channel.revokeUser.invoke({ userId });
      if (result.success) {
        Message.success(t('settings.assistant.userRevoked', 'User access revoked'));
        await loadAuthorizedUsers();
      } else {
        Message.error(result.msg || t('settings.assistant.revokeFailed', 'Failed to revoke user'));
      }
    } catch (error: unknown) {
      Message.error(error instanceof Error ? error.message : String(error));
    }
  };

  const formatTime = (timestamp: number) => new Date(timestamp).toLocaleString();

  const getRemainingTime = (expiresAt: number) => {
    const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000 / 60));
    return `${remaining} min`;
  };

  const hasExistingUsers = authorizedUsers.length > 0;
  const isGeminiAgent = selectedAgent.backend === 'gemini' || selectedAgent.backend === 'aionrs';
  const agentOptions: Array<{ backend: string; name: string; customAgentId?: string; isExtension?: boolean }> =
    availableAgents.length > 0 ? availableAgents : [{ backend: 'gemini', name: 'Gemini CLI' }];

  return (
    <div className='flex flex-col gap-24px'>
      {/* QR Connect Panel — shown first when configured */}
      <div className='flex flex-col gap-12px'>
        <div className='flex items-center justify-between'>
          <div>
            <div className='text-14px font-500 text-t-primary'>
              {t('settings.whatsapp.connectTitle', 'Connect WhatsApp')}
            </div>
            <div className='text-12px text-t-tertiary mt-2px'>
              {t('settings.whatsapp.connectDesc', 'Scan the QR code to link your WhatsApp account')}
            </div>
          </div>
          <Button
            type={showQrPanel ? 'secondary' : 'primary'}
            onClick={() => setShowQrPanel((v) => !v)}
          >
            {showQrPanel
              ? t('settings.whatsapp.hideQr', 'Hide')
              : t('settings.whatsapp.showQr', 'Open QR Connect')}
          </Button>
        </div>
        {showQrPanel && (
          <div className='rd-12px overflow-hidden border border-border-1' style={{ height: 520 }}>
            <WebviewHost url={qrUrl} showNavBar partition='persist:whatsapp-qr' />
          </div>
        )}
      </div>

      {/* Credentials */}
      <PreferenceRow
        label={t('settings.whatsapp.serverUrl', 'Server URL')}
        description={t('settings.whatsapp.serverUrlDesc', 'whatsapp-api server (default: http://localhost:8084)')}
      >
        <Input
          value={serverUrl}
          onChange={setServerUrl}
          placeholder={DEFAULT_SERVER_URL}
          style={{ width: 260 }}
          disabled={hasExistingUsers}
        />
      </PreferenceRow>

      <PreferenceRow
        label={t('settings.whatsapp.instanceName', 'Instance Name')}
        description={t('settings.whatsapp.instanceNameDesc', 'Auto-created in whatsapp-api on first start')}
      >
        <Input
          value={instanceName}
          onChange={setInstanceName}
          placeholder={DEFAULT_INSTANCE_NAME}
          style={{ width: 260 }}
          disabled={hasExistingUsers}
        />
      </PreferenceRow>

      <PreferenceRow
        label={t('settings.whatsapp.apiKey', 'Global API Key')}
        description={t('settings.whatsapp.apiKeyDesc', 'AUTHENTICATION_GLOBAL_AUTH_TOKEN from whatsapp-api .env (auto-detected if whatsapp-api is adjacent)')}
      >
        {hasExistingUsers ? (
          <Tooltip
            content={t(
              'settings.assistant.tokenLocked',
              'Please close the Channel and delete all authorized users before modifying'
            )}
          >
            <span>
              <Input.Password value={apiKey} onChange={setApiKey} placeholder='••••••••••••••••' style={{ width: 260 }} visibilityToggle disabled />
            </span>
          </Tooltip>
        ) : (
          <Input.Password
            value={apiKey}
            onChange={setApiKey}
            placeholder={pluginStatus?.hasToken ? '••••••••••••••••' : ''}
            style={{ width: 260 }}
            visibilityToggle
          />
        )}
      </PreferenceRow>

      {!hasExistingUsers && (
        <div className='flex justify-end'>
          {pluginStatus?.hasToken && !apiKey.trim() ? (
            <span className='text-12px text-t-tertiary mr-12px self-center'>
              {t('settings.whatsapp.credentialsSaved', 'Already configured. Enter new API key to update.')}
            </span>
          ) : null}
          <Button
            type='primary'
            loading={saveLoading}
            onClick={() => void handleSaveAndEnable()}
            disabled={false}
          >
            {t('settings.whatsapp.saveAndEnable', 'Save & Enable')}
          </Button>
        </div>
      )}

      {/* Agent Selection */}
      <div className='flex flex-col gap-8px'>
        <PreferenceRow
          label={t('settings.whatsapp.agent', 'Agent')}
          description={t('settings.whatsapp.agentDesc', 'Used for WhatsApp conversations')}
        >
          <Dropdown
            trigger='click'
            position='br'
            droplist={
              <Menu
                selectedKeys={[
                  selectedAgent.customAgentId
                    ? `${selectedAgent.backend}|${selectedAgent.customAgentId}`
                    : selectedAgent.backend,
                ]}
              >
                {agentOptions.map((a) => {
                  const key = a.customAgentId ? `${a.backend}|${a.customAgentId}` : a.backend;
                  return (
                    <Menu.Item
                      key={key}
                      onClick={() => {
                        const currentKey = selectedAgent.customAgentId
                          ? `${selectedAgent.backend}|${selectedAgent.customAgentId}`
                          : selectedAgent.backend;
                        if (key === currentKey) return;
                        const next = { backend: a.backend, customAgentId: a.customAgentId, name: a.name };
                        setSelectedAgent(next);
                        void persistSelectedAgent(next);
                      }}
                    >
                      {a.name}
                    </Menu.Item>
                  );
                })}
              </Menu>
            }
          >
            <Button type='secondary' className='min-w-160px flex items-center justify-between gap-8px'>
              <span className='truncate'>
                {selectedAgent.name ||
                  availableAgents.find(
                    (a) =>
                      (a.customAgentId ? `${a.backend}|${a.customAgentId}` : a.backend) ===
                      (selectedAgent.customAgentId
                        ? `${selectedAgent.backend}|${selectedAgent.customAgentId}`
                        : selectedAgent.backend)
                  )?.name ||
                  selectedAgent.backend}
              </span>
              <Down theme='outline' size={14} />
            </Button>
          </Dropdown>
        </PreferenceRow>
      </div>

      {/* Default Model Selection */}
      <PreferenceRow
        label={t('settings.assistant.defaultModel', 'Model')}
        description={t('settings.whatsapp.defaultModelDesc', 'Used for WhatsApp conversations')}
      >
        <GeminiModelSelector
          selection={isGeminiAgent ? modelSelection : undefined}
          disabled={!isGeminiAgent}
          label={
            !isGeminiAgent ? t('settings.assistant.autoFollowCliModel', 'Auto-follow CLI runtime model') : undefined
          }
          variant='settings'
        />
      </PreferenceRow>

      {/* Pending Pairings */}
      {pluginStatus?.enabled && authorizedUsers.length === 0 && (
        <div className='bg-fill-1 rd-12px pt-16px pr-16px pb-16px pl-0'>
          <SectionHeader
            title={t('settings.assistant.pendingPairings', 'Pending Pairing Requests')}
            action={
              <Button size='mini' type='text' icon={<Refresh size={14} />} loading={pairingLoading} onClick={loadPendingPairings}>
                {t('conversation.workspace.refresh', 'Refresh')}
              </Button>
            }
          />

          {pairingLoading ? (
            <div className='flex justify-center py-24px'>
              <Spin />
            </div>
          ) : pendingPairings.length === 0 ? (
            <Empty description={t('settings.assistant.noPendingPairings', 'No pending pairing requests')} />
          ) : (
            <div className='flex flex-col gap-12px'>
              {pendingPairings.map((pairing) => (
                <div key={pairing.code} className='flex items-center justify-between bg-fill-2 rd-8px p-12px'>
                  <div className='flex-1'>
                    <div className='text-14px font-500 text-t-primary'>{pairing.displayName || 'Unknown User'}</div>
                    <div className='text-12px text-t-tertiary mt-4px'>
                      {t('settings.assistant.pairingCode', 'Code')}:{' '}
                      <code className='bg-fill-3 px-4px rd-2px'>{pairing.code}</code>
                      <span className='mx-8px'>|</span>
                      {t('settings.assistant.expiresIn', 'Expires in')}: {getRemainingTime(pairing.expiresAt)}
                    </div>
                  </div>
                  <div className='flex items-center gap-8px'>
                    <Button type='primary' size='small' icon={<CheckOne size={14} />} onClick={() => handleApprovePairing(pairing.code)}>
                      {t('settings.assistant.approve', 'Approve')}
                    </Button>
                    <Button type='secondary' size='small' status='danger' icon={<CloseOne size={14} />} onClick={() => handleRejectPairing(pairing.code)}>
                      {t('settings.assistant.reject', 'Reject')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Authorized Users */}
      {authorizedUsers.length > 0 && (
        <div className='bg-fill-1 rd-12px pt-16px pr-16px pb-16px pl-0'>
          <SectionHeader
            title={t('settings.assistant.authorizedUsers', 'Authorized Users')}
            action={
              <Button size='mini' type='text' icon={<Refresh size={14} />} loading={usersLoading} onClick={loadAuthorizedUsers}>
                {t('common.refresh', 'Refresh')}
              </Button>
            }
          />

          {usersLoading ? (
            <div className='flex justify-center py-24px'>
              <Spin />
            </div>
          ) : (
            <div className='flex flex-col gap-12px'>
              {authorizedUsers.map((user) => (
                <div key={user.id} className='flex items-center justify-between bg-fill-2 rd-8px p-12px'>
                  <div className='flex-1'>
                    <div className='text-14px font-500 text-t-primary'>{user.displayName || 'Unknown User'}</div>
                    <div className='text-12px text-t-tertiary mt-4px'>
                      {t('settings.assistant.platform', 'Platform')}: {user.platformType}
                      <span className='mx-8px'>|</span>
                      {t('settings.assistant.authorizedAt', 'Authorized')}: {formatTime(user.authorizedAt)}
                    </div>
                  </div>
                  <Tooltip content={t('settings.assistant.revokeAccess', 'Revoke access')}>
                    <Button type='text' status='danger' size='small' icon={<Delete size={16} />} onClick={() => handleRevokeUser(user.id)} />
                  </Tooltip>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WhatsAppConfigForm;
