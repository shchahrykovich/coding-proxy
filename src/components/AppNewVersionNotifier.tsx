"use client";

import React, {useEffect, useState} from "react";
import {Typography} from "antd";
import Link from "next/link";

const {Text} = Typography;

interface VersionInfo {
    current: string;
    latest: string;
    hasNewVersion: boolean;
    lastChecked: string;
}

const STORAGE_KEY = 'app-version-info';
const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export default function AppNewVersionNotifier() {
    const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
    const [loading, setLoading] = useState(true);

    const shouldCheckForUpdates = (lastChecked: string): boolean => {
        const lastCheckTime = new Date(lastChecked).getTime();
        const now = Date.now();
        return now - lastCheckTime > CHECK_INTERVAL;
    };

    const fetchCurrentVersion = async (): Promise<string> => {
        try {
            const response = await fetch('/version.json');
            const data: { 'current-version': string } = await response.json();
            return data['current-version'];
        } catch (error) {
            console.error('Failed to fetch current version:', error);
            return '0.0.0';
        }
    };

    const fetchLatestVersion = async (): Promise<string> => {
        try {
            const response = await fetch('https://codingproxy.com/versions.json');
            const data: { 'latest-version': string } = await response.json();
            return data['latest-version'];
        } catch (error) {
            console.error('Failed to fetch latest version:', error);
            return '0.0.0';
        }
    };

    const compareVersions = (current: string, latest: string): boolean => {
        const currentParts = current.split('.').map(Number);
        const latestParts = latest.split('.').map(Number);

        for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
            const currentPart = currentParts[i] || 0;
            const latestPart = latestParts[i] || 0;

            if (latestPart > currentPart) return true;
            if (latestPart < currentPart) return false;
        }

        return false;
    };

    const loadVersionInfo = async () => {
        setLoading(true);

        try {
            // Get stored version info
            const storedData = localStorage.getItem(STORAGE_KEY);
            let versionData: VersionInfo;

            if (storedData) {
                const parsed = JSON.parse(storedData);
                versionData = parsed;
            } else {
                // Initialize with current version
                const currentVersion = await fetchCurrentVersion();
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                versionData = {
                    current: currentVersion,
                    latest: currentVersion,
                    hasNewVersion: false,
                    lastChecked: yesterday.toISOString()
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(versionData));
            }

            // Check if we need to fetch latest version
            if (shouldCheckForUpdates(versionData.lastChecked)) {
                const [currentVersion, latestVersion] = await Promise.all([
                    fetchCurrentVersion(),
                    fetchLatestVersion()
                ]);

                versionData = {
                    current: currentVersion,
                    latest: latestVersion,
                    hasNewVersion: compareVersions(currentVersion, latestVersion),
                    lastChecked: new Date().toISOString()
                };

                // Store updated version info
                localStorage.setItem(STORAGE_KEY, JSON.stringify(versionData));
            }

            setVersionInfo(versionData);
        } catch (error) {
            console.error('Failed to load version info:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadVersionInfo();
    }, []);

    if (loading || !versionInfo) {
        return null;
    }

    return (
        <>
            <div style={{marginTop: '8px', textAlign: 'center'}}>
                <Text style={{fontSize: '11px', color: '#666'}}>
                    version: {versionInfo.current}
                </Text>
            </div>
            {versionInfo.hasNewVersion && (<div style={{marginTop: '8px', textAlign: 'center'}}>
                <Text style={{fontSize: '11px', color: '#666'}}>
                    <Link target={'_blank'} href={'https://codingproxy.com/releases'}>new version: {versionInfo.latest}</Link>
                </Text>
            </div>)}
        </>
    );
}
