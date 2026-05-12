const BASE = 'https://api.resumatorapi.com/v1';

exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };

  try {
    let raw = event.body || '';
    if (event.isBase64Encoded && raw) {
      raw = Buffer.from(raw, 'base64').toString('utf8');
    }

    const key = process.env.JAZZHR_API_KEY || '8RfkGwihOP1vxVhiR6PdF7UpWgKUhqht';

    if (!raw || raw.trim() === '') {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Empty request body' }) };
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Invalid JSON: ' + e.message }) };
    }

    const { endpoint, method, params = {}, fileData } = parsed;

    if (!endpoint) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'endpoint required' }) };
    }

    // FILE UPLOAD
    if (method === 'FILE') {
      const fileBuffer = Buffer.from(fileData.base64, 'base64');
      const boundary = 'keg' + Date.now();
      const CRLF = '\r\n';
      const body = Buffer.concat([
        Buffer.from(`--${boundary}${CRLF}Content-Disposition: form-data; name="apikey"${CRLF}${CRLF}${key}${CRLF}`, 'utf8'),
        Buffer.from(`--${boundary}${CRLF}Content-Disposition: form-data; name="resume"; filename="${fileData.name}"${CRLF}Content-Type: ${fileData.type}${CRLF}${CRLF}`, 'utf8'),
        fileBuffer,
        Buffer.from(`${CRLF}--${boundary}--`, 'utf8'),
      ]);
      const res = await fetch(`${BASE}/${endpoint}?apikey=${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
        body,
      });
      const text = await res.text();
      return { statusCode: res.status, headers: { ...cors, 'Content-Type': 'application/json' }, body: text || '{}' };
    }

    // GET
    if (method === 'GET') {
      const qs = new URLSearchParams({ apikey: key, ...params });
      const res = await fetch(`${BASE}/${endpoint}?${qs}`);
      const text = await res.text();
      return { statusCode: res.status, headers: { ...cors, 'Content-Type': 'application/json' }, body: text || '[]' };
    }

    // POST — send as JSON body with apikey in query string
    console.log('POST endpoint:', endpoint);
    console.log('POST to:', `${BASE}/${endpoint}`);
    console.log('POST params:', JSON.stringify(params).substring(0, 200));
    const res = await fetch(`${BASE}/${endpoint}?apikey=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const text = await res.text();
    console.log('POST response:', res.status, text.substring(0, 300));
    return { statusCode: res.status, headers: { ...cors, 'Content-Type': 'application/json' }, body: text || '{}' };

  } catch (e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: e.message }) };
  }
};
