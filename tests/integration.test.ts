/**
 * Full API flow against the Firestore emulator; never touches real data.
 *
 *   java -jar cloud-firestore-emulator.jar --host 127.0.0.1 --port 8681
 *   npm run test:integration
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { Timestamp } from '@google-cloud/firestore';
import jwt from 'jsonwebtoken';

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
assert.ok(emulatorHost, 'FIRESTORE_EMULATOR_HOST is required: this suite must never run against real Firestore');

process.env.GOOGLE_CLOUD_PROJECT = 'demo-informe-octavio';
process.env.EMAIL_MODE = 'mock';
process.env.CONFIG_STORAGE = 'firestore';
process.env.CONFIG_BUCKET = '';
process.env.APP_PUBLIC_URL = 'http://localhost:5173';
process.env.ADMIN_PASSWORD = 'test-admin';
process.env.ADMIN_SESSION_SECRET = 'test-admin-secret';
process.env.AUTH_SESSION_SECRET = 'test-session-secret';
process.env.AUTH_ENABLED = 'false';

const { createApp } = await import('../server/app.js');
const { createReviewToken, hashReviewToken } = await import('../server/reports/reviewToken.js');
const { CONFIG_DOCUMENT_ID, FIRESTORE_COLLECTIONS } = await import('../server/firestore/collections.js');
const { getFirestore } = await import('../server/repositories/firestore.js');
const { upsertUser } = await import('../server/repositories/usersRepository.js');
const { getReport, replaceApprovalToken } = await import('../server/repositories/reportsRepository.js');

const SUPERVISOR = 'supervisor@example.cl';
const PDF_BYTES = Buffer.from('%PDF-1.4 immutable test report');
const GUEST = { displayName: 'Tester Guest', email: 'Guest.Tester@Example.CL' };
const metrics = {
  activitiesCount: 2,
  activeEquipmentCount: 3,
  trucksCount: 2,
  machineryCount: 1,
  truckM3: 36,
  watermasterM3: 100,
};

let baseUrl = '';
let closeServer: () => void;

function sessionCookie(email: string): string {
  const token = jwt.sign({ email, name: 'Tester' }, 'test-session-secret', { subject: `id-${email}` });
  return `user_session=${token}`;
}

async function clearEmulator(): Promise<void> {
  await fetch(`http://${emulatorHost}/emulator/v1/projects/demo-informe-octavio/databases/(default)/documents`, {
    method: 'DELETE',
  });
}

async function submitReport(
  overrides: Record<string, unknown> = {},
  cookie?: string,
  photos: { name: string; type: string; bytes: Buffer }[] = [],
) {
  const form = new FormData();
  form.append(
    'payload',
    JSON.stringify({
      reportDate: '2026-11-01',
      supervisorEmail: SUPERVISOR,
      ccEmails: [],
      guestProfile: GUEST,
      metrics,
      summary: {
        area: 'Poza 13',
        supervisorName: 'Sup Ervisor',
        activities: [{ area: 'Poza 13', type: 'Cosecha' }],
        equipment: [{ code: 'CT-1', type: 'truck', activities: 1 }],
        watermasterHourlyPerformance: 50,
      },
      ...overrides,
    }),
  );
  form.append('pdf', new Blob([PDF_BYTES], { type: 'application/pdf' }), 'INFORME_DIARIO_2026-11-01.pdf');
  for (const photo of photos) {
    form.append('photos', new Blob([new Uint8Array(photo.bytes)], { type: photo.type }), photo.name);
  }
  return fetch(`${baseUrl}/api/reports`, { method: 'POST', body: form, headers: cookie ? { cookie } : {} });
}

/** The real token only travels by email, so tests issue a known one through the repository. */
async function reviewTokenFor(reportId: string): Promise<string> {
  const report = await getReport(reportId);
  assert.ok(report);
  const token = createReviewToken();
  await replaceApprovalToken(report, hashReviewToken(token));
  return token;
}

async function createdReportId(overrides: Record<string, unknown> = {}, cookie?: string): Promise<string> {
  const response = await submitReport(overrides, cookie);
  assert.equal(response.status, 201);
  return ((await response.json()) as { reportId: string }).reportId;
}

function decide(token: string, decision: string, cookie?: string, supervisorEmail = SUPERVISOR) {
  return fetch(`${baseUrl}/api/review/${token}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify({ decision, supervisorEmail }),
  });
}

function resend(reportId: string, supervisorEmail: unknown) {
  return fetch(`${baseUrl}/api/reports/${reportId}/resend-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ supervisorEmail }),
  });
}

async function withFailingEmail<T>(run: () => Promise<T>): Promise<T> {
  delete process.env.EMAIL_MODE;
  try {
    return await run();
  } finally {
    process.env.EMAIL_MODE = 'mock';
  }
}

async function reportCount(): Promise<number> {
  return (await getFirestore().collection(FIRESTORE_COLLECTIONS.reports).get()).size;
}

async function listItem(reportId: string) {
  const body = (await (await fetch(`${baseUrl}/api/reports?limit=100`)).json()) as {
    reports: { id: string; status: string; rejectionComment: string | null; canEdit: boolean }[];
  };
  return body.reports.find((report) => report.id === reportId);
}

async function storedReportTime(reportId: string): Promise<string> {
  const snapshot = await getFirestore().collection(FIRESTORE_COLLECTIONS.reports).doc(reportId).get();
  return snapshot.updateTime?.toDate().toISOString() ?? '';
}

function getReview(token: string, email = SUPERVISOR) {
  return fetch(`${baseUrl}/api/review/${token}`, { headers: { 'X-Review-Email': email } });
}

before(async () => {
  await clearEmulator();
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  closeServer = () => server.close();
});

after(async () => {
  closeServer();
  await getFirestore().terminate();
  await fs.rm(path.join(process.cwd(), '.local-reports'), { recursive: true, force: true });
});

