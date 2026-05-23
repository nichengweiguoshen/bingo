import { Asset, useAssets } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

const HTML_ASSET = require('./index.html');
const STYLE_ASSET = require('./assets/styles.css');
const SCRIPT_ASSET = require('./webview/app.js.txt');

async function readBundledText(moduleRef) {
  const asset = Asset.fromModule(moduleRef);
  await asset.downloadAsync();
  const uri = asset.localUri || asset.uri;

  if (!uri.startsWith('file:')) {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${uri}: ${response.status}`);
    }
    return response.text();
  }

  return FileSystem.readAsStringAsync(uri);
}

function inlineWebAssets(html, styles, script) {
  return html
    .replace(/\s*<link rel="manifest"[^>]*>/i, '')
    .replace(/\s*<link rel="icon"[^>]*>/i, '')
    .replace(/\s*<link rel="apple-touch-icon"[^>]*>/i, '')
    .replace(
      '<link rel="stylesheet" href="./assets/styles.css">',
      `<style>${styles}</style>`
    )
    .replace(
      '<script src="./assets/app.js" defer></script>',
      `<script>${script.replace(/<\/script/gi, '<\\/script')}</script>`
    );
}

function BingoRuntime({ html }) {
  if (Platform.OS === 'web') {
    return (
      <iframe
        title="Daily Bingo"
        srcDoc={html}
        style={webStyles.iframe}
      />
    );
  }

  return (
    <WebView
      source={{ html, baseUrl: 'https://daily-bingo.local/' }}
      originWhitelist={['*']}
      domStorageEnabled
      javaScriptEnabled
      allowFileAccess
      allowingReadAccessToURL="*"
      mixedContentMode="always"
      setSupportMultipleWindows={false}
      style={styles.webview}
    />
  );
}

export default function App() {
  const [assets] = useAssets([HTML_ASSET, STYLE_ASSET, SCRIPT_ASSET]);
  const [html, setHtml] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadHtml() {
      if (!assets) return;

      try {
        const [sourceHtml, styles, script] = await Promise.all([
          readBundledText(HTML_ASSET),
          readBundledText(STYLE_ASSET),
          readBundledText(SCRIPT_ASSET),
        ]);

        if (!cancelled) {
          setHtml(inlineWebAssets(sourceHtml, styles, script));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load bundled app');
        }
      }
    }

    loadHtml();

    return () => {
      cancelled = true;
    };
  }, [assets]);

  const content = useMemo(() => {
    if (error) {
      return (
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>加载失败</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      );
    }

    if (!html) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading Daily Bingo...</Text>
        </View>
      );
    }

    return <BingoRuntime html={html} />;
  }, [error, html]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="default" />
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    marginTop: 12,
    color: '#4b5563',
    fontSize: 14,
    fontWeight: '600',
  },
  errorTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  errorText: {
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});

const webStyles = {
  iframe: {
    width: '100%',
    height: '100%',
    border: 0,
    background: 'transparent',
  },
};
