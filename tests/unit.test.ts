import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isMvpAccessRequired } from '../server/config/authConfig.js';
import { isValidMvpCode } from '../server/middleware/mvpAccess.js';
import { guestUserId, parseGuestProfile } from '../server/reports/guestIdentity.js';
import { parseReportSubmission } from '../server/reports/reportSubmission.js';
import type { ReportRecord } from '../server/reports/reportTypes.js';
import { createReviewToken, hashReviewToken, isReviewTokenFormat } from '../server/reports/reviewToken.js';
import { sanitizeReturnTo } from '../server/routes/auth.js';
import { buildDashboardSummary } from '../server/services/dashboardService.js';
import type { ReportData } from '../src/types/report.js';
import { localIsoDate } from '../src/utils/dates.js';
import { hasReportContent, serializeForm } from '../src/utils/reportDraft.js';
import { carryOverShift } from '../src/utils/shiftCarryOver.js';
import { createInitialReport } from '../src/state/reportReducer.js';
import { buildLogoutUrl, resolveIdentity } from '../server/services/entraAuthService.js';

const metrics = {
  activitiesCount: 2,
  activeEquipmentCount: 3,
  trucksCount: 2,
  machineryCount: 1,
  truckM3: 36,
  watermasterM3: 100,
};

const entra = {
  tenantId: 'tenant-1',
  tenantSubdomain: 'rioloa',
  clientId: 'client-1',
  clientSecret: 'unused',
  authority: 'https://rioloa.ciamlogin.com/',
  redirectUri: 'https://app.example/api/auth/callback',
  postLogoutRedirectUri: 'https://app.example/',
};

const claims = (overrides: Record<string, unknown>) => ({
  aud: 'client-1',
  tid: 'tenant-1',
  exp: Math.floor(Date.now() / 1000) + 600,
  oid: 'oid-1',
  sub: 'sub-1',
  email: 'Sup@Example.CL',
  name: 'Supervisor',
  ...overrides,
});

function payload(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({ reportDate: '2026-11-01', supervisorEmail: 'sup@example.cl', metrics, ...overrides });
}

function report(status: ReportRecord['status'], reportDate: string, overrides: Partial<ReportRecord> = {}): ReportRecord {
  return {
    id: `${status}-${reportDate}`,
    createdAt: `${reportDate}T12:00:00.000Z`,
    reportDate,
    createdBy: { userId: 'u', email: 'u@example.cl', displayName: 'U' },
    supervisorEmail: 'sup@example.cl',
    ccEmails: [],
    status,
    storage: { bucket: 'b', path: 'p', filename: 'f' },
    metrics,
    summary: { area: 'A', supervisorName: 'S', activities: [], equipment: [], watermasterHourlyPerformance: null },
    review: null,
    emailDelivery: { sentAt: null, status: 'SENT' },
    ...overrides,
  };
}

test('review token is opaque, 256-bit and hashed deterministically', () => {
  const token = createReviewToken();
  assert.equal(isReviewTokenFormat(token), true);
  assert.equal(hashReviewToken(token).length, 64);
  assert.equal(hashReviewToken(token), hashReviewToken(token));
  assert.notEqual(createReviewToken(), token);
  assert.equal(isReviewTokenFormat('short'), false);
});

test('report submission normalizes emails and drops the supervisor from CC', () => {
  const parsed = parseReportSubmission(
    payload({ supervisorEmail: ' SUP@Example.cl ', ccEmails: ['a@b.cl', 'A@B.cl', 'sup@example.cl'] }),
  );
  assert.equal(parsed?.supervisorEmail, 'sup@example.cl');
  assert.deepEqual(parsed?.ccEmails, ['a@b.cl']);
});

test('report submission rejects bad input', () => {
  assert.equal(parseReportSubmission('not json'), null);
  assert.equal(parseReportSubmission(undefined), null);
  assert.equal(parseReportSubmission(payload({ supervisorEmail: 'nope' })), null);
  assert.equal(parseReportSubmission(payload({ reportDate: '2026-13-45' })), null);
  assert.equal(parseReportSubmission(payload({ reportDate: '../../etc' })), null);
  assert.equal(parseReportSubmission(payload({ ccEmails: ['nope'] })), null);
  assert.equal(parseReportSubmission(payload({ metrics: { ...metrics, truckM3: -1 } })), null);
  assert.equal(parseReportSubmission(payload({ metrics: { ...metrics, truckM3: 'x' } })), null);
});