test('Admin writes config to Firestore and GET /api/config serves it', async () => {
  const login = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'test-admin' }),
  });
  assert.equal(login.status, 200);
  const cookie = (login.headers.get('set-cookie') ?? '').split(';')[0] ?? '';

  const denied = await fetch(`${baseUrl}/api/admin/config`, { method: 'PUT' });
  assert.equal(denied.status, 401);

  const config = {
    generalAreas: [{ id: 'g1', name: 'Área 1' }],
    activityAreas: [{ id: 'a1', name: 'Poza 13' }],
    equipment: [{ id: 'e1', code: 'CT-1', type: 'truck', capacityM3: 18 }],
  };
  const saved = await fetch(`${baseUrl}/api/admin/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify(config),
  });
  assert.equal(saved.status, 200);

  const stored = await getFirestore().collection(FIRESTORE_COLLECTIONS.config).doc(CONFIG_DOCUMENT_ID).get();
  assert.deepEqual(stored.get('equipment'), config.equipment);

  const read = (await (await fetch(`${baseUrl}/api/config`)).json()) as { config: typeof config };
  assert.deepEqual(read.config, config);
});

test('generating stores the PDF, the report and only a hash of the token', async () => {
  const reportId = await createdReportId();
  const report = await getReport(reportId);
  assert.ok(report);
  assert.equal(report.status, 'IN_REVIEW');
  assert.equal(report.emailDelivery.status, 'SENT');
  assert.equal(report.storage.path, `reports/2026/11/${reportId}/INFORME_DIARIO_2026-11-01.pdf`);
  assert.equal(report.createdBy.displayName, 'Tester Guest');
  assert.equal(report.createdBy.email, 'guest.tester@example.cl');
  assert.match(report.createdBy.userId, /^guest:[0-9a-f]{64}$/);
  assert.equal(Object.hasOwn(report, 'guestProfile'), false);

  const approvals = await getFirestore().collection(FIRESTORE_COLLECTIONS.approvals).where('reportId', '==', reportId).get();
  assert.equal(approvals.size, 1);
  assert.match(approvals.docs[0]?.id ?? '', /^[0-9a-f]{64}$/);
  assert.equal(approvals.docs[0]?.get('usedAt'), null);
});

test('the stored PDF is served byte-identical, inline or as a download', async () => {
  const reportId = await createdReportId();

  const inline = await fetch(`${baseUrl}/api/reports/${reportId}/pdf`);
  assert.equal(inline.status, 200);
  assert.equal(inline.headers.get('content-type'), 'application/pdf');
  assert.match(inline.headers.get('content-disposition') ?? '', /^inline; filename="INFORME_DIARIO_2026-11-01\.pdf"/);
  assert.deepEqual(Buffer.from(await inline.arrayBuffer()), PDF_BYTES);

  const download = await fetch(`${baseUrl}/api/reports/${reportId}/pdf?download=true`);
  assert.match(download.headers.get('content-disposition') ?? '', /^attachment;/);

  assert.equal((await fetch(`${baseUrl}/api/reports/missing/pdf`)).status, 404);
});

test('invalid submissions are refused and store nothing', async () => {
  const before = (await getFirestore().collection(FIRESTORE_COLLECTIONS.reports).get()).size;

  const badEmail = await submitReport({ supervisorEmail: 'nope' });
  assert.equal(badEmail.status, 400);

  const form = new FormData();
  form.append('payload', JSON.stringify({ reportDate: '2026-11-01', supervisorEmail: SUPERVISOR, metrics }));
  form.append('pdf', new Blob(['not a pdf'], { type: 'application/pdf' }), 'x.pdf');
  assert.equal((await fetch(`${baseUrl}/api/reports`, { method: 'POST', body: form })).status, 400);

  assert.equal((await getFirestore().collection(FIRESTORE_COLLECTIONS.reports).get()).size, before);
});

test('IN_REVIEW -> APPROVED, then a second decision is blocked', async () => {
  const reportId = await createdReportId();
  const token = await reviewTokenFor(reportId);

  const review = (await (await getReview(token)).json()) as {
    review: { status: string; supervisor: string };
  };
  assert.equal(review.review.status, 'IN_REVIEW');
  assert.equal(review.review.supervisor, 'Sup Ervisor');

  assert.equal((await decide(token, 'APPROVED')).status, 200);

  const second = await decide(token, 'REJECTED');
  assert.equal(second.status, 409);
  assert.equal(((await second.json()) as { message: string }).message, 'Este informe ya fue aprobado.');

  const report = await getReport(reportId);
  assert.equal(report?.status, 'APPROVED');
  assert.equal(report?.review?.decision, 'APPROVED');

  const reopened = (await (await getReview(token)).json()) as {
    review: { decidedMessage: string };
  };
  assert.equal(reopened.review.decidedMessage, 'Este informe ya fue aprobado.');
});

test('IN_REVIEW -> REJECTED shows the rejected message on reopen', async () => {
  const reportId = await createdReportId();
  const token = await reviewTokenFor(reportId);

  assert.equal((await decide(token, 'REJECTED')).status, 200);
  assert.equal((await getReport(reportId))?.status, 'REJECTED');

  const second = await decide(token, 'APPROVED');
  assert.equal(((await second.json()) as { message: string }).message, 'Este informe ya fue rechazado.');
});

test('concurrent decisions: exactly one wins', async () => {
  const reportId = await createdReportId();
  const token = await reviewTokenFor(reportId);

  const results = await Promise.all([
    decide(token, 'APPROVED'),
    decide(token, 'REJECTED'),
    decide(token, 'APPROVED'),
    decide(token, 'REJECTED'),
  ]);
  const statuses = results.map((response) => response.status).sort();
  assert.deepEqual(statuses, [200, 409, 409, 409]);
});

test('review rejects forged tokens and invalid decisions', async () => {
  const unknown = createReviewToken();
  assert.equal((await fetch(`${baseUrl}/api/review/${unknown}`)).status, 404);
  assert.equal((await fetch(`${baseUrl}/api/review/not-a-token`)).status, 404);
  assert.equal((await decide(unknown, 'APPROVED')).status, 404);

  const reportId = await createdReportId();
  const token = await reviewTokenFor(reportId);
  assert.equal((await decide(token, 'MAYBE')).status, 400);
  assert.equal((await getReport(reportId))?.status, 'IN_REVIEW');
});

test('replacing a token invalidates the previous link', async () => {
  const reportId = await createdReportId();
  const first = await reviewTokenFor(reportId);
  const second = await reviewTokenFor(reportId);
  assert.equal((await fetch(`${baseUrl}/api/review/${first}`)).status, 404);
  assert.equal((await fetch(`${baseUrl}/api/review/${second}`)).status, 200);
});

test('resend is refused once the email was delivered', async () => {
  const reportId = await createdReportId();
  const response = await resend(reportId, SUPERVISOR);
  assert.equal(response.status, 409);
});

test('history is paginated newest first and exposes no storage internals', async () => {
  const first = (await (await fetch(`${baseUrl}/api/reports?limit=2`)).json()) as {
    reports: { id: string; createdAt: string; status: string }[];
    nextCursor: string;
  };
  assert.equal(first.reports.length, 2);
  assert.ok(first.nextCursor);
  assert.ok((first.reports[0]?.createdAt ?? '') >= (first.reports[1]?.createdAt ?? ''));
  assert.equal(JSON.stringify(first).includes('reports/2026'), false);

  const next = (await (await fetch(`${baseUrl}/api/reports?limit=2&cursor=${first.nextCursor}`)).json()) as {
    reports: { id: string }[];
  };
  assert.equal(next.reports.some((item) => item.id === first.reports[0]?.id), false);
});

test('dashboard reflects decided reports', async () => {
  const body = (await (await fetch(`${baseUrl}/api/dashboard/summary`)).json()) as {
    summary: { totals: { reports: number; approved: number; rejected: number }; approvalRate: number };
  };
  assert.ok(body.summary.totals.reports >= 3);
  assert.ok(body.summary.totals.approved >= 1);
  assert.ok(body.summary.totals.rejected >= 1);
  assert.ok(body.summary.approvalRate > 0 && body.summary.approvalRate < 1);
});

test('with AUTH_ENABLED=true everything requires a session', async () => {
  process.env.AUTH_ENABLED = 'true';
  try {
    for (const url of ['/api/reports', '/api/dashboard/summary', '/api/config', '/api/admin/session']) {
      assert.equal((await fetch(`${baseUrl}${url}`)).status, 401, url);
    }

    const forged = jwt.sign({ email: SUPERVISOR }, 'wrong-secret', { subject: 'x' });
    const denied = await fetch(`${baseUrl}/api/reports`, { headers: { cookie: `user_session=${forged}` } });
    assert.equal(denied.status, 401);

    const me = (await (await fetch(`${baseUrl}/api/auth/me`)).json()) as Record<string, unknown>;
    assert.deepEqual(me, { authenticated: false, authEnabled: true });

    const cookie = sessionCookie(SUPERVISOR);
    const meAuthed = (await (await fetch(`${baseUrl}/api/auth/me`, { headers: { cookie } })).json()) as {
      authenticated: boolean;
      user: { email: string };
    };
    assert.equal(meAuthed.authenticated, true);
    assert.equal(meAuthed.user.email, SUPERVISOR);

    assert.equal((await fetch(`${baseUrl}/api/auth/login`, { redirect: 'manual' })).status, 503);
  } finally {
    process.env.AUTH_ENABLED = 'false';
  }
});

test('with auth, only the addressed supervisor can review (case-insensitive)', async () => {
  const reportId = await createdReportId();
  const token = await reviewTokenFor(reportId);
  process.env.AUTH_ENABLED = 'true';
  try {
    assert.equal((await fetch(`${baseUrl}/api/review/${token}`)).status, 401);

    const wrong = sessionCookie('otra.persona@example.cl');
    const blocked = await fetch(`${baseUrl}/api/review/${token}`, { headers: { cookie: wrong } });
    assert.equal(blocked.status, 403);
    const body = (await blocked.json()) as Record<string, unknown>;
    assert.equal(body.message, 'Este informe debe ser revisado con la cuenta a la que fue enviado.');
    assert.equal(JSON.stringify(body).includes(reportId), false);
    assert.equal((await decide(token, 'APPROVED', wrong)).status, 403);
    assert.equal((await getReport(reportId))?.status, 'IN_REVIEW');

    const right = sessionCookie('SuperVisor@Example.CL');
    assert.equal((await fetch(`${baseUrl}/api/review/${token}`, { headers: { cookie: right } })).status, 200);
    assert.equal((await decide(token, 'APPROVED', right)).status, 200);

    const report = await getReport(reportId);
    assert.equal(report?.review?.reviewedByEmail, 'SuperVisor@Example.CL');
    assert.equal(report?.review?.reviewedByName, 'Tester');
  } finally {
    process.env.AUTH_ENABLED = 'false';
  }
});

test('with auth, the report records its real author', async () => {
  process.env.AUTH_ENABLED = 'true';
  try {
    const reportId = await createdReportId({}, sessionCookie('autor@example.cl'));
    const author = (await getReport(reportId))?.createdBy;
    assert.equal(author?.email, 'autor@example.cl');
    assert.equal(author?.userId, 'id-autor@example.cl');
  } finally {
    process.env.AUTH_ENABLED = 'false';
  }
});

test('with auth, a report needs no guest profile', async () => {
  process.env.AUTH_ENABLED = 'true';
  try {
    const reportId = await createdReportId({ guestProfile: undefined }, sessionCookie('autor@example.cl'));
    assert.equal((await getReport(reportId))?.createdBy.email, 'autor@example.cl');
  } finally {
    process.env.AUTH_ENABLED = 'false';
  }
});

test('guest mode requires a valid profile to create a report', async () => {
  const before = (await getFirestore().collection(FIRESTORE_COLLECTIONS.reports).get()).size;
  for (const guestProfile of [undefined, { displayName: '', email: 'a@b.cl' }, { displayName: 'A', email: 'nope' }]) {
    assert.equal((await submitReport({ guestProfile })).status, 400);
  }
  assert.equal((await getFirestore().collection(FIRESTORE_COLLECTIONS.reports).get()).size, before);
});

test('a guest cannot forge the id: it always derives from the email', async () => {
  const reportId = await createdReportId({
    guestProfile: { displayName: 'Ana', email: 'ana@example.cl', userId: 'forged-admin' },
  });
  const author = (await getReport(reportId))?.createdBy;
  assert.notEqual(author?.userId, 'forged-admin');
  assert.match(author?.userId ?? '', /^guest:[0-9a-f]{64}$/);
});

test('guest mode never writes to informeOctavioUsers', async () => {
  const users = await getFirestore().collection(FIRESTORE_COLLECTIONS.users).get();
  assert.equal(users.size, 0);
});

test('guest history shows the declared person', async () => {
  const body = (await (await fetch(`${baseUrl}/api/reports?limit=100`)).json()) as { reports: { createdBy: string }[] };
  assert.ok(body.reports.some((report) => report.createdBy === 'Tester Guest'));
  assert.equal(body.reports.some((report) => report.createdBy === 'Usuario sin sesión'), false);
});

test('without auth the review link shows nothing until the supervisor email is declared', async () => {
  const reportId = await createdReportId();
  const token = await reviewTokenFor(reportId);

  const bare = await fetch(`${baseUrl}/api/review/${token}`);
  assert.equal(bare.status, 200);
  assert.deepEqual(await bare.json(), { ok: true, emailRequired: true });

  const wrong = await getReview(token, 'otra.persona@example.cl');
  assert.equal(wrong.status, 403);
  const refused = (await wrong.json()) as Record<string, unknown>;
  assert.equal(refused.code, 'WRONG_EMAIL');
  assert.equal(JSON.stringify(refused).includes(reportId), false);

  assert.equal((await getReview(token, ' SuperVisor@Example.CL ')).status, 200);
});

test('without auth a decision requires the declared email and records that it was only declared', async () => {
  const reportId = await createdReportId();
  const token = await reviewTokenFor(reportId);

  assert.equal((await decide(token, 'APPROVED', undefined, 'otra.persona@example.cl')).status, 403);
  assert.equal((await decide(token, 'APPROVED', undefined, '')).status, 403);
  assert.equal((await getReport(reportId))?.status, 'IN_REVIEW');

  assert.equal((await decide(token, 'APPROVED')).status, 200);
  const review = (await getReport(reportId))?.review;
  assert.equal(review?.reviewedByEmail, SUPERVISOR);
  assert.equal(review?.reviewedByName, 'Correo declarado en el enlace (modo MVP)');
  assert.match(review?.reviewedByUserId ?? '', /^guest:[0-9a-f]{64}$/);
  assert.equal(review?.decision, 'APPROVED');
  assert.ok(review?.reviewedAt);
});

test('user profiles go to informeOctavioUsers and keep createdAt on later logins', async () => {
  const identity = { externalId: 'oid-1', email: 'a@example.cl', displayName: 'A', tenantId: 't' };
  await upsertUser(identity);
  const ref = getFirestore().collection(FIRESTORE_COLLECTIONS.users).doc('oid-1');
  const createdAt = (await ref.get()).get('createdAt');
  assert.ok(createdAt);

  await upsertUser({ ...identity, displayName: 'A2' });
  const updated = await ref.get();
  assert.equal(updated.get('displayName'), 'A2');
  assert.deepEqual(updated.get('createdAt'), createdAt);
});

test('collection names are exactly the agreed ones', () => {
  assert.deepEqual(FIRESTORE_COLLECTIONS, {
    config: 'informeOctavioConfig',
    reports: 'informeOctavioReports',
    approvals: 'informeOctavioReportApprovals',
    users: 'informeOctavioUsers',
  });
});

const MVP_CODE = 'codigo-de-prueba-mvp';
const PROTECTED_READS = ['/api/config', '/api/reports', '/api/dashboard/summary', '/api/reports/any/pdf', '/api/admin/session'];

async function withMvpGate(run: () => Promise<void>, auth = 'false'): Promise<void> {
  process.env.MVP_ACCESS_ENABLED = 'true';
  process.env.MVP_ACCESS_CODE = MVP_CODE;
  process.env.AUTH_ENABLED = auth;
  try {
    await run();
  } finally {
    process.env.MVP_ACCESS_ENABLED = 'false';
    delete process.env.MVP_ACCESS_CODE;
    process.env.AUTH_ENABLED = 'false';
  }
}

function mvpLogin(code: unknown) {
  return fetch(`${baseUrl}/api/mvp-access/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
}

