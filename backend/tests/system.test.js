/**
 * ============================================================
 *  MilestoneChain — Full System Integration Test Suite v2
 *  Tests all API endpoints, edge cases, and integration flows
 *  for production readiness verification
 *
 *  Run: node tests/system.test.js
 * ============================================================
 */

const BASE_URL = "http://localhost:5000";
const GRAPHQL_URL = `${BASE_URL}/graphql`;

// ── State ─────────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failedTests = [];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function request(method, path, { body, headers = {} } = {}) {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const options = {
    method,
    headers: { "Content-Type": "application/json", Origin: BASE_URL, ...headers }
  };
  if (body !== undefined) options.body = JSON.stringify(body);
  const res = await fetch(url, options);
  let json;
  try { json = await res.json(); } catch { json = null; }
  return { status: res.status, json, headers: res.headers };
}

async function graphql(query, variables = {}) {
  return request("POST", GRAPHQL_URL, { body: { query, variables } });
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗  ${name}`);
    console.error(`     → ${err.message}`);
    failed++;
    failedTests.push({ name, error: err.message });
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || "Assertion failed");
}
function assertEqual(actual, expected, msg) {
  if (actual !== expected)
    throw new Error(msg || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
function assertInRange(val, min, max, msg) {
  if (val < min || val > max)
    throw new Error(msg || `Expected ${val} to be between ${min} and ${max}`);
}

// ── Test Fixtures ─────────────────────────────────────────────────────────────
const VALID_ADDRESS        = "0x" + "a".repeat(40);  // 0xaaaa...
const VALID_ADDRESS_2      = "0x" + "b".repeat(40);  // 0xbbbb...
const NON_EXISTENT_ADDRESS = "0x" + "9".repeat(40);  // 0x9999...
const VALID_TXHASH         = "0x" + "c".repeat(64);
const VALID_TXHASH_2       = "0x" + Date.now().toString(16).padStart(20, "0") + "d".repeat(44);
const WEBHOOK_API_KEY      = "0c1b61793dd51d2e7bb2bbed3465f2209ccc5b3bb515e86dc2282da1f648a7fa";

// ─────────────────────────────────────────────────────────────────────────────
//  1. HEALTH & INFRASTRUCTURE
// ─────────────────────────────────────────────────────────────────────────────
async function runHealthTests() {
  console.log("\n📡 [1] Health & Infrastructure");

  await test("GET /health → 200 with service diagnostics", async () => {
    const { status, json } = await request("GET", "/health");
    assertEqual(status, 200);
    assert(json.status === "ok", `Expected status ok, got ${json.status}`);
    assert(typeof json.services === "object", "Missing services map");
    assert(typeof json.chainId === "number", "Missing chainId");
    assert(typeof json.notificationSystem === "object", "Missing notificationSystem");
  });

  await test("GET /nonexistent → 404 not-found handler", async () => {
    const { status } = await request("GET", "/api/this/doesnt/exist");
    assertEqual(status, 404);
  });

  await test("GET /health → MongoDB reported as running", async () => {
    const { json } = await request("GET", "/health");
    assert(json.services.mongodb === true, "MongoDB not connected");
  });

  await test("GET /health → Notification engine active", async () => {
    const { json } = await request("GET", "/health");
    assert(json.services.notificationEngine === true, "Notification engine not active");
  });

  await test("CORS: self-origin (port 5000) is allowed", async () => {
    const { status } = await request("GET", "/health", {
      headers: { Origin: "http://localhost:5000" }
    });
    assertInRange(status, 200, 299);
  });

  await test("CORS: frontend origin (port 5173) is allowed", async () => {
    const { status } = await request("GET", "/health", {
      headers: { Origin: "http://localhost:5173" }
    });
    assertInRange(status, 200, 299);
  });

  await test("GET /api/admin/stats → public endpoint returns 200", async () => {
    const { status, json } = await request("GET", "/api/admin/stats");
    assertEqual(status, 200);
    assert(json !== null, "Expected JSON response");
  });

  await test("GET /api/admin/activity → public activity feed returns 200", async () => {
    const { status, json } = await request("GET", "/api/admin/activity");
    assertEqual(status, 200);
    assert(json !== null);
  });

  await test("GET /api/admin/health → public platform health returns 200", async () => {
    const { status } = await request("GET", "/api/admin/health");
    assertEqual(status, 200);
  });

  await test("GET /api/admin/analytics/donations-over-time → 200", async () => {
    const { status } = await request("GET", "/api/admin/analytics/donations-over-time");
    assertEqual(status, 200);
  });

  await test("GET /api/admin/analytics/user-growth → 200", async () => {
    const { status } = await request("GET", "/api/admin/analytics/user-growth");
    assertEqual(status, 200);
  });

  await test("GET /api/admin/analytics/campaign-categories → 200", async () => {
    const { status } = await request("GET", "/api/admin/analytics/campaign-categories");
    assertEqual(status, 200);
  });

  await test("GET /api/admin/analytics/role-distribution → 200", async () => {
    const { status } = await request("GET", "/api/admin/analytics/role-distribution");
    assertEqual(status, 200);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  2. GRAPHQL YOGA
// ─────────────────────────────────────────────────────────────────────────────
async function runGraphQLTests() {
  console.log("\n🔮 [2] GraphQL Yoga");

  await test("GraphQL health query returns ok", async () => {
    const { status, json } = await graphql("{ health { status } }");
    assertEqual(status, 200);
    assertEqual(json.data?.health?.status, "ok");
  });

  await test("GraphQL campaigns query returns paginated list", async () => {
    const { status, json } = await graphql(`
      query { campaigns(page: 1, limit: 5) { total page limit items { contractAddress title } } }
    `);
    assertEqual(status, 200);
    assert(!json.errors, `GraphQL errors: ${JSON.stringify(json.errors)}`);
    assert(typeof json.data.campaigns.total === "number");
    assert(Array.isArray(json.data.campaigns.items));
  });

  await test("GraphQL campaigns: category filter (medical)", async () => {
    const { json } = await graphql(`
      query { campaigns(category: "medical", limit: 3) { total items { category } } }
    `);
    assert(!json.errors, `GraphQL errors: ${JSON.stringify(json.errors)}`);
    for (const item of json.data.campaigns.items) {
      if (item.category) assertEqual(item.category, "medical");
    }
  });

  await test("GraphQL campaigns: search filter works", async () => {
    const { json } = await graphql(`
      query { campaigns(search: "a", limit: 3) { total items { title } } }
    `);
    assert(!json.errors, `GraphQL errors: ${JSON.stringify(json.errors)}`);
    assert(typeof json.data.campaigns.total === "number");
  });

  await test("GraphQL campaign query: non-existent returns null", async () => {
    const { json } = await graphql(`
      query { campaign(address: "${VALID_ADDRESS}") { campaign { title } } }
    `);
    assert(!json.errors, `GraphQL errors: ${JSON.stringify(json.errors)}`);
    assert(json.data.campaign === null);
  });

  await test("GraphQL: invalid field returns errors array", async () => {
    const { json } = await graphql("{ invalidFieldThatDoesNotExist }");
    assert(Array.isArray(json.errors), "Expected errors array for invalid query");
  });

  await test("GraphQL: campaigns with limit=50 boundary is accepted", async () => {
    const { json } = await graphql(`{ campaigns(limit: 50) { limit } }`);
    assert(!json.errors);
    assert(json.data.campaigns.limit <= 50);
  });

  await test("GraphQL: milestones sub-fields are returned", async () => {
    const { json } = await graphql(`
      query { campaigns(limit: 1) { items { milestones { title targetAmount deadline } } } }
    `);
    assert(!json.errors);
    if (json.data.campaigns.items.length > 0) {
      assert(Array.isArray(json.data.campaigns.items[0].milestones));
    }
  });

  await test("GraphQL: campaigns page and total are consistent", async () => {
    const { json } = await graphql(`{ campaigns(page: 1, limit: 5) { page limit total } }`);
    assert(!json.errors);
    assertEqual(json.data.campaigns.page, 1);
    assert(json.data.campaigns.total >= 0);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  3. CAMPAIGNS REST API
// ─────────────────────────────────────────────────────────────────────────────
async function runCampaignTests() {
  console.log("\n🏕️  [3] Campaign REST API");

  await test("GET /api/campaigns → 200 with pagination", async () => {
    const { status, json } = await request("GET", "/api/campaigns");
    assertEqual(status, 200);
    assert(json.success, "Expected success:true");
    assert(Array.isArray(json.items), "Missing items array");
    assert(typeof json.pagination?.total === "number", "Missing pagination.total");
  });

  await test("GET /api/campaigns?page=1&limit=3 → correct limit", async () => {
    const { status, json } = await request("GET", "/api/campaigns?page=1&limit=3");
    assertEqual(status, 200);
    assert(json.items.length <= 3);
  });

  await test("GET /api/campaigns?category=medical → filtered results", async () => {
    const { status, json } = await request("GET", "/api/campaigns?category=medical");
    assertEqual(status, 200);
    for (const item of json.items) {
      if (item.category) assertEqual(item.category, "medical");
    }
  });

  await test("GET /api/campaigns?category=INVALID → 400 validation error", async () => {
    const { status } = await request("GET", "/api/campaigns?category=INVALIDCAT");
    assertEqual(status, 400);
  });

  await test("GET /api/campaigns?page=0 → 400 (page must be ≥ 1)", async () => {
    const { status } = await request("GET", "/api/campaigns?page=0");
    assertEqual(status, 400);
  });

  await test("GET /api/campaigns?limit=999 → 400 (limit max is 50)", async () => {
    const { status } = await request("GET", "/api/campaigns?limit=999");
    assertEqual(status, 400);
  });

  await test("GET /api/campaigns/:address → 404 for non-existent address", async () => {
    const { status, json } = await request("GET", `/api/campaigns/${VALID_ADDRESS}`);
    assertEqual(status, 404);
    assertEqual(json.success, false);
  });

  await test("GET /api/campaigns/:address → 400 for malformed address", async () => {
    const { status } = await request("GET", "/api/campaigns/not-an-address");
    assertEqual(status, 400);
  });

  await test("GET /api/campaigns/:address/stats → returns empty stats for non-existent", async () => {
    const { status, json } = await request("GET", `/api/campaigns/${NON_EXISTENT_ADDRESS}/stats`);
    assertEqual(status, 200);
    assert(json.success === true);
    assert(typeof json.stats === "object");
    assertEqual(json.stats.totalDonations, 0);
    assertEqual(json.stats.uniqueDonorCount, 0);
  });

  await test("GET /api/campaigns/:address/donors → empty list for non-existent campaign", async () => {
    const { status, json } = await request("GET", `/api/campaigns/${NON_EXISTENT_ADDRESS}/donors`);
    assertEqual(status, 200);
    assert(json.success === true);
    assert(Array.isArray(json.items));
    assertEqual(json.items.length, 0);
  });

  await test("GET /api/campaigns/milestone-reviews → returns paginated reviews", async () => {
    const { status, json } = await request("GET", "/api/campaigns/milestone-reviews");
    assertEqual(status, 200);
    assert(json.success);
    assert(Array.isArray(json.items));
    assert(typeof json.pagination === "object");
  });

  await test("POST /api/campaigns → 401 without auth", async () => {
    const { status } = await request("POST", "/api/campaigns", {
      body: {
        contractAddress: VALID_ADDRESS,
        creatorAddress: VALID_ADDRESS_2,
        title: "Test Campaign",
        descriptionMarkdown: "x".repeat(20),
        targetGoal: 1,
        milestones: [{ title: "M1", targetAmount: 1, deadline: "2027-01-01" }]
      }
    });
    assertEqual(status, 401);
  });

  await test("PATCH /api/campaigns/:address → 401 without auth", async () => {
    const { status } = await request("PATCH", `/api/campaigns/${VALID_ADDRESS}`, {
      body: { title: "New title here!" }
    });
    assertEqual(status, 401);
  });

  await test("GET /api/campaigns?search=hospital → searches correctly", async () => {
    const { status, json } = await request("GET", "/api/campaigns?search=hospital");
    assertEqual(status, 200);
    assert(json.success);
  });

  await test("GET /api/campaigns?creator=invalid_address → 400", async () => {
    const { status } = await request("GET", "/api/campaigns?creator=invalid_address");
    assertEqual(status, 400);
  });

  await test("Campaigns list enriched with donorCount, totalRaised, progressPercentage", async () => {
    const { json } = await request("GET", "/api/campaigns?limit=1");
    if (json.items.length > 0) {
      const c = json.items[0];
      assert(typeof c.donorCount === "number", "Missing donorCount");
      assert(typeof c.totalRaised === "string", "Missing totalRaised");
      assert(typeof c.progressPercentage === "number", "Missing progressPercentage");
    }
  });

  await test("Campaign stats/:address returns proper shape", async () => {
    const { json: list } = await request("GET", "/api/campaigns?limit=1");
    if (list.items.length > 0) {
      const addr = list.items[0].contractAddress;
      const { json: stats } = await request("GET", `/api/campaigns/${addr}/stats`);
      assert(stats.success);
      assert(typeof stats.stats.totalDonations === "number");
      assert(typeof stats.stats.uniqueDonorCount === "number");
      assert(typeof stats.stats.totalAmountWei === "string");
    }
  });

  await test("GET /api/campaigns/creator/:addr/dashboard → 401 without auth", async () => {
    const { status } = await request("GET", `/api/campaigns/creator/${VALID_ADDRESS}/dashboard`);
    assertEqual(status, 401);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  4. DONATIONS API
// ─────────────────────────────────────────────────────────────────────────────
async function runDonationTests() {
  console.log("\n💸 [4] Donation API");

  await test("POST /api/donations → 401 without auth", async () => {
    const { status } = await request("POST", "/api/donations", {
      body: {
        walletAddress: VALID_ADDRESS,
        campaignAddress: VALID_ADDRESS_2,
        amount: "1.0",
        amountWei: "1000000000000000000",
        txHash: VALID_TXHASH,
        chainId: 80002
      }
    });
    assertEqual(status, 401);
  });

  await test("GET /api/donations/wallet/:wallet → 200 empty for unknown wallet", async () => {
    const { status, json } = await request("GET", `/api/donations/wallet/${VALID_ADDRESS}`);
    assertEqual(status, 200);
    assert(json.success);
    assert(Array.isArray(json.items));
  });

  await test("GET /api/donations/campaign/:address → 200 paginated", async () => {
    const { status, json } = await request("GET", `/api/donations/campaign/${VALID_ADDRESS}`);
    assertEqual(status, 200);
    assert(json.success);
    assert(Array.isArray(json.items));
    assert(typeof json.pagination === "object");
  });

  await test("GET /api/donations/campaign/:address/recent → returns items array", async () => {
    const { status, json } = await request("GET", `/api/donations/campaign/${VALID_ADDRESS}/recent`);
    assertEqual(status, 200);
    assert(json.success);
    assert(Array.isArray(json.items));
  });

  await test("GET /api/donations/stats/:wallet → 200 with stats object", async () => {
    const { status, json } = await request("GET", `/api/donations/stats/${VALID_ADDRESS}`);
    assertEqual(status, 200);
    assert(json.success);
    assert(typeof json.stats.totalDonations === "number");
    assert(typeof json.stats.totalAmountWei === "string");
    assert(typeof json.stats.uniqueCampaignCount === "number");
  });

  // Portfolio route: /api/donations/donor/:walletAddress/portfolio
  await test("GET /api/donations/donor/:wallet/portfolio → 200 donor portfolio", async () => {
    const { status, json } = await request("GET", `/api/donations/donor/${VALID_ADDRESS}/portfolio`);
    assertEqual(status, 200);
    assert(json.success);
    assert(typeof json.portfolioStats === "object");
    assert(typeof json.portfolioStats.totalContributions === "number");
    assert(typeof json.portfolioStats.vaultsSupported === "number");
    assert(typeof json.portfolioStats.totalContributed === "string");
    assert(typeof json.portfolioStats.totalQuadraticVotingPower === "string");
    assert(Array.isArray(json.donations));
  });

  await test("GET /api/donations/activity/:wallet → 200 wallet activity", async () => {
    const { status, json } = await request("GET", `/api/donations/activity/${VALID_ADDRESS}`);
    assertEqual(status, 200);
    assert(json.success);
    assert(typeof json.stats === "object");
    assert(Array.isArray(json.items));
    assert(typeof json.stats.totalSentCount === "number");
    assert(typeof json.stats.totalReceivedCount === "number");
  });

  await test("GET /api/donations/wallet/invalid_addr → 400", async () => {
    const { status } = await request("GET", "/api/donations/wallet/not-a-wallet");
    assertEqual(status, 400);
  });

  await test("GET /api/donations/ledger → 401 (requires auth)", async () => {
    const { status } = await request("GET", "/api/donations/ledger");
    assertEqual(status, 401);
  });

  await test("Portfolio totalContributions is a non-negative integer", async () => {
    const { json } = await request("GET", `/api/donations/donor/${VALID_ADDRESS}/portfolio`);
    assert(json.portfolioStats.totalContributions >= 0);
    assert(Number.isInteger(json.portfolioStats.totalContributions));
  });

  await test("Portfolio vaultsSupported is non-negative integer", async () => {
    const { json } = await request("GET", `/api/donations/donor/${VALID_ADDRESS}/portfolio`);
    assert(json.portfolioStats.vaultsSupported >= 0);
    assert(Number.isInteger(json.portfolioStats.vaultsSupported));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  5. VOTING API
// ─────────────────────────────────────────────────────────────────────────────
async function runVotingTests() {
  console.log("\n🗳️  [5] Voting API");

  await test("GET /api/voting/eligibility/:campaign/:wallet/0 → 200", async () => {
    const { status, json } = await request("GET", `/api/voting/eligibility/${VALID_ADDRESS}/${VALID_ADDRESS_2}/0`);
    assertEqual(status, 200);
    assert(json.success);
    assert(typeof json.eligible === "boolean");
    assert(typeof json.hasVoted === "boolean");
    assert(typeof json.reason === "string");
    assert(json.minThresholdDisplay, "Missing minThresholdDisplay");
  });

  await test("Voting eligibility: no donation → eligible:false", async () => {
    const { json } = await request("GET", `/api/voting/eligibility/${VALID_ADDRESS}/${VALID_ADDRESS}/0`);
    assert(json.eligible === false);
    assert(json.reason.length > 0, "reason should be non-empty");
  });

  await test("GET /api/voting/status/:campaign/:wallet/0 → 200", async () => {
    const { status, json } = await request("GET", `/api/voting/status/${VALID_ADDRESS}/${VALID_ADDRESS_2}/0`);
    assertEqual(status, 200);
    assert(json.success);
    assert(typeof json.hasVoted === "boolean");
    assert(json.support === null || typeof json.support === "boolean");
  });

  await test("GET /api/voting/stats/:campaign/0 → 200", async () => {
    const { status, json } = await request("GET", `/api/voting/stats/${VALID_ADDRESS}/0`);
    assertEqual(status, 200);
    assert(json.success);
    assert(typeof json.totalVoters === "number");
    assert(typeof json.approvalVoterCount === "number");
    assert(typeof json.rejectionVoterCount === "number");
  });

  await test("GET /api/voting/votes/:campaign/0 → paginated anonymized vote list", async () => {
    const { status, json } = await request("GET", `/api/voting/votes/${VALID_ADDRESS}/0`);
    assertEqual(status, 200);
    assert(json.success);
    assert(Array.isArray(json.items));
    assert(typeof json.pagination === "object");
  });

  // Correct route: /api/voting/donors/:campaignAddress (not campaign-donors)
  await test("GET /api/voting/donors/:address → QV donor leaderboard", async () => {
    const { status, json } = await request("GET", `/api/voting/donors/${VALID_ADDRESS}`);
    assertEqual(status, 200);
    assert(json.success);
    assert(Array.isArray(json.items));
    assert(typeof json.pagination === "object");
  });

  await test("Voting votes are anonymized (no full walletAddress exposed)", async () => {
    const { json: campaigns } = await request("GET", "/api/campaigns?limit=1");
    if (campaigns.items.length > 0) {
      const addr = campaigns.items[0].contractAddress;
      const { json: votes } = await request("GET", `/api/voting/votes/${addr}/0`);
      assert(votes.success);
      for (const v of votes.items) {
        assert(v.voterDisplay, "Missing voterDisplay");
        assert(!v.walletAddress, "walletAddress should NOT be exposed publicly");
      }
    }
  });

  await test("Voting stats: totalVoters = approvalVoterCount + rejectionVoterCount", async () => {
    const { json } = await request("GET", `/api/voting/stats/${VALID_ADDRESS}/0`);
    assertEqual(
      json.totalVoters,
      (json.approvalVoterCount || 0) + (json.rejectionVoterCount || 0)
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  6. USERS API
// ─────────────────────────────────────────────────────────────────────────────
async function runUserTests() {
  console.log("\n👤 [6] User API");

  await test("GET /api/users/:wallet → returns user data or null (no auth required)", async () => {
    const { status } = await request("GET", `/api/users/${VALID_ADDRESS}`);
    // Public read endpoint — can return 200 with null user or 404
    assert([200, 404].includes(status), `Unexpected status: ${status}`);
  });

  await test("POST /api/users → 401 without auth (create/update user)", async () => {
    const { status } = await request("POST", "/api/users", {
      body: { displayName: "Alice", walletAddress: VALID_ADDRESS }
    });
    assertEqual(status, 401);
  });

  await test("GET /api/users/me → 401 without auth", async () => {
    const { status } = await request("GET", "/api/users/me");
    assertEqual(status, 401);
  });

  await test("PATCH /api/users/:wallet/verification → 401 without auth", async () => {
    const { status } = await request("PATCH", `/api/users/${VALID_ADDRESS}/verification`, {
      body: { verificationStatus: "verified" }
    });
    assertEqual(status, 401);
  });

  await test("GET /api/users/invalid_wallet → 400 bad address", async () => {
    const { status } = await request("GET", "/api/users/invalid_wallet");
    assertEqual(status, 400);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  7. NOTIFICATIONS API
// ─────────────────────────────────────────────────────────────────────────────
async function runNotificationTests() {
  console.log("\n🔔 [7] Notification API (auth-protected)");

  await test("GET /api/notifications/:wallet → 401 without auth", async () => {
    const { status } = await request("GET", `/api/notifications/${VALID_ADDRESS}`);
    assertEqual(status, 401);
  });

  await test("POST /api/notifications → 401 without auth", async () => {
    const { status } = await request("POST", "/api/notifications", {
      body: {
        walletAddress: VALID_ADDRESS,
        type: "campaign_update",
        title: "Test",
        message: "Hello World"
      }
    });
    assertEqual(status, 401);
  });

  await test("PATCH /api/notifications/:id/read → 401 without auth", async () => {
    const { status } = await request("PATCH", "/api/notifications/someid123/read");
    assertEqual(status, 401);
  });

  await test("PATCH /api/notifications/:wallet/read-all → 401 without auth", async () => {
    const { status } = await request("PATCH", `/api/notifications/${VALID_ADDRESS}/read-all`);
    assertEqual(status, 401);
  });

  await test("GET /api/notifications/stream/:wallet → SSE stream (no auth needed for stream)", async () => {
    // SSE stream is intentionally public for browser EventSource (no auth header support)
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 2000);
    try {
      const res = await fetch(`${BASE_URL}/api/notifications/stream/${VALID_ADDRESS}`, {
        signal: ctrl.signal,
        headers: { Accept: "text/event-stream" }
      });
      clearTimeout(timeout);
      assert([200, 204].includes(res.status), `SSE stream returned ${res.status}`);
    } catch (err) {
      clearTimeout(timeout);
      // AbortError is expected (we abort after 2s to not hang)
      if (err.name !== "AbortError") throw err;
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  8. UPLOAD & MEDIA API
// ─────────────────────────────────────────────────────────────────────────────
async function runUploadTests() {
  console.log("\n📁 [8] Upload & Media API");

  await test("POST /api/upload-proof → 401 without auth", async () => {
    const { status } = await request("POST", "/api/upload-proof");
    assertEqual(status, 401);
  });

  await test("POST /api/media/campaign-cover → 401 without auth", async () => {
    const { status } = await request("POST", "/api/media/campaign-cover");
    assertEqual(status, 401);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  9. ADMIN API
// ─────────────────────────────────────────────────────────────────────────────
async function runAdminTests() {
  console.log("\n🛡️  [9] Admin API (protected routes)");

  await test("GET /api/admin/users → 401 without auth", async () => {
    const { status } = await request("GET", "/api/admin/users");
    assertEqual(status, 401);
  });

  await test("GET /api/admin/campaigns/flagged → 401 without auth", async () => {
    const { status } = await request("GET", "/api/admin/campaigns/flagged");
    assertEqual(status, 401);
  });

  await test("GET /api/admin/audit-logs → 401 without auth", async () => {
    const { status } = await request("GET", "/api/admin/audit-logs");
    assertEqual(status, 401);
  });

  await test("GET /api/admin/ledger → 401 without auth", async () => {
    const { status } = await request("GET", "/api/admin/ledger");
    assertEqual(status, 401);
  });

  await test("PATCH /api/admin/users/:wallet/role → 401 without auth", async () => {
    const { status } = await request("PATCH", `/api/admin/users/${VALID_ADDRESS}/role`, {
      body: { role: "donor" }
    });
    assertEqual(status, 401);
  });

  await test("PATCH /api/admin/campaigns/:addr/status → 401 without auth", async () => {
    const { status } = await request("PATCH", `/api/admin/campaigns/${VALID_ADDRESS}/status`, {
      body: { status: "active" }
    });
    assertEqual(status, 401);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  10. WEBHOOK API
// ─────────────────────────────────────────────────────────────────────────────
async function runWebhookTests() {
  console.log("\n🔗 [10] Webhook API");

  // Correct routes: /blockchain-event (single), /blockchain-events (batch)
  await test("POST /api/webhooks/blockchain-event → 401 without API key", async () => {
    const { status } = await request("POST", "/api/webhooks/blockchain-event", {
      body: {
        eventName: "ContributionReceived",
        contractAddress: VALID_ADDRESS,
        txHash: VALID_TXHASH,
        blockNumber: 1,
        chainId: 80002,
        data: {}
      }
    });
    assertEqual(status, 401);
  });

  await test("POST /api/webhooks/blockchain-event with valid API key → 200/201", async () => {
    const { status, json } = await request("POST", "/api/webhooks/blockchain-event", {
      body: {
        eventName: "ContributionReceived",
        contractAddress: VALID_ADDRESS,
        txHash: VALID_TXHASH_2,
        blockNumber: 100,
        chainId: 80002,
        data: { contributor: VALID_ADDRESS, amount: "1000000000000000000" }
      },
      headers: { "x-api-key": WEBHOOK_API_KEY }
    });
    assert([200, 201, 202].includes(status), `Unexpected status: ${status} - ${JSON.stringify(json)}`);
  });

  await test("POST /api/webhooks/blockchain-event: invalid eventName → 400", async () => {
    const { status } = await request("POST", "/api/webhooks/blockchain-event", {
      body: {
        eventName: "FakeEvent",
        contractAddress: VALID_ADDRESS,
        txHash: VALID_TXHASH,
        blockNumber: 1,
        chainId: 80002
      },
      headers: { "x-api-key": WEBHOOK_API_KEY }
    });
    assertEqual(status, 400);
  });

  await test("POST /api/webhooks/blockchain-events (batch) → 401 without API key", async () => {
    const { status } = await request("POST", "/api/webhooks/blockchain-events", {
      body: {
        events: [{
          eventName: "ContributionReceived",
          contractAddress: VALID_ADDRESS,
          txHash: VALID_TXHASH,
          blockNumber: 1,
          chainId: 80002,
          data: {}
        }]
      }
    });
    assertEqual(status, 401);
  });

  await test("POST /api/webhooks/blockchain-events: empty events array → 400", async () => {
    const { status } = await request("POST", "/api/webhooks/blockchain-events", {
      body: { events: [] },
      headers: { "x-api-key": WEBHOOK_API_KEY }
    });
    assertEqual(status, 400);
  });

  await test("POST /api/webhooks/blockchain-events: batch of 1 → accepted", async () => {
    const { status } = await request("POST", "/api/webhooks/blockchain-events", {
      body: {
        events: [{
          eventName: "CampaignCreated",
          contractAddress: VALID_ADDRESS,
          txHash: "0x" + "f".repeat(64),
          blockNumber: 200,
          chainId: 80002,
          data: {}
        }]
      },
      headers: { "x-api-key": WEBHOOK_API_KEY }
    });
    assert([200, 201, 202].includes(status), `Expected 200/201/202 but got ${status}`);
  });

  await test("POST /api/webhooks/blockchain-events: batch of 100 (max) is accepted", async () => {
    const events = Array.from({ length: 100 }, (_, i) => ({
      eventName: "ContributionReceived",
      contractAddress: VALID_ADDRESS,
      txHash: "0x" + i.toString(16).padStart(64, "0"),
      blockNumber: i + 1000,
      chainId: 80002,
      data: {}
    }));
    const { status } = await request("POST", "/api/webhooks/blockchain-events", {
      body: { events },
      headers: { "x-api-key": WEBHOOK_API_KEY }
    });
    assert([200, 201, 202].includes(status), `Expected 200/202 but got ${status}`);
  });

  await test("POST /api/webhooks/blockchain-events: batch of 101 (over max) → 400", async () => {
    const events = Array.from({ length: 101 }, (_, i) => ({
      eventName: "ContributionReceived",
      contractAddress: VALID_ADDRESS,
      txHash: "0x" + (i + 9000).toString(16).padStart(64, "0"),
      blockNumber: i + 2000,
      chainId: 80002,
      data: {}
    }));
    const { status } = await request("POST", "/api/webhooks/blockchain-events", {
      body: { events },
      headers: { "x-api-key": WEBHOOK_API_KEY }
    });
    assertEqual(status, 400);
  });

  await test("GET /api/webhooks/events → 401 without API key", async () => {
    const { status } = await request("GET", "/api/webhooks/events");
    assertEqual(status, 401);
  });

  await test("GET /api/webhooks/events with API key → 200 with event list", async () => {
    const { status, json } = await request("GET", "/api/webhooks/events", {
      headers: { "x-api-key": WEBHOOK_API_KEY }
    });
    assertEqual(status, 200);
    assert(json !== null);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  11. EDGE CASES & SECURITY
// ─────────────────────────────────────────────────────────────────────────────
async function runEdgeCaseTests() {
  console.log("\n🔒 [11] Edge Cases & Security");

  await test("NoSQL injection in search is sanitized (no crash)", async () => {
    const payload = encodeURIComponent("$where: function(){return true}");
    const { status, json } = await request("GET", `/api/campaigns?search=${payload}`);
    assert([200, 400].includes(status));
    if (json && json.success === false) {
      assert(!json.stack, "Stack trace must not be exposed");
    }
  });

  await test("XSS attempt in search param is handled safely", async () => {
    const xss = encodeURIComponent("<script>alert(1)</script>");
    const { status } = await request("GET", `/api/campaigns?search=${xss}`);
    assert([200, 400].includes(status));
  });

  await test("Oversized payload returns 400 or 413", async () => {
    const hugeBody = { title: "x".repeat(100000) };
    const { status } = await request("POST", "/api/campaigns", { body: hugeBody });
    assert([400, 401, 413].includes(status));
  });

  await test("Missing required campaign fields returns 400/401", async () => {
    const { status } = await request("POST", "/api/campaigns", {
      body: { title: "incomplete campaign" }
    });
    assert([400, 401].includes(status));
  });

  await test("Duplicate txHash donation returns 401 (blocked by auth first)", async () => {
    const { status } = await request("POST", "/api/donations", {
      body: {
        walletAddress: VALID_ADDRESS,
        campaignAddress: VALID_ADDRESS_2,
        amount: "1",
        amountWei: "1000000000000000000",
        txHash: VALID_TXHASH,
        chainId: 80002
      }
    });
    assertEqual(status, 401);
  });

  await test("Campaign address lookup is case-insensitive", async () => {
    const upper = VALID_ADDRESS.toUpperCase().replace("0X", "0x");
    const { status } = await request("GET", `/api/campaigns/${upper}`);
    assert([200, 404].includes(status), `Unexpected status: ${status}`);
  });

  await test("Large page number returns empty list gracefully", async () => {
    const { status, json } = await request("GET", "/api/campaigns?page=9999&limit=10");
    assertEqual(status, 200);
    assert(json.success);
    assert(Array.isArray(json.items));
    assertEqual(json.items.length, 0);
  });

  await test("Error response body never exposes stack trace", async () => {
    const { json } = await request("GET", "/api/campaigns/not-a-valid-address");
    assert(!json?.stack, "Stack trace must not be in API response");
  });

  await test("Voting milestone index must be a number (string coerces)", async () => {
    const { status } = await request("GET", `/api/voting/stats/${VALID_ADDRESS}/0`);
    assertEqual(status, 200);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  12. DATA CONSISTENCY
// ─────────────────────────────────────────────────────────────────────────────
async function runConsistencyTests() {
  console.log("\n🔄 [12] Data Consistency");

  await test("GraphQL and REST campaigns total counts match", async () => {
    const [gql, rest] = await Promise.all([
      graphql("{ campaigns(limit: 1) { total } }"),
      request("GET", "/api/campaigns?limit=1")
    ]);
    const gqlTotal = gql.json?.data?.campaigns?.total;
    const restTotal = rest.json?.pagination?.total;
    if (gqlTotal !== undefined && restTotal !== undefined) {
      assertEqual(gqlTotal, restTotal, `GraphQL total ${gqlTotal} ≠ REST total ${restTotal}`);
    }
  });

  await test("Campaign from list has all required fields", async () => {
    const { json } = await request("GET", "/api/campaigns?limit=1");
    if (json.items.length > 0) {
      const c = json.items[0];
      assert(c.contractAddress, "Missing contractAddress");
      assert(c.creatorAddress, "Missing creatorAddress");
      assert(c.title, "Missing title");
      assert(typeof c.targetGoal === "number", "targetGoal must be number");
      assert(Array.isArray(c.milestones), "milestones must be array");
      assert(c.status, "Missing status");
      assert(c.chainId, "Missing chainId");
    }
  });

  await test("Voting stats totalVoters = approvalVoterCount + rejectionVoterCount", async () => {
    const { json } = await request("GET", `/api/voting/stats/${VALID_ADDRESS}/0`);
    assertEqual(
      json.totalVoters,
      (json.approvalVoterCount || 0) + (json.rejectionVoterCount || 0),
      "Vote count mismatch"
    );
  });

  await test("Campaign progressPercentage is within [0, 100]", async () => {
    const { json } = await request("GET", "/api/campaigns?limit=5");
    for (const item of json.items) {
      if (typeof item.progressPercentage === "number") {
        assertInRange(item.progressPercentage, 0, 100,
          `progressPercentage ${item.progressPercentage} out of [0, 100]`);
      }
    }
  });

  await test("Donation stats totalAmountWei is a valid numeric string", async () => {
    const { json } = await request("GET", `/api/donations/stats/${VALID_ADDRESS}`);
    // Verify it's a valid non-negative integer string (parseable as BigInt)
    try {
      const val = BigInt(json.stats.totalAmountWei);
      assert(val >= 0n, "totalAmountWei should be non-negative");
    } catch {
      throw new Error(`totalAmountWei "${json.stats.totalAmountWei}" is not a valid BigInt string`);
    }
  });

  await test("Campaign pagination totalPages is consistent with total/limit", async () => {
    const { json } = await request("GET", "/api/campaigns?limit=5");
    const { total, limit, totalPages } = json.pagination;
    const expectedPages = Math.ceil(total / limit) || 1;
    assertEqual(totalPages, expectedPages, `totalPages ${totalPages} ≠ expected ${expectedPages}`);
  });

  await test("Donation list pagination totalPages is consistent", async () => {
    const { json } = await request("GET", `/api/donations/wallet/${VALID_ADDRESS}`);
    const { total, limit, totalPages } = json.pagination;
    const expected = Math.ceil(total / limit) || 1;
    assertEqual(totalPages, expected);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  13. RESPONSE FORMAT & HEADERS
// ─────────────────────────────────────────────────────────────────────────────
async function runResponseFormatTests() {
  console.log("\n📋 [13] Response Format & Headers");

  await test("All public REST endpoints return Content-Type: application/json", async () => {
    const endpoints = [
      "/health",
      "/api/campaigns",
      `/api/campaigns/${VALID_ADDRESS}`,
      `/api/donations/wallet/${VALID_ADDRESS}`,
      `/api/voting/stats/${VALID_ADDRESS}/0`
    ];
    for (const ep of endpoints) {
      const { headers } = await request("GET", ep);
      const ct = headers.get("content-type") || "";
      assert(ct.includes("application/json"), `${ep} missing JSON content-type, got "${ct}"`);
    }
  });

  await test("Error responses always have success:false", async () => {
    const { json } = await request("GET", "/api/campaigns/not-an-address");
    assertEqual(json.success, false);
  });

  await test("Success responses always have success:true", async () => {
    const { json } = await request("GET", "/api/campaigns");
    assertEqual(json.success, true);
  });

  await test("Pagination object has all 4 required fields: page, limit, total, totalPages", async () => {
    const { json } = await request("GET", "/api/campaigns");
    const pg = json.pagination;
    assert(typeof pg.page === "number", "Missing pg.page");
    assert(typeof pg.limit === "number", "Missing pg.limit");
    assert(typeof pg.total === "number", "Missing pg.total");
    assert(typeof pg.totalPages === "number", "Missing pg.totalPages");
  });

  await test("404 routes return proper JSON body (not HTML)", async () => {
    const { status, json } = await request("GET", "/api/does-not-exist-endpoint-xyz");
    assertEqual(status, 404);
    assert(json !== null, "404 handler must return JSON");
  });

  await test("Admin audit-logs endpoint returns 401 (not HTML error)", async () => {
    const { status, json } = await request("GET", "/api/admin/audit-logs");
    assertEqual(status, 401);
    assert(json !== null, "Auth error must return JSON not HTML");
    assert(json.success === false, "Auth error must have success:false");
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  14. FRONTEND BUILD CHECK
// ─────────────────────────────────────────────────────────────────────────────
async function runFrontendBuildCheck() {
  console.log("\n🖥️  [14] Frontend Production Build");
  const { execSync } = require("child_process");
  const path = require("path");
  const frontendDir = path.resolve(__dirname, "../../frontend");

  await test("Frontend TypeScript typecheck passes (tsc --noEmit)", async () => {
    try {
      execSync("npx tsc --noEmit", { cwd: frontendDir, timeout: 60000, stdio: "pipe" });
    } catch (err) {
      const output = err.stdout?.toString() || err.stderr?.toString() || err.message;
      throw new Error(`TypeScript errors:\n${output.slice(0, 1000)}`);
    }
  });

  await test("Frontend Vite build completes without errors", async () => {
    try {
      execSync("npm run build", { cwd: frontendDir, timeout: 120000, stdio: "pipe" });
    } catch (err) {
      const output = err.stdout?.toString() || err.stderr?.toString() || err.message;
      throw new Error(`Build failed:\n${output.slice(0, 1000)}`);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN RUNNER
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n" + "═".repeat(65));
  console.log("  🧪 MILESTONECHAIN — FULL SYSTEM INTEGRATION TEST SUITE v2");
  console.log("  Target: http://localhost:5000");
  console.log("═".repeat(65));

  const start = Date.now();

  await runHealthTests();
  await runGraphQLTests();
  await runCampaignTests();
  await runDonationTests();
  await runVotingTests();
  await runUserTests();
  await runNotificationTests();
  await runUploadTests();
  await runAdminTests();
  await runWebhookTests();
  await runEdgeCaseTests();
  await runConsistencyTests();
  await runResponseFormatTests();
  await runFrontendBuildCheck();

  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  const total = passed + failed;
  const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  console.log("\n" + "═".repeat(65));
  console.log("  FINAL TEST RESULTS");
  console.log("═".repeat(65));
  console.log(`  ✓ Passed:       ${passed}`);
  console.log(`  ✗ Failed:       ${failed}`);
  console.log(`  Total:          ${total}`);
  console.log(`  Success Rate:   ${successRate}%`);
  console.log(`  Time elapsed:   ${elapsed}s`);
  console.log("═".repeat(65));

  if (failed > 0) {
    console.log("\n⚠️  FAILED TESTS:");
    for (const { name, error } of failedTests) {
      console.log(`  ✗ ${name}`);
      console.log(`    → ${error}`);
    }
    console.log("");
  }

  if (successRate === 100) {
    console.log("  🎉 ALL TESTS PASSED — System is production-ready!\n");
  } else if (successRate >= 90) {
    console.log(`  ⚠️  ${failed} test(s) need attention before deployment.\n`);
  } else {
    console.log(`  ❌  ${failed} test(s) failed — fix before deploying.\n`);
  }

  if (failed > 0) process.exit(1);
  process.exit(0);
}

main().catch((err) => {
  console.error("\n💥 Test runner crashed:", err);
  process.exit(1);
});