test('guest profile requires a name and a valid email, and normalizes them', () => {
  assert.deepEqual(parseGuestProfile({ displayName: '  Ana  ', email: ' Ana@Example.CL ', userId: 'forged' }), {
    displayName: 'Ana',
    email: 'ana@example.cl',
  });
  for (const invalid of [
    null,
    undefined,
    'text',
    {},
    { displayName: '', email: 'a@b.cl' },
    { displayName: '   ', email: 'a@b.cl' },
    { displayName: 'Ana', email: 'nope' },
    { displayName: 'Ana' },
    { displayName: 5, email: 'a@b.cl' },
  ]) {
    assert.equal(parseGuestProfile(invalid), null);
  }
});

test('guest id is deterministic, case-insensitive and hides the email', () => {
  assert.match(guestUserId('a@b.cl'), /^guest:[0-9a-f]{64}$/);
  assert.equal(guestUserId('A@B.cl'), guestUserId(' a@b.cl '));
  assert.notEqual(guestUserId('a@b.cl'), guestUserId('c@b.cl'));
  assert.equal(guestUserId('a@b.cl').includes('a@b'), false);
});

test('MVP code comparison trims input, rejects everything else and never matches an unset code', () => {
  const previous = process.env.MVP_ACCESS_CODE;
  try {
    process.env.MVP_ACCESS_CODE = 'codigo-correcto';
    assert.equal(isValidMvpCode('codigo-correcto'), true);
    assert.equal(isValidMvpCode('  codigo-correcto \n'), true);
    for (const wrong of ['otro', 'CODIGO-CORRECTO', 'codigo-correcto-mas-largo', '', undefined, null, 5, {}]) {
      assert.equal(isValidMvpCode(wrong), false);
    }

    delete process.env.MVP_ACCESS_CODE;
    assert.equal(isValidMvpCode(''), false);
    assert.equal(isValidMvpCode('undefined'), false);
  } finally {
    if (previous === undefined) delete process.env.MVP_ACCESS_CODE;
    else process.env.MVP_ACCESS_CODE = previous;
  }
});

test('the MVP gate only applies with auth off and the flag on', () => {
  const { AUTH_ENABLED, MVP_ACCESS_ENABLED } = process.env;
  try {
    for (const [auth, mvp, expected] of [
      ['false', 'true', true],
      ['false', 'TRUE', true],
      ['false', 'false', false],
      ['false', '', false],
      ['true', 'true', false],
      ['true', 'false', false],
    ] as const) {
      process.env.AUTH_ENABLED = auth;
      process.env.MVP_ACCESS_ENABLED = mvp;
      assert.equal(isMvpAccessRequired(), expected, `auth=${auth} mvp=${mvp}`);
    }
  } finally {
    process.env.AUTH_ENABLED = AUTH_ENABLED ?? '';
    process.env.MVP_ACCESS_ENABLED = MVP_ACCESS_ENABLED ?? '';
  }
});

test('return URL only accepts same-origin paths', () => {
  assert.equal(sanitizeReturnTo('/review/abc'), '/review/abc');
  assert.equal(sanitizeReturnTo('/history?page=2'), '/history?page=2');
  for (const unsafe of ['//evil.example', '/\\evil.example', 'https://evil.example', 'evil', '', undefined, 5]) {
    assert.equal(sanitizeReturnTo(unsafe), '/');
  }
});

test('Entra identity prefers oid and validates audience, tenant and expiry', () => {
  const identity = resolveIdentity(claims({}), entra);
  assert.equal(identity?.externalId, 'oid-1');
  assert.equal(identity?.email, 'sup@example.cl');
  assert.equal(resolveIdentity(claims({ oid: undefined }), entra)?.externalId, 'sub-1');
  assert.equal(
    resolveIdentity(claims({ email: undefined, preferred_username: 'p@example.cl' }), entra)?.email,
    'p@example.cl',
  );
  assert.equal(resolveIdentity(claims({ aud: 'other' }), entra), null);
  assert.equal(resolveIdentity(claims({ tid: 'other' }), entra), null);
  assert.equal(resolveIdentity(claims({ exp: 1 }), entra), null);
  assert.equal(resolveIdentity(claims({ email: undefined }), entra), null);
});

test('Entra logout URL targets the tenant and carries the post-logout redirect', () => {
  const url = new URL(buildLogoutUrl(entra));
  assert.equal(url.origin, 'https://rioloa.ciamlogin.com');
  assert.equal(url.pathname, '/tenant-1/oauth2/v2.0/logout');
  assert.equal(url.searchParams.get('post_logout_redirect_uri'), 'https://app.example/');
});