async function mvpCookie(): Promise<string> {
  const login = await mvpLogin(MVP_CODE);
  assert.equal(login.status, 200);
  return (login.headers.get('set-cookie') ?? '').split(';')[0] ?? '';
}

function status(cookie?: string) {
  return fetch(`${baseUrl}/api/mvp-access/status`, { headers: cookie ? { cookie } : {} }).then((r) => r.json());
}

test('MVP gate: without a cookie every protected API refuses', async () => {
  await withMvpGate(async () => {
    assert.deepEqual(await status(), { required: true, authenticated: false });

    for (const url of PROTECTED_READS) {
      const response = await fetch(`${baseUrl}${url}`);
      assert.equal(response.status, 401, url);
      assert.equal(((await response.json()) as { code: string }).code, 'MVP_ACCESS_REQUIRED');
    }

    const before = (await getFirestore().collection(FIRESTORE_COLLECTIONS.reports).get()).size;
    assert.equal((await submitReport()).status, 401);
    assert.equal((await getFirestore().collection(FIRESTORE_COLLECTIONS.reports).get()).size, before);

    const resend = await fetch(`${baseUrl}/api/reports/any/resend-email`, { method: 'POST' });
    assert.equal(resend.status, 401);
    assert.equal((await fetch(`${baseUrl}/api/admin/config`, { method: 'PUT' })).status, 401);
  });
});

