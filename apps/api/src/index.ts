import 'dotenv/config';
import crypto from 'node:crypto';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';

import { CORE_VIETNAMESE_AAC_CARDS, searchArasaacPictograms } from './aac/arasaac.js';
import {
  generateSocialStoryVi,
  generateVietnameseIEPDraft,
  getActiveProviderInfo,
} from './ai/provider.js';
import { computeLocalBinaryIOAFallback, computeLocalSCEDFallback } from './research/localFallbackStats.js';
import { evaluatePreLLMSafety, sanitizeLLMOutputVi } from './safety/firewall.js';
import {
  addABCObservation,
  addSCEDSession,
  getStorageStatus,
  initStorage,
  listABCObservations,
  listProfiles,
  listStudies,
  updateResearchConsent,
} from './store/repository.js';

const app = new Hono();
app.use('*', cors());

const RESEARCH_ENGINE_URL = process.env.RESEARCH_ENGINE_URL || 'http://127.0.0.1:8000';

app.get('/', (c) => {
  return c.json({
    message: 'OpenSpectrum-VN — API Gateway đang hoạt động.',
    web_app_ui: 'http://localhost:5173',
    health_endpoint: '/api/health',
    research_engine_docs: 'http://127.0.0.1:8000/docs',
  });
});

app.get('/api/health', async (c) => {
  let pythonEngineOnline = false;
  try {
    const r = await fetch(`${RESEARCH_ENGINE_URL}/health`, { signal: AbortSignal.timeout(1500) });
    pythonEngineOnline = r.ok;
  } catch {
    pythonEngineOnline = false;
  }

  return c.json({
    status: 'ok',
    platform: 'OpenSpectrum-VN — Open Science Autism Platform',
    license: 'AGPL-3.0-or-later + CC-BY-NC-SA-4.0',
    storage: getStorageStatus(),
    aiAdapter: getActiveProviderInfo(),
    pythonResearchEngine: {
      url: RESEARCH_ENGINE_URL,
      online: pythonEngineOnline,
      fallbackActive: !pythonEngineOnline,
    },
  });
});

// 1. Cổng kiểm tra An toàn Lâm sàng Cứng (Deterministic Safety Firewall)
app.post('/api/safety/check', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const text = typeof body.text === 'string' ? body.text : '';
  const preCheck = evaluatePreLLMSafety(text);
  const postFilterSample = sanitizeLLMOutputVi(text);
  return c.json({
    preCheck,
    sanitizedPreview: postFilterSample,
  });
});

// 2. Bảng Giao tiếp AAC Mở Tiếng Việt (ARASAAC)
app.get('/api/aac/core', (c) => {
  return c.json({
    source: 'ARASAAC Open Pictograms (CC BY-NC-SA 4.0)',
    cards: CORE_VIETNAMESE_AAC_CARDS,
  });
});

app.get('/api/aac/search', async (c) => {
  const q = c.req.query('q') || '';
  const cards = await searchArasaacPictograms(q);
  return c.json({ query: q, cards });
});

// 3. Hồ sơ Nhu cầu Hỗ trợ (SNP) & Đồng thuận Đạo đức Nghiên cứu (IRB Consent)
app.get('/api/profiles', (c) => {
  return c.json({ profiles: listProfiles() });
});

app.post('/api/consents', async (c) => {
  const schema = z.object({
    childId: z.string().min(1),
    researchConsentGranted: z.boolean(),
    irbProtocolCode: z.string().optional(),
  });
  const parsed = schema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: 'Dữ liệu đồng thuận không hợp lệ.' }, 400);
  }
  const updated = updateResearchConsent(
    parsed.data.childId,
    parsed.data.researchConsentGranted,
    parsed.data.irbProtocolCode,
  );
  if (!updated) return c.json({ error: 'Không tìm thấy hồ sơ trẻ.' }, 404);
  return c.json({ profile: updated });
});

// 4. Nhật ký Hành vi Chức năng A-B-C
app.get('/api/abc', (c) => {
  const childId = c.req.query('childId');
  return c.json({ observations: listABCObservations(childId || undefined) });
});

