const { verifyMessage } = require("ethers");

function extractSiweAddress(message) {
  const lines = message.split("\n");
  if (lines.length < 2) {
    return null;
  }
  const candidate = lines[1]?.trim();
  return /^0x[a-fA-F0-9]{40}$/.test(candidate || "") ? candidate.toLowerCase() : null;
}

function verifySiweSignature({ address, message, signature }) {
  if (!address || !message || !signature) {
    return false;
  }

  const parsedAddress = extractSiweAddress(message);
  if (!parsedAddress || parsedAddress !== address.toLowerCase()) {
    return false;
  }

  try {
    const recovered = verifyMessage(message, signature);
    return recovered.toLowerCase() === address.toLowerCase();
  } catch {
    return false;
  }
}

module.exports = { verifySiweSignature, extractSiweAddress };
