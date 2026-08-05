import axios from 'axios';
import { Asset } from 'expo-asset';
import { useState } from 'react';
import { ActivityIndicator, Button, ScrollView, StyleSheet, Text, View } from 'react-native';

const BASE_URL = 'https://jsonplaceholder.typicode.com';
const UPLOAD_URL = 'https://httpbin.org/post';
const IMAGE_URL =
  'https://camo.githubusercontent.com/5e45bc648dba68520ce949a53690af6bcef2880f84a1d46cbb1636649afd6d84/68747470733a2f2f796176757a63656c696b65722e6769746875622e696f2f73616d706c652d696d616765732f696d6167652d313032312e6a7067';

type Transport = 'fetch' | 'xhr' | 'axios';
type Action = 'get' | 'post' | 'delete' | 'upload';

const RESOURCES: Record<Transport, string> = {
  fetch: `${BASE_URL}/posts`,
  xhr: `${BASE_URL}/todos`,
  axios: `${BASE_URL}/users`,
};

const SECTIONS: { transport: Transport; label: string }[] = [
  { transport: 'fetch', label: 'fetch' },
  { transport: 'xhr', label: 'XMLHttpRequest' },
  { transport: 'axios', label: 'axios' },
];

// Structurally a real JWT (decodable header/payload), but the signature is fake and these are
// public test APIs (jsonplaceholder/httpbin) that never validate it — this exists purely so the
// devtools Headers tab has an Authorization value to show.
const FAKE_BEARER_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYWtlLXVzZXItaWQiLCJuYW1lIjoiQnJ1aW4gRGV2dG9vbHMgRXhhbXBsZSIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxOTk5OTk5OTk5fQ.fake-signature-for-demo-purposes-only';

async function fetchJson(method: string, url: string, body?: string | FormData) {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${FAKE_BEARER_TOKEN}`,
      ...(typeof body === 'string' ? { 'Content-Type': 'application/json' } : undefined),
    },
    body,
  });
  const text = await response.text();
  return { status: response.status, text };
}

function xhrJson(method: string, url: string, body?: string | FormData) {
  return new Promise<{ status: number; text: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.setRequestHeader('Authorization', `Bearer ${FAKE_BEARER_TOKEN}`);
    if (typeof body === 'string') xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = () => resolve({ status: xhr.status, text: xhr.responseText });
    xhr.onerror = () => reject(new Error('XHR request failed'));
    xhr.send(body ?? null);
  });
}

async function axiosJson(method: 'get' | 'post' | 'delete', url: string, data?: unknown) {
  const response = await axios.request({
    method,
    url,
    data,
    headers: { Authorization: `Bearer ${FAKE_BEARER_TOKEN}` },
  });
  return { status: response.status, text: JSON.stringify(response.data).slice(0, 300) };
}

async function axiosUpload(url: string, formData: FormData) {
  const response = await axios.post(url, formData, {
    headers: {
      Authorization: `Bearer ${FAKE_BEARER_TOKEN}`,
      'Content-Type': 'multipart/form-data',
    },
  });
  return { status: response.status, text: JSON.stringify(response.data).slice(0, 300) };
}

// Transport-agnostic: exists purely to give the devtools Preview tab a real image response to
// render, not to exercise fetch/XHR/axios differences the way the other buttons do.
async function fetchImage() {
  const response = await fetch(IMAGE_URL);
  return {
    status: response.status,
    text: `${response.headers.get('content-type')} · ${response.headers.get('content-length') ?? '?'} bytes`,
  };
}

async function loadIconAssetUri() {
  const asset = Asset.fromModule(require('../assets/icon.png'));
  await asset.downloadAsync();
  return asset.localUri ?? asset.uri;
}

function buildImageFormData(uri: string) {
  const formData = new FormData();
  formData.append('file', { uri, name: 'icon.png', type: 'image/png' } as unknown as Blob);
  return formData;
}

export function NativeRequests() {
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState('Tap a button to send a request');

  async function runRequest(key: string, task: () => Promise<{ status: number; text: string }>) {
    setLoading(key);
    setResult(`Running ${key}...`);
    try {
      const { status, text } = await task();
      setResult(`${key} -> ${status}\n${text.slice(0, 300)}`);
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      setResult(`${key} failed${status ? ` (${status})` : ''}: ${(error as Error).message}`);
    } finally {
      setLoading(null);
    }
  }

  function handleRequest(transport: Transport, action: Action) {
    const key = `${transport}-${action}`;
    const resource = RESOURCES[transport];

    runRequest(key, async () => {
      if (action === 'upload') {
        const uri = await loadIconAssetUri();
        const formData = buildImageFormData(uri);
        const url = `${UPLOAD_URL}?via=${transport}`;
        if (transport === 'fetch') return fetchJson('POST', url, formData);
        if (transport === 'xhr') return xhrJson('POST', url, formData);
        return axiosUpload(url, formData);
      }

      const method = action.toUpperCase();
      const url = action === 'post' ? resource : `${resource}/1`;
      const payload =
        action === 'post' ? { title: 'bruin', body: `${transport} example`, userId: 1 } : undefined;

      if (transport === 'fetch') return fetchJson(method, url, payload && JSON.stringify(payload));
      if (transport === 'xhr') return xhrJson(method, url, payload && JSON.stringify(payload));
      return axiosJson(action, url, payload);
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>@bruin/devtools example</Text>

      {SECTIONS.map((section) => (
        <View key={section.transport} style={styles.section}>
          <Text style={styles.sectionHeader}>{section.label}</Text>
          <View style={styles.group}>
            <Button
              title="GET"
              onPress={() => handleRequest(section.transport, 'get')}
              disabled={loading !== null}
            />
          </View>
          <View style={styles.group}>
            <Button
              title="POST"
              onPress={() => handleRequest(section.transport, 'post')}
              disabled={loading !== null}
            />
          </View>
          <View style={styles.group}>
            <Button
              title="DELETE"
              onPress={() => handleRequest(section.transport, 'delete')}
              disabled={loading !== null}
            />
          </View>
          <View style={styles.group}>
            <Button
              title="Upload image"
              onPress={() => handleRequest(section.transport, 'upload')}
              disabled={loading !== null}
            />
          </View>
        </View>
      ))}

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Preview tab</Text>
        <View style={styles.group}>
          <Button
            title="Fetch image"
            onPress={() => runRequest('image', fetchImage)}
            disabled={loading !== null}
          />
        </View>
      </View>

      {loading !== null && <ActivityIndicator style={styles.spinner} />}

      <Text style={styles.result}>{result}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  header: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    color: '#555',
  },
  group: {
    marginBottom: 8,
  },
  spinner: {
    marginVertical: 12,
  },
  result: {
    marginTop: 12,
    fontFamily: 'monospace',
    fontSize: 12,
  },
});