test('MVP gate: the wrong code is refused and creates no cookie', async () => {
  await withMvpGate(async () => {
    for (const code of ['incorrecto', '', undefined, 5]) {
      const response = await mvpLogin(code);
      assert.equal(response.status, 401);
      assert.equal(response.headers.get('set-cookie'), null);
    }
    assert.equal((await mvpLogin(MVP_CODE)).status, 200);
  });
});

test('MVP gate: the right code creates a hardened 12h cookie that opens the APIs', async () => {
  await withMvpGate(async () => {
    const login = await mvpLogin(`  ${MVP_CODE}  `);
    assert.equal(login.status, 200);
    assert.equal(JSON.stringify(await login.clone().json()).includes(MVP_CODE), false);

    const setCookie = login.headers.get('set-cookie') ?? '';
    assert.match(setCookie, /^mvp_access=/);
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /SameSite=Lax/);
    assert.match(setCookie, /Path=\//);
    assert.match(setCookie, /Max-Age=43200/);

    const cookie = setCookie.split(';')[0] ?? '';
    assert.equal(cookie.includes(MVP_CODE), false);
    assert.deepEqual(await status(cookie), { required: true, authenticated: true });

    for (const url of ['/api/config', '/api/reports', '/api/dashboard/summary']) {
      assert.equal((await fetch(`${baseUrl}${url}`, { headers: { cookie } })).status, 200, url);
    }
    assert.equal((await submitReport({}, cookie)).status, 201);
  });
});

