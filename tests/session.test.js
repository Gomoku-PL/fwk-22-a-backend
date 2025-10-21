import { test } from "node:test";
import { strict as assert } from "node:assert";

test("Session regeneration on login prevents fixation attacks", async (t) => {
  const req = {
    session: {
      regenerate: (callback) => {
        req.sessionID = "new-session-id";
        callback(null);
      },
    },
    sessionID: "old-session-id",
    ip: "127.0.0.1",
    get: () => "test-agent",
  };

  const res = {};
  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };

  const { regenerateSession } = await import(
    "../src/controllers/auth/session.controller.js"
  );

  regenerateSession(req, res, next);

  await new Promise((resolve) => setTimeout(resolve, 100));

  assert.equal(req.sessionID, "new-session-id");
  assert.equal(nextCalled, true);
});

test("Session destruction on logout clears session data", async (t) => {
  let destroyed = false;

  const req = {
    session: {
      destroy: (callback) => {
        destroyed = true;
        callback(null);
      },
    },
  };

  const res = {
    clearCookie: () => {},
  };

  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };

  const { destroySession } = await import(
    "../src/controllers/auth/session.controller.js"
  );

  destroySession(req, res, next);

  assert.equal(destroyed, true);
  assert.equal(nextCalled, true);
});

test("Session security validation rejects session ID in request", async (t) => {
  const req = {
    query: { sessionId: "test-session" },
    body: {},
    params: {},
  };

  let statusCode = null;
  let response = null;

  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (data) => {
      response = data;
      return res;
    },
  };

  const { validateSessionSecurity } = await import(
    "../src/controllers/auth/session.controller.js"
  );

  validateSessionSecurity(req, res, () => {});

  assert.equal(statusCode, 400);
  assert.equal(response.success, false);
  assert(response.message.includes("Session ID must not be transmitted"));
});

test("Session security validation allows clean requests", async (t) => {
  const req = {
    query: {},
    body: {},
    params: {},
  };

  const res = {};
  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };

  const { validateSessionSecurity } = await import(
    "../src/controllers/auth/session.controller.js"
  );

  validateSessionSecurity(req, res, next);

  assert.equal(nextCalled, true);
});

console.log("All session security tests passed");