app.post('/api/abc', async (c) => {
  const schema = z.object({
    childId: z.string().min(1),
    observerRole: z.enum(['parent', 'teacher', 'clinician', 'researcher']),
    setting: z.string().min(1),
    painOrFatigueExcluded: z.boolean(),
    antecedent: z.string().min(2),
    behaviorObjective: z.string().min(2),
    consequence: z.string().min(2),
    hypothesizedFunction: z.enum([
      'escape',
      'attention',
      'tangible',
      'sensory_regulation',
      'pain_medical_check',
    ]),
    isHarmlessStimming: z.boolean(),
  });
  const body = await c.req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Vui lòng điền đầy đủ Tiền đề (A), Hành vi quan sát được (B) và Hệ quả (C).' }, 400);
  }

  // Luôn kiểm tra an toàn y khoa trước khi lưu nhật ký ABC!
  const safety = evaluatePreLLMSafety(
    `${parsed.data.antecedent} ${parsed.data.behaviorObjective} ${parsed.data.consequence}`,
  );
  const created = addABCObservation(parsed.data);
  return c.json({
    observation: created,
    safetyAlert: safety.blocked ? safety : null,
  });
});

// 5. Trình tạo Câu chuyện xã hội Carol Gray (tự động xác minh tỷ lệ >= 2:1)
app.post('/api/social-story', async (c) => {
  const schema = z.object({
    childNickname: z.string().min(1),
    situationVi: z.string().min(3),
    sensorySupportVi: z.string().optional(),
  });
  const parsed = schema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: 'Vui lòng nhập tên gọi của trẻ và tình huống cần chuẩn bị.' }, 400);
  }
  try {
    const story = await generateSocialStoryVi(parsed.data);
    return c.json(story);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Đã kích hoạt cổng an toàn.' }, 422);
  }
});

// 6. Trình tạo dự thảo Kế hoạch Giáo dục Cá nhân (KHGDCN / IEP — Thông tư 03/2018/TT-BGDĐT)
app.post('/api/iep', async (c) => {
  const schema = z.object({
    childNickname: z.string().min(1),
    ageMonths: z.number().int().min(12).max(260),
    strengths: z.string().min(2),
    priorityDomain: z.string().min(2),
    currentBaselineVi: z.string().min(2),
  });
  const parsed = schema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: 'Thông tin KHGDCN chưa hợp lệ.' }, 400);
  }
  try {
    const draft = await generateVietnameseIEPDraft(parsed.data);
    return c.json(draft);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Đã kích hoạt cổng an toàn.' }, 422);
  }
});

// 7. Phân hệ Nghiên cứu Khoa học Mở (SCED, IOA, FAIR Export)
app.get('/api/research/studies', (c) => {
  return c.json({ studies: listStudies() });
});

app.post('/api/research/sessions', async (c) => {
  const schema = z.object({
    studyId: z.string().min(1),
    childId: z.string().min(1),
    sessionDate: z.string().min(8),
    phase: z.enum(['A', 'B']),
    outcomeValue: z.number(),
    proceduralFidelityPct: z.number().min(0).max(100),
    notes: z.string().default(''),
  });
  const parsed = schema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: 'Dữ liệu phiên SCED không hợp lệ.' }, 400);
  }
  const created = addSCEDSession(parsed.data);
  return c.json({ session: created });
});