test('MVP gate: expired, altered and foreign tokens are refused', async () => {
  await withMvpGate(async () => {
    const valid = (await mvpCookie()).replace('mvp_access=', '');
    const tampered = `${valid.slice(0, -2)}${valid.endsWith('AA') ? 'BB' : 'AA'}`;
    const secret = 'test-session-secret';
    const forgeries = [
      jwt.sign({ scope: 'mvp-access' }, secret, { expiresIn: -10 }),
      tampered,
      jwt.sign({ scope: 'mvp-access' }, 'wrong-secret', { expiresIn: 60 }),
      jwt.sign({ scope: 'otra-cosa' }, secret, { expiresIn: 60 }),
      jwt.sign({ email: SUPERVISOR, name: 'U' }, secret, { subject: 'u', expiresIn: 60 }),
    ];
    for (const token of forgeries) {
      const response = await fetch(`${baseUrl}/api/reports`, { headers: { cookie: `mvp_access=${token}` } });
      assert.equal(response.status, 401);
    }
  });
});

test('MVP gate: its token is not a user session and a user session does not open it', async () => {
  const mvpToken = jwt.sign({ scope: 'mvp-access' }, 'test-session-secret', { expiresIn: 60 });
  process.env.AUTH_ENABLED = 'true';
  try {
    const response = await fetch(`${baseUrl}/api/reports`, { headers: { cookie: `user_session=${mvpToken}` } });
    assert.equal(response.status, 401);
  } finally {
    process.env.AUTH_ENABLED = 'false';
  }

  await withMvpGate(async () => {
    const response = await fetch(`${baseUrl}/api/reports`, { headers: { cookie: sessionCookie(SUPERVISOR) } });
    assert.equal(response.status, 401);
  });
});

test('MVP gate: logout removes the access and only that cookie', async () => {
  await withMvpGate(async () => {
    const response = await fetch(`${baseUrl}/api/mvp-access/logout`, { method: 'POST' });
    assert.equal(response.status, 200);
    const cookies = response.headers.getSetCookie();
    assert.equal(cookies.length, 1);
    assert.match(cookies[0] ?? '', /^mvp_access=;.*Max-Age=0/);
  });
});

