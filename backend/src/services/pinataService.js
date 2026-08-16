const PINATA_API_BASE_URL = "https://api.pinata.cloud";

function isPinataConfigured() {
  return Boolean(
    process.env.PINATA_JWT?.trim() ||
      (process.env.PINATA_API_KEY?.trim() && process.env.PINATA_API_SECRET?.trim())
  );
}

function getPinataAuthHeaders() {
  const jwt = process.env.PINATA_JWT?.trim();
  if (jwt) {
    return { Authorization: `Bearer ${jwt}` };
  }

  const apiKey = process.env.PINATA_API_KEY?.trim();
  const apiSecret = process.env.PINATA_API_SECRET?.trim();
  if (apiKey && apiSecret) {
    return {
      pinata_api_key: apiKey,
      pinata_secret_api_key: apiSecret
    };
  }

  throw new Error("Missing Pinata credentials");
}

async function readPinataResponse(response, action) {
  const text = await response.text();
  let body = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text };
    }
  }

  if (!response.ok) {
    const message = body?.error?.details || body?.error || body?.message || response.statusText;
    throw new Error(`Pinata ${action} failed (${response.status}): ${message}`);
  }

  return body || {};
}

function normalizePinataResult(result, fallbackName) {
  const cid = result.IpfsHash || result.cid || result.data?.cid;
  if (!cid) {
    throw new Error("Pinata response did not include an IPFS CID");
  }

  return {
    cid,
    size: result.PinSize || result.size || result.data?.size || null,
    timestamp: result.Timestamp || result.created_at || result.data?.created_at || null,
    fileName: fallbackName
  };
}

async function testAuthentication() {
  const response = await fetch(`${PINATA_API_BASE_URL}/data/testAuthentication`, {
    method: "GET",
    headers: {
      accept: "application/json",
      ...getPinataAuthHeaders()
    }
  });

  return readPinataResponse(response, "authentication");
}

async function pinBuffer(buffer, fileName = "file.bin", metadata = {}) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("Pinata file upload requires a non-empty buffer");
  }

  const form = new FormData();
  const blob = new Blob([buffer], { type: metadata.contentType || "application/octet-stream" });
  form.append("file", blob, fileName);
  form.append(
    "pinataMetadata",
    JSON.stringify({
      name: fileName,
      keyvalues: metadata.keyvalues || {}
    })
  );
  form.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

  const response = await fetch(`${PINATA_API_BASE_URL}/pinning/pinFileToIPFS`, {
    method: "POST",
    headers: getPinataAuthHeaders(),
    body: form
  });

  const result = await readPinataResponse(response, "file upload");
  return normalizePinataResult(result, fileName);
}

async function pinJson(payload, name = "data.json", metadata = {}) {
  const body = {
    pinataContent: payload,
    pinataMetadata: {
      name,
      keyvalues: metadata.keyvalues || {}
    },
    pinataOptions: { cidVersion: 1 }
  };

  const response = await fetch(`${PINATA_API_BASE_URL}/pinning/pinJSONToIPFS`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getPinataAuthHeaders()
    },
    body: JSON.stringify(body)
  });

  const result = await readPinataResponse(response, "JSON upload");
  return normalizePinataResult(result, name);
}

module.exports = { isPinataConfigured, testAuthentication, pinBuffer, pinJson };
