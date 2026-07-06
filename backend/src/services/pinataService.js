const PinataClient = require("@pinata/sdk");

function createPinataClient() {
  const apiKey = process.env.PINATA_API_KEY;
  const apiSecret = process.env.PINATA_API_SECRET;

  if (apiKey && apiSecret) {
    return new PinataClient(apiKey, apiSecret);
  }

  if (process.env.PINATA_JWT) {
    return new PinataClient({ pinataJWTKey: process.env.PINATA_JWT });
  }

  throw new Error("Missing Pinata credentials");
}

async function pinBuffer(buffer, fileName) {
  const pinata = createPinataClient();
  const pinResult = await pinata.pinBuffer(buffer, {
    pinataMetadata: { name: fileName }
  });

  return {
    cid: pinResult.IpfsHash || pinResult.cid,
    fileName
  };
}

async function pinJson(payload, name) {
  const pinata = createPinataClient();
  const pinResult = await pinata.pinJSONToIPFS(payload, {
    pinataMetadata: { name }
  });

  return {
    cid: pinResult.IpfsHash || pinResult.cid,
    name
  };
}

module.exports = { createPinataClient, pinBuffer, pinJson };