test('MVP gate: Admin still requires its own password after the gate', async () => {
  await withMvpGate(async () => {
    const access = await mvpCookie();
    const config = { generalAreas: [], activityAreas: [], equipment: [] };
    const put = (cookie: string) =>
      fetch(`${baseUrl}/api/admin/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', cookie },
        body: JSON.stringify(config),
      });

    assert.equal((await put(access)).status, 401);

    const wrong = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: access },
      body: JSON.stringify({ password: MVP_CODE }),
    });
    assert.equal(wrong.status, 401);

    const session = await fetch(`${baseUrl}/api/admin/session`, { headers: { cookie: access } });
    assert.equal(((await session.json()) as { authenticated: boolean }).authenticated, false);
  });
});

test('MVP gate: the supervisor reviews without the code and only reaches the PDF through the token', async () => {
  const reportId = await createdReportId();
  const token = await reviewTokenFor(reportId);

  await withMvpGate(async () => {
    assert.equal((await fetch(`${baseUrl}/api/reports/${reportId}/pdf`)).status, 401);
    assert.deepEqual(await (await fetch(`${baseUrl}/api/review/${token}`)).json(), { ok: true, emailRequired: true });

    const body = (await (await getReview(token)).json()) as { review: Record<string, unknown> };
    assert.equal(body.review.status, 'IN_REVIEW');
    assert.equal(Object.hasOwn(body.review, 'reportId'), false);

    const pdfUrl = `${baseUrl}/api/review/${token}/pdf`;
    assert.equal((await fetch(pdfUrl)).status, 403);
    assert.equal((await fetch(pdfUrl, { headers: { 'X-Review-Email': 'otra@example.cl' } })).status, 403);
    assert.equal((await fetch(`${baseUrl}/api/review/${createReviewToken()}/pdf`)).status, 404);

    const pdf = await fetch(pdfUrl, { headers: { 'X-Review-Email': SUPERVISOR } });
    assert.equal(pdf.status, 200);
    assert.equal(pdf.headers.get('content-type'), 'application/pdf');
    assert.deepEqual(Buffer.from(await pdf.arrayBuffer()), PDF_BYTES);

    assert.equal((await decide(token, 'APPROVED')).status, 200);
    assert.equal((await getReport(reportId))?.status, 'APPROVED');
  });
});

test('with auth, the review PDF requires the addressed supervisor', async () => {
  const reportId = await createdReportId();
  const token = await reviewTokenFor(reportId);
  process.env.AUTH_ENABLED = 'true';
  try {
    const pdfUrl = `${baseUrl}/api/review/${token}/pdf`;
    assert.equal((await fetch(pdfUrl)).status, 401);
    assert.equal((await fetch(pdfUrl, { headers: { cookie: sessionCookie('otra@example.cl') } })).status, 403);
    assert.equal(
      (await fetch(pdfUrl, { headers: { cookie: sessionCookie('otra@example.cl'), 'X-Review-Email': SUPERVISOR } }))
        .status,
      403,
    );
    assert.equal((await fetch(pdfUrl, { headers: { cookie: sessionCookie(SUPERVISOR) } })).status, 200);
  } finally {
    process.env.AUTH_ENABLED = 'false';
  }
});

test('with AUTH_ENABLED=true the MVP gate is ignored completely', async () => {
  await withMvpGate(async () => {
    assert.deepEqual(await status(), { required: false, authenticated: false });
    assert.equal((await mvpLogin(MVP_CODE)).status, 404);

    const noSession = await fetch(`${baseUrl}/api/reports`);
    assert.equal(noSession.status, 401);
    assert.equal(((await noSession.json()) as { code?: string }).code, undefined);

    const cookie = sessionCookie('autor@example.cl');
    assert.equal((await fetch(`${baseUrl}/api/reports`, { headers: { cookie } })).status, 200);
    assert.equal((await submitReport({ guestProfile: undefined }, cookie)).status, 201);
  }, 'true');
});

test('MVP gate: with the flag off the behaviour stays open', async () => {
  assert.deepEqual(await status(), { required: false, authenticated: false });
  assert.equal((await fetch(`${baseUrl}/api/reports`)).status, 200);
  assert.equal((await mvpLogin('x')).status, 404);
});

test('MVP gate: enabled without a configured code stays closed', async () => {
  await withMvpGate(async () => {
    delete process.env.MVP_ACCESS_CODE;
    assert.equal((await fetch(`${baseUrl}/api/reports`)).status, 401);
    assert.equal((await mvpLogin('undefined')).status, 503);
  });
});

test('history does not expose the supervisor email', async () => {
  const text = await (await fetch(`${baseUrl}/api/reports?limit=100`)).text();
  assert.equal(text.includes(SUPERVISOR), false);
  assert.equal(text.includes('supervisorEmail'), false);
});

test('MVP gate: too many wrong codes are rate limited, even with the right code', async () => {
  await withMvpGate(async () => {
    await mvpCookie();
    for (let attempt = 0; attempt < 10; attempt += 1) {
      assert.equal((await mvpLogin('incorrecto')).status, 401);
    }
    assert.equal((await mvpLogin('incorrecto')).status, 429);
    assert.equal((await mvpLogin(MVP_CODE)).status, 429);

    assert.equal((await fetch(`${baseUrl}/api/mvp-access/status`)).status, 200);
    assert.equal((await fetch(`${baseUrl}/api/mvp-access/logout`, { method: 'POST' })).status, 200);
  });
});

test('a failed email leaves the report stored as SEND_FAILED, never as under review', async () => {
  const before = await reportCount();
  const response = await withFailingEmail(() => submitReport());
  assert.equal(response.status, 502);
  const { reportId } = (await response.json()) as { reportId: string };

  assert.equal(await reportCount(), before + 1);
  const report = await getReport(reportId);
  assert.equal(report?.status, 'SEND_FAILED');
  assert.equal(report?.emailDelivery.status, 'FAILED');
  assert.equal((await listItem(reportId))?.status, 'SEND_FAILED');

  const pdf = await fetch(`${baseUrl}/api/reports/${reportId}/pdf`);
  assert.deepEqual(Buffer.from(await pdf.arrayBuffer()), PDF_BYTES);

  const dashboard = (await (await fetch(`${baseUrl}/api/dashboard/summary`)).json()) as {
    summary: { totals: { sendFailed: number } };
  };
  assert.ok(dashboard.summary.totals.sendFailed >= 1);
});

test('a report with a failed email cannot be decided', async () => {
  const response = await withFailingEmail(() => submitReport());
  const { reportId } = (await response.json()) as { reportId: string };
  const token = await reviewTokenFor(reportId);
  assert.equal((await decide(token, 'APPROVED')).status, 409);
  assert.equal((await getReport(reportId))?.status, 'SEND_FAILED');
});

test('resend needs a valid email and keeps SEND_FAILED if it fails again', async () => {
  const response = await withFailingEmail(() => submitReport());
  const { reportId } = (await response.json()) as { reportId: string };
  const before = await reportCount();

  for (const invalid of ['', 'nope', undefined, 5]) {
    assert.equal((await resend(reportId, invalid)).status, 400);
  }

  const failed = await withFailingEmail(() => resend(reportId, 'nuevo@example.cl'));
  assert.equal(failed.status, 502);
  const report = await getReport(reportId);
  assert.equal(report?.status, 'SEND_FAILED');
  assert.equal(report?.supervisorEmail, SUPERVISOR);
  assert.equal(await reportCount(), before);
});

test('a successful resend updates the same report and its supervisor', async () => {
  const response = await withFailingEmail(() => submitReport());
  const { reportId } = (await response.json()) as { reportId: string };
  const before = await reportCount();

  const sent = await resend(reportId, ' Nuevo@Example.CL ');
  assert.equal(sent.status, 200);

  const report = await getReport(reportId);
  assert.equal(report?.status, 'IN_REVIEW');
  assert.equal(report?.supervisorEmail, 'nuevo@example.cl');
  assert.equal(report?.emailDelivery.status, 'SENT');
  assert.ok(report?.emailDelivery.sentAt);
  assert.equal(await reportCount(), before);

  const approvals = await getFirestore()
    .collection(FIRESTORE_COLLECTIONS.approvals)
    .where('reportId', '==', reportId)
    .get();
  assert.equal(approvals.size, 1);
  assert.equal(approvals.docs[0]?.get('supervisorEmail'), 'nuevo@example.cl');

  const token = await reviewTokenFor(reportId);
  assert.equal((await getReview(token, SUPERVISOR)).status, 403);
  assert.equal((await getReview(token, 'nuevo@example.cl')).status, 200);
  assert.equal((await decide(token, 'APPROVED', undefined, 'nuevo@example.cl')).status, 200);
  assert.equal((await resend(reportId, 'otro@example.cl')).status, 409);
});

test('a missing stored PDF keeps the report and reports the problem', async () => {
  const response = await withFailingEmail(() => submitReport());
  const { reportId } = (await response.json()) as { reportId: string };
  const report = await getReport(reportId);
  await fs.rm(path.join(process.cwd(), '.local-reports', report?.storage.path ?? ''));

  const retry = await resend(reportId, SUPERVISOR);
  assert.equal(retry.status, 502);
  assert.match(((await retry.json()) as { message: string }).message, /PDF/);
  assert.equal((await getReport(reportId))?.status, 'SEND_FAILED');
});

test('reports written before these fields existed keep working', async () => {
  const reports = getFirestore().collection(FIRESTORE_COLLECTIONS.reports);
  const base = {
    createdAt: Timestamp.now(),
    reportDate: '2026-10-01',
    createdBy: { userId: 'anonymous', email: '', displayName: 'Usuario sin sesión' },
    supervisorEmail: SUPERVISOR,
    ccEmails: [],
    storage: { bucket: 'local', path: 'reports/legacy/none.pdf', filename: 'none.pdf' },
    metrics,
    summary: { area: 'A', supervisorName: 'S', activities: [], equipment: [], watermasterHourlyPerformance: null },
  };
  await reports.doc('legacy-failed').set({
    ...base,
    status: 'IN_REVIEW',
    review: null,
    emailDelivery: { status: 'FAILED', sentAt: null },
  });
  await reports.doc('legacy-rejected').set({
    ...base,
    status: 'REJECTED',
    emailDelivery: { status: 'SENT', sentAt: Timestamp.now() },
    review: {
      reviewedAt: Timestamp.now(),
      reviewedByUserId: 'anonymous',
      reviewedByEmail: SUPERVISOR,
      reviewedByName: 'x',
      decision: 'REJECTED',
    },
  });

  assert.equal((await listItem('legacy-failed'))?.status, 'SEND_FAILED');
  const rejected = await listItem('legacy-rejected');
  assert.equal(rejected?.status, 'REJECTED');
  assert.equal(rejected?.rejectionComment, null);
  assert.equal(rejected?.canEdit, false);
  assert.equal((await fetch(`${baseUrl}/api/reports/legacy-rejected/edit-data`)).status, 409);
  assert.equal((await fetch(`${baseUrl}/api/dashboard/summary`)).status, 200);

  await reports.doc('legacy-failed').delete();
  await reports.doc('legacy-rejected').delete();
});

test('repeating a submission never creates a second report', async () => {
  const before = await reportCount();
  const submissionId = 'd7e1c1a4-0000-4000-8000-000000000001';

  const first = await submitReport({ submissionId });
  const second = await submitReport({ submissionId });
  assert.equal(first.status, 201);
  assert.equal(second.status, 200);
  const firstId = ((await first.json()) as { reportId: string }).reportId;
  assert.equal(((await second.json()) as { reportId: string }).reportId, firstId);
  assert.equal(await reportCount(), before + 1);
});

test('two simultaneous submissions of the same form create one report', async () => {
  const before = await reportCount();
  const submissionId = 'd7e1c1a4-0000-4000-8000-000000000002';

  const responses = await Promise.all([submitReport({ submissionId }), submitReport({ submissionId })]);
  const statuses = responses.map((response) => response.status);
  assert.equal(statuses.filter((status) => status === 201).length, 1);
  assert.ok(statuses.every((status) => [200, 201, 409].includes(status)), statuses.join());
  assert.equal(await reportCount(), before + 1);
});

test('repeating a submission whose email failed points to the same stored report', async () => {
  const before = await reportCount();
  const submissionId = 'd7e1c1a4-0000-4000-8000-000000000003';

  const first = await withFailingEmail(() => submitReport({ submissionId }));
  const second = await withFailingEmail(() => submitReport({ submissionId }));
  assert.equal(first.status, 502);
  assert.equal(second.status, 502);
  const firstId = ((await first.json()) as { reportId: string }).reportId;
  assert.equal(((await second.json()) as { reportId: string }).reportId, firstId);
  assert.equal(await reportCount(), before + 1);
});

test('a rejection can carry no comment, and it is stored as null', async () => {
  const reportId = await createdReportId();
  const token = await reviewTokenFor(reportId);
  const response = await fetch(`${baseUrl}/api/review/${token}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision: 'REJECTED', supervisorEmail: SUPERVISOR, comment: '   ' }),
  });
  assert.equal(response.status, 200);
  assert.equal((await getReport(reportId))?.review?.comment, null);
  assert.equal((await listItem(reportId))?.rejectionComment, null);
});