test('dashboard aggregates real report values', () => {
  const equipment = [{ code: 'CT-1', type: 'truck' as const, activities: 2 }];
  const summary = buildDashboardSummary([
    report('APPROVED', '2026-11-01', {
      summary: { area: 'A', supervisorName: 'S', activities: [], equipment, watermasterHourlyPerformance: 40 },
    }),
    report('APPROVED', '2026-11-01', {
      summary: { area: 'A', supervisorName: 'S', activities: [], equipment, watermasterHourlyPerformance: 20 },
    }),
    report('REJECTED', '2026-11-02'),
    report('IN_REVIEW', '2026-10-31'),
  ]);

  assert.deepEqual(summary.totals, {
    reports: 4,
    inReview: 1,
    sendFailed: 0,
    approved: 2,
    rejected: 1,
    truckM3: 144,
    watermasterM3: 400,
    activities: 8,
  });
  assert.equal(summary.approvalRate, 2 / 3);
  assert.equal(summary.watermasterHourlyAverage, 30);
  assert.deepEqual(
    summary.byDate.map((row) => row.date),
    ['2026-10-31', '2026-11-01', '2026-11-02'],
  );
  assert.deepEqual(summary.byDate[1], { date: '2026-11-01', reports: 2, truckM3: 72 });
  assert.deepEqual(summary.equipmentUsage, [{ code: 'CT-1', type: 'truck', participations: 4 }]);
});

test('dashboard does not invent rates without data', () => {
  const summary = buildDashboardSummary([]);
  assert.equal(summary.approvalRate, null);
  assert.equal(summary.watermasterHourlyAverage, null);
  assert.equal(summary.totals.reports, 0);
});

test('the report date follows the local clock, not UTC', () => {
  // 22:05 on the 1st in Chile is already the 2nd in UTC.
  assert.equal(localIsoDate(new Date(2026, 10, 1, 22, 5)), '2026-11-01');
  assert.equal(localIsoDate(new Date(2026, 0, 9, 0, 30)), '2026-01-09');
});

test('an untouched form is not a draft, and a draft never carries photos', () => {
  const blank = createInitialReport();
  assert.equal(hasReportContent(blank), false);
  assert.equal(hasReportContent({ ...blank, date: '2020-01-01' }), false);
  assert.equal(hasReportContent({ ...blank, supervisor: 'Ana' }), true);

  const [first] = blank.activities;
  const withPhoto = { ...blank, activities: [{ ...first, beforePhoto: { file: {} as File, previewUrl: 'blob:x' } }] };
  assert.equal(JSON.stringify(JSON.parse(serializeForm(withPhoto))).includes('beforePhoto'), false);
});

test('a new shift opens each meter at the reading the last one closed with', () => {
  const blank = createInitialReport();
  const previous: ReportData = {
    ...blank,
    date: '2026-10-31',
    supervisor: 'Ana',
    area: 'Pozas',
    apr: 'Luis',
    roster: [
      { equipmentId: 't1', equipmentCode: 'TVFZ-13', equipmentType: 'truck', operator: 'Pedro', hourmeterStart: '100', hourmeterEnd: '108', kmStart: '1000', kmEnd: '1050', collapsed: true },
      { equipmentId: 'm1', equipmentCode: 'EXC', equipmentType: 'machinery', operator: 'Rosa', hourmeterStart: '5', hourmeterEnd: '9', collapsed: false },
      { equipmentId: 'gone', equipmentCode: 'OLD', equipmentType: 'machinery', operator: 'X', hourmeterStart: '1', hourmeterEnd: '2', collapsed: false },
    ],
    activities: [
      {
        ...blank.activities[0],
        description: 'Solo de ese turno',
        watermaster: { ...blank.activities[0].watermaster!, sector: 'Norte', operator: 'Ivo', hourmeterEnd: '700', pumpHourmeterEnd: '300', manufacturerPerformance: '90' },
      },
    ],
  };

  const next = carryOverShift(previous, previous.date, ['t1', 'm1']);

  assert.equal(next.carriedFrom, '2026-10-31');
  assert.equal(next.supervisor, 'Ana');
  assert.deepEqual(next.roster.map((item) => item.equipmentId), ['t1', 'm1']);
  assert.deepEqual(
    [next.roster[0].operator, next.roster[0].hourmeterStart, next.roster[0].hourmeterEnd, next.roster[0].kmStart, next.roster[0].kmEnd, next.roster[0].collapsed],
    ['Pedro', '108', '', '1050', '', false],
  );
  assert.equal(next.roster[1].kmStart, undefined);
  assert.equal(next.activities.length, 1);
  assert.equal(next.activities[0].description, '');
  assert.equal(next.activities[0].watermaster?.hourmeterStart, '700');
  assert.equal(next.activities[0].watermaster?.pumpHourmeterStart, '300');
  assert.equal(next.activities[0].watermaster?.hourmeterEnd, '');
});

