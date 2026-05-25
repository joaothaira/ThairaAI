/**
 * @license
 * Copyright 2025 ThairaAI
 * SPDX-License-Identifier: Apache-2.0
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

function getBinaryName(): string {
  return process.platform === 'win32' ? 'aionrs.exe' : 'aionrs';
}

function getBundledBinaryPath(root: string): string {
  const runtimeKey = `${process.platform}-${process.arch}`;
  return join(root, 'bundled-aionrs', runtimeKey, getBinaryName());
}

function getDevCandidatePaths(): string[] {
  const runtimeKey = `${process.platform}-${process.arch}`;
  const binaryName = getBinaryName();
  const cwd = process.cwd();

  return [
    // electron-vite dev from repo root
    join(cwd, 'resources', 'bundled-aionrs', runtimeKey, binaryName),
    // Packaged build output, useful for local dev when resources/ was cleaned
    join(cwd, 'out', 'mac-arm64', 'AionUi.app', 'Contents', 'Resources', 'bundled-aionrs', runtimeKey, binaryName),
    join(cwd, 'out', 'mac', 'AionUi.app', 'Contents', 'Resources', 'bundled-aionrs', runtimeKey, binaryName),
    // Running from out/main during development
    join(cwd, '..', 'resources', 'bundled-aionrs', runtimeKey, binaryName),
  ];
}

/**
 * Resolve the aionrs binary path.
 * Search order:
 *  1. Bundled with app (production)
 *  2. Repo/build resources (development)
 *  3. System PATH
 */
export function resolveAionrsBinary(): string | null {
  // 1. Bundled binary (production) — same layout as bundled-bun
  const resourcesPath = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath;
  if (resourcesPath) {
    const bundled = getBundledBinaryPath(resourcesPath);
    if (existsSync(bundled)) return bundled;
  }

  // 2. Development fallbacks
  for (const candidate of getDevCandidatePaths()) {
    if (existsSync(candidate)) return candidate;
  }

  // 3. System PATH
  try {
    const cmd = process.platform === 'win32' ? 'where aionrs' : 'which aionrs';
    const result = execSync(cmd, { encoding: 'utf-8', timeout: 5000 }).trim();
    if (result && existsSync(result)) return result;
  } catch {
    // not found in PATH
  }

  return null;
}

export function isAionrsAvailable(): boolean {
  return resolveAionrsBinary() !== null;
}

/**
 * Detect aionrs availability and version for settings UI.
 */
export function detectAionrs(): {
  available: boolean;
  version?: string;
  path?: string;
} {
  const binaryPath = resolveAionrsBinary();
  if (!binaryPath) return { available: false };

  try {
    const version = execSync(`"${binaryPath}" --version`, {
      encoding: 'utf-8',
      timeout: 5000,
    }).trim();
    return { available: true, version, path: binaryPath };
  } catch {
    return { available: true, path: binaryPath };
  }
}