async function rejectWith(reportId: string, comment: unknown): Promise<void> {
  const token = await reviewTokenFor(reportId);
  const response = await fetch(`${baseUrl}/api/review/${token}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision: 'REJECTED', supervisorEmail: SUPERVISOR, comment }),
  });
  assert.equal(response.status, 200);
}

test('a long rejection comment is kept on that report only, with its line breaks', async () => {
  const first = await createdReportId();
  const second = await createdReportId();
  const comment = `Línea 1\nLínea 2\n${'x'.repeat(4000)}`;
  await rejectWith(first, comment);
  await rejectWith(second, 'Otro motivo');

  assert.equal((await getReport(first))?.review?.comment, comment);
  assert.equal((await listItem(first))?.rejectionComment, comment);
  assert.equal((await listItem(second))?.rejectionComment, 'Otro motivo');
});

test('a comment over the limit is cut, and an approval never stores one', async () => {
  const rejected = await createdReportId();
  await rejectWith(rejected, 'y'.repeat(6000));
  assert.equal((await getReport(rejected))?.review?.comment?.length, 5000);

  const approved = await createdReportId();
  const token = await reviewTokenFor(approved);
  const response = await fetch(`${baseUrl}/api/review/${token}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision: 'APPROVED', supervisorEmail: SUPERVISOR, comment: 'ignorar' }),
  });
  assert.equal(response.status, 200);
  const report = await getReport(approved);
  assert.equal(report?.status, 'APPROVED');
  assert.equal(report?.review?.comment, null);
});

const FORM_SNAPSHOT = JSON.stringify({
  date: '2026-11-01',
  supervisor: 'Juan',
  area: 'Pozas',
  apr: 'Ana',
  roster: [{ equipmentId: 'e1', operator: 'Op' }],
  activities: [{ id: 'activity-1', area: 'Poza 7', equipmentAssignments: [] }],
});
const PHOTO_BYTES = Buffer.from('fake-jpeg-bytes');