app.post('/api/research/analyze', async (c) => {
  const schema = z.object({
    baseline: z.array(z.number()).min(2),
    intervention: z.array(z.number()).min(2),
    direction: z.enum(['increase', 'decrease']).default('increase'),
  });
  const parsed = schema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: 'Cần ít nhất 2 điểm dữ liệu ở Pha A và 2 điểm ở Pha B.' }, 400);
  }

  try {
    const resp = await fetch(`${RESEARCH_ENGINE_URL}/sced/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(3000),
      body: JSON.stringify(parsed.data),
    });
    if (resp.ok) {
      const data = await resp.json();
      return c.json({ ...data, engine: 'python-scipy-research-engine' });
    }
  } catch {
    // Rơi về bộ tính toán tất định nội bộ nếu tiến trình Python chưa bật
  }

  return c.json(
    computeLocalSCEDFallback(parsed.data.baseline, parsed.data.intervention, parsed.data.direction),
  );
});

app.post('/api/research/ioa', async (c) => {
  const schema = z.object({
    observer_1: z.array(z.number().int().min(0).max(1)).min(2),
    observer_2: z.array(z.number().int().min(0).max(1)).min(2),
    fidelity_steps: z.array(z.boolean()).optional(),
  });
  const parsed = schema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: 'Chuỗi quan sát nhị phân IOA cần cùng độ dài >= 2 và chỉ chứa 0 hoặc 1.' }, 400);
  }

  try {
    const resp = await fetch(`${RESEARCH_ENGINE_URL}/ioa/binary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(3000),
      body: JSON.stringify(parsed.data),
    });
    if (resp.ok) {
      return c.json(await resp.json());
    }
  } catch {
    // Fallback
  }

  return c.json(computeLocalBinaryIOAFallback(parsed.data.observer_1, parsed.data.observer_2));
});

app.post('/api/research/fair-export', async (c) => {
  const studies = listStudies();
  const profiles = listProfiles();
  const study = studies[0];
  if (!study) return c.json({ error: 'Chưa có đề tài nghiên cứu.' }, 404);

  const records = study.sessions.map((s) => {
    const child = profiles.find((p) => p.id === s.childId);
    return {
      child_id: s.childId,
      child_name: child?.nickname.replace(' (Mẫu ẩn danh)', '') || '',
      session_number: s.sessionNumber,
      phase: s.phase,
      session_date: s.sessionDate,
      age_months: child?.ageMonths ?? 48,
      outcome_value: s.outcomeValue,
      procedural_fidelity_pct: s.proceduralFidelityPct,
      notes: s.notes,
      research_consent_granted: Boolean(child?.researchConsentGranted),
    };
  });

  try {
    const resp = await fetch(`${RESEARCH_ENGINE_URL}/fair/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(4000),
      body: JSON.stringify({
        study_id: study.code,
        study_title: study.title,
        target_behavior: study.targetBehavior,
        improvement_direction: study.improvementDirection,
        records,
      }),
    });
    if (resp.ok) {
      return c.json(await resp.json());
    }
  } catch {
    // Fallback khử định danh nội bộ nếu chưa chạy Python service
  }

  const salt = process.env.DEIDENTIFICATION_SALT || 'openspectrum-vn-fallback-salt';
  const consented = records.filter((r) => r.research_consent_granted);
  const csvLines = [
    'subject_code,session_number,phase,age_months,outcome_value,procedural_fidelity_pct,sanitized_notes',
    ...consented.map((r) => {
      const code =
        'SUBJ-' + crypto.createHmac('sha256', salt).update(r.child_id).digest('hex').slice(0, 8).toUpperCase();
      const safeNote = r.notes.replace(/"/g, '""');
      return `${code},${r.session_number},${r.phase},${r.age_months},${r.outcome_value},${r.procedural_fidelity_pct},"${safeNote}"`;
    }),
  ];

  return c.json({
    datapackage: {
      profile: 'tabular-data-package',
      name: `openspectrum-vn-sced-${study.code.toLowerCase()}`,
      title: study.title,
      licenses: [{ name: 'CC-BY-NC-SA-4.0' }],
    },
    csv_content: csvLines.join('\n'),
    reproducible_r_script:
      'library(SingleCaseES)\ndat <- read.csv("sced_observations.csv")\nbatch_calc_ES(dat, grouping = subject_code, condition = phase, outcome = outcome_value, session_number = session_number, baseline_phase = "A", intervention_phase = "B")',
    exported_count: consented.length,
    excluded_unconsented_count: records.length - consented.length,
  });
});

const port = Number(process.env.API_PORT || 4000);

initStorage().then((storageInfo) => {
  serve({ fetch: app.fetch, port }, () => {
    console.log(
      `[OpenSpectrum-VN API] Đang chạy tại http://localhost:${port} (Kho dữ liệu: ${storageInfo.mode})`,
    );
  });
});