test('only a rejected report with stored data can be rebuilt, with its photos', async () => {
  const response = await submitReport({ formSnapshot: FORM_SNAPSHOT }, undefined, [
    { name: 'activity-1.before', type: 'image/jpeg', bytes: PHOTO_BYTES },
  ]);
  const { reportId } = (await response.json()) as { reportId: string };

  assert.equal((await fetch(`${baseUrl}/api/reports/${reportId}/edit-data`)).status, 409);
  assert.equal((await listItem(reportId))?.canEdit, false);

  await rejectWith(reportId, 'Corregir vueltas');
  assert.equal((await listItem(reportId))?.canEdit, true);

  const edit = await fetch(`${baseUrl}/api/reports/${reportId}/edit-data`);
  assert.equal(edit.status, 200);
  const data = (await edit.json()) as {
    formSnapshot: string;
    comment: string;
    photos: { activityId: string; which: string; contentType: string }[];
  };
  assert.equal(data.formSnapshot, FORM_SNAPSHOT);
  assert.equal(data.comment, 'Corregir vueltas');
  assert.deepEqual(data.photos, [{ activityId: 'activity-1', which: 'before', contentType: 'image/jpeg' }]);

  const photo = await fetch(`${baseUrl}/api/reports/${reportId}/photos/activity-1/before`);
  assert.equal(photo.headers.get('content-type'), 'image/jpeg');
  assert.deepEqual(Buffer.from(await photo.arrayBuffer()), PHOTO_BYTES);
  assert.equal((await fetch(`${baseUrl}/api/reports/${reportId}/photos/activity-1/after`)).status, 404);

  const stored = await getReport(reportId);
  assert.equal(stored?.formPhotos?.[0]?.path, `reports/2026/11/${reportId}/photos/activity-1-before.jpg`);
});

test('photos with an unexpected name or type are not stored', async () => {
  const response = await submitReport({ formSnapshot: FORM_SNAPSHOT }, undefined, [
    { name: 'nombre raro!.before', type: 'image/jpeg', bytes: PHOTO_BYTES },
    { name: 'activity-1.other', type: 'image/jpeg', bytes: PHOTO_BYTES },
    { name: 'activity-1.before', type: 'text/html', bytes: PHOTO_BYTES },
  ]);
  const { reportId } = (await response.json()) as { reportId: string };
  assert.deepEqual((await getReport(reportId))?.formPhotos, []);
});

test('a path in a photo name cannot leave the report folder', async () => {
  const response = await submitReport({ formSnapshot: FORM_SNAPSHOT }, undefined, [
    { name: '../../escape.before', type: 'image/jpeg', bytes: PHOTO_BYTES },
  ]);
  const { reportId } = (await response.json()) as { reportId: string };
  const photos = (await getReport(reportId))?.formPhotos ?? [];
  assert.ok(photos.every((photo) => photo.path === `reports/2026/11/${reportId}/photos/escape-before.jpg`));
});

test('an unusable form snapshot is dropped without blocking the report', async () => {
  for (const formSnapshot of ['not json', '{"roster":[]}', 'x'.repeat(300 * 1024)]) {
    const response = await submitReport({ formSnapshot });
    assert.equal(response.status, 201);
    const { reportId } = (await response.json()) as { reportId: string };
    assert.equal((await getReport(reportId))?.formSnapshot, null);
  }
});

test('a corrected report is a new record and the rejected one never changes', async () => {
  const originalId = ((await (await submitReport({ formSnapshot: FORM_SNAPSHOT })).json()) as { reportId: string }).reportId;
  await rejectWith(originalId, 'Corregir vueltas');

  const originalBefore = await getReport(originalId);
  const timeBefore = await storedReportTime(originalId);
  const before = await reportCount();

  const correctedId = await createdReportId({ revisedFromReportId: originalId, formSnapshot: FORM_SNAPSHOT });

  assert.notEqual(correctedId, originalId);
  assert.equal(await reportCount(), before + 1);

  const corrected = await getReport(correctedId);
  assert.equal(corrected?.status, 'IN_REVIEW');
  assert.equal(corrected?.revisedFromReportId, originalId);
  assert.notEqual(corrected?.storage.path, originalBefore?.storage.path);

  assert.equal(await storedReportTime(originalId), timeBefore);
  assert.deepEqual(await getReport(originalId), originalBefore);
  assert.equal((await listItem(originalId))?.rejectionComment, 'Corregir vueltas');

  const body = (await (await fetch(`${baseUrl}/api/reports?limit=100`)).json()) as {
    reports: { id: string; revisedFromReportId: string | null }[];
  };
  assert.equal(body.reports.find((report) => report.id === correctedId)?.revisedFromReportId, originalId);
  assert.equal(body.reports.find((report) => report.id === originalId)?.revisedFromReportId, null);
  assert.equal(JSON.stringify(body).includes('formSnapshot'), false);
});

test('a correction must point to a rejected report', async () => {
  const inReview = await createdReportId();
  assert.equal((await submitReport({ revisedFromReportId: inReview })).status, 400);
  assert.equal((await submitReport({ revisedFromReportId: 'does-not-exist' })).status, 400);
});

test('MVP gate: rebuilding a report and its photos need the code', async () => {
  await withMvpGate(async () => {
    assert.equal((await fetch(`${baseUrl}/api/reports/any/edit-data`)).status, 401);
    assert.equal((await fetch(`${baseUrl}/api/reports/any/photos/a/before`)).status, 401);
  });
});

test('the whole flow only touches the informeOctavio namespace', async () => {
  const collections = await getFirestore().listCollections();
  assert.deepEqual(collections.map((collection) => collection.id).sort(), [
    'informeOctavioConfig',
    'informeOctavioReportApprovals',
    'informeOctavioReports',
    'informeOctavioUsers',
  ]);
});

test('a new shift starts from the latest report that stands, never a rejected one', async () => {
  const standing = await submitReport({ reportDate: '2026-10-20', formSnapshot: FORM_SNAPSHOT });
  assert.equal(standing.status, 201);
  const rejected = await submitReport({ reportDate: '2026-10-21', formSnapshot: FORM_SNAPSHOT });
  await rejectWith(((await rejected.json()) as { reportId: string }).reportId, 'Corregir vueltas');

  const response = await fetch(`${baseUrl}/api/reports/latest-form`);
  assert.equal(response.status, 200);
  const data = (await response.json()) as { reportDate: string; formSnapshot: string };
  assert.equal(data.reportDate, '2026-10-20');
  assert.equal(data.formSnapshot, FORM_SNAPSHOT);
});

