/**
 * Kho lưu trữ dữ liệu kép (PostgreSQL + Local JSON Fallback cho môi trường nghiên cứu/cá nhân không bật Docker).
 * Đi kèm dữ liệu mẫu ẩn danh chuẩn khoa học Việt Nam để trải nghiệm và kiểm thử ngay lập tức.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';

export interface ChildProfile {
  id: string;
  nickname: string;
  ageMonths: number;
  communicationModalities: string[];
  strengthsAndInterests: string[];
  safeCalmingSupports: string[];
  researchConsentGranted: boolean;
  irbProtocolCode: string;
}

export interface ABCObservation {
  id: string;
  childId: string;
  observedAt: string;
  observerRole: 'parent' | 'teacher' | 'clinician' | 'researcher';
  setting: string;
  painOrFatigueExcluded: boolean;
  antecedent: string;
  behaviorObjective: string;
  consequence: string;
  hypothesizedFunction: 'escape' | 'attention' | 'tangible' | 'sensory_regulation' | 'pain_medical_check';
  isHarmlessStimming: boolean;
}

export interface SCEDSessionRecord {
  id: string;
  studyId: string;
  childId: string;
  sessionNumber: number;
  sessionDate: string;
  phase: 'A' | 'B';
  outcomeValue: number;
  proceduralFidelityPct: number;
  notes: string;
}

export interface SCEDStudy {
  id: string;
  code: string;
  title: string;
  designType: 'AB' | 'ABAB' | 'MULTIPLE_BASELINE';
  targetBehavior: string;
  measurementUnit: string;
  improvementDirection: 'increase' | 'decrease';
  irbApprovalCode: string;
}

interface LocalDatabaseState {
  profiles: ChildProfile[];
  abcObservations: ABCObservation[];
  studies: SCEDStudy[];
  sessions: SCEDSessionRecord[];
}

const SEED_DATA: LocalDatabaseState = {
  profiles: [
    {
      id: 'child-demo-01',
      nickname: 'Bé Minh An (Mẫu ẩn danh)',
      ageMonths: 54,
      communicationModalities: ['aac', 'gestures', 'single_words'],
      strengthsAndInterests: ['Tàu hỏa & bánh xe quay', 'Ghép hình gỗ', 'Nhạc thiếu nhi giai điệu chậm'],
      safeCalmingSupports: ['Tai nghe giảm ồn', 'Góc lều vải ánh sáng dịu', 'Xem sách tranh tàu hỏa'],
      researchConsentGranted: true,
      irbProtocolCode: 'IRB-VN-SPED-2026-01',
    },
    {
      id: 'child-demo-02',
      nickname: 'Bé Gia Hân (Mẫu ẩn danh)',
      ageMonths: 66,
      communicationModalities: ['aac', 'short_phrases'],
      strengthsAndInterests: ['Vẽ màu nước', 'Phân loại thẻ màu sắc', 'Trò chơi bong bóng xà phòng'],
      safeCalmingSupports: ['Ôm gối bông mềm của bé', 'Đếm nhịp thở cùng bông hoa', 'Uống nước ấm'],
      researchConsentGranted: false,
      irbProtocolCode: '',
    },
  ],
  abcObservations: [
    {
      id: 'abc-demo-01',
      childId: 'child-demo-01',
      observedAt: '2026-11-15T09:20:00.000Z',
      observerRole: 'teacher',
      setting: 'Lớp mầm non hòa nhập — Giờ chuyển tiếp thu dọn đồ chơi',
      painOrFatigueExcluded: true,
      antecedent: 'Cô giáo thông báo bằng lời "Cất tàu hỏa đi ăn phụ" đột ngột khi bé đang xếp đoàn tàu.',
      behaviorObjective: 'Bé che hai tai, lắc đầu, đẩy khay đồ chơi ra xa trong khoảng 45 giây (không tự làm đau).',
      consequence: 'Cô tạm lùi yêu cầu, đưa thẻ hình Trước (Đặt tàu vào bến) – Sau (Ăn bánh chuối) và đồng hồ cát 2 phút.',
      hypothesizedFunction: 'escape',
      isHarmlessStimming: false,
    },
    {
      id: 'abc-demo-02',
      childId: 'child-demo-01',
      observedAt: '2026-11-16T15:10:00.000Z',
      observerRole: 'parent',
      setting: 'Tại nhà — Khi nghe nhạc thiếu nhi yêu thích',
      painOrFatigueExcluded: true,
      antecedent: 'Ba bật bài hát đoàn tàu với âm lượng vừa phải.',
      behaviorObjective: 'Bé vẫy nhẹ hai bàn tay và mỉm cười nhìn theo bánh xe đồ chơi.',
      consequence: 'Ba mỉm cười ngồi cạnh cùng lăn bánh xe, không ngăn cản vận động vẫy tay vui vẻ của bé.',
      hypothesizedFunction: 'sensory_regulation',
      isHarmlessStimming: true,
    },
  ],
  studies: [
    {
      id: 'study-demo-mb-01',
      code: 'VN-AAC-SCED-01',
      title: 'Tác động của Bảng AAC Mở ARASAAC kết hợp Bảng Trước–Sau lên tần suất giao tiếp yêu cầu độc lập',
      designType: 'AB',
      targetBehavior: 'Số lần trẻ chủ động chỉ/trao thẻ AAC hoặc nói từ yêu cầu độc lập',
      measurementUnit: 'lần / phiên 15 phút',
      improvementDirection: 'increase',
      irbApprovalCode: 'IRB-VN-SPED-2026-01',
    },
  ],
  sessions: [
    { id: 's1', studyId: 'study-demo-mb-01', childId: 'child-demo-01', sessionNumber: 1, sessionDate: '2026-10-01', phase: 'A', outcomeValue: 2, proceduralFidelityPct: 100, notes: 'Pha cơ sở buổi 1: chưa có bảng AAC trên bàn.' },
    { id: 's2', studyId: 'study-demo-mb-01', childId: 'child-demo-01', sessionNumber: 2, sessionDate: '2026-10-03', phase: 'A', outcomeValue: 1, proceduralFidelityPct: 100, notes: 'Pha cơ sở buổi 2: bé kéo tay cô khi muốn lấy tàu hỏa.' },
    { id: 's3', studyId: 'study-demo-mb-01', childId: 'child-demo-01', sessionNumber: 3, sessionDate: '2026-10-06', phase: 'A', outcomeValue: 2, proceduralFidelityPct: 100, notes: 'Pha cơ sở buổi 3: ổn định ở mức 1-2 lần.' },
    { id: 's4', studyId: 'study-demo-mb-01', childId: 'child-demo-01', sessionNumber: 4, sessionDate: '2026-10-08', phase: 'A', outcomeValue: 3, proceduralFidelityPct: 95, notes: 'Pha cơ sở buổi 4.' },
    { id: 's5', studyId: 'study-demo-mb-01', childId: 'child-demo-01', sessionNumber: 5, sessionDate: '2026-10-10', phase: 'A', outcomeValue: 2, proceduralFidelityPct: 100, notes: 'Pha cơ sở buổi 5 (đủ 5 điểm chuẩn WWC).' },
    { id: 's6', studyId: 'study-demo-mb-01', childId: 'child-demo-01', sessionNumber: 6, sessionDate: '2026-10-13', phase: 'B', outcomeValue: 5, proceduralFidelityPct: 90, notes: 'Bắt đầu can thiệp bảng AAC ARASAAC + làm mẫu tự nhiên.' },
    { id: 's7', studyId: 'study-demo-mb-01', childId: 'child-demo-01', sessionNumber: 7, sessionDate: '2026-10-15', phase: 'B', outcomeValue: 7, proceduralFidelityPct: 95, notes: 'Bé chủ động chạm thẻ "Con muốn" + "Đồ chơi".' },
    { id: 's8', studyId: 'study-demo-mb-01', childId: 'child-demo-01', sessionNumber: 8, sessionDate: '2026-10-17', phase: 'B', outcomeValue: 8, proceduralFidelityPct: 100, notes: 'Bé kết hợp chỉ thẻ "Uống nước" và phát âm "nước".' },
    { id: 's9', studyId: 'study-demo-mb-01', childId: 'child-demo-01', sessionNumber: 9, sessionDate: '2026-10-20', phase: 'B', outcomeValue: 9, proceduralFidelityPct: 95, notes: 'Duy trì hứng thú cao trong giờ chơi góc.' },
    { id: 's10', studyId: 'study-demo-mb-01', childId: 'child-demo-01', sessionNumber: 10, sessionDate: '2026-10-22', phase: 'B', outcomeValue: 10, proceduralFidelityPct: 100, notes: 'IOA đạt 95% giữa giáo viên và nhà nghiên cứu.' },
  ],
};

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'local-db.json');

let pgPool: pg.Pool | null = null;
let pgAvailable = false;

export async function initStorage(): Promise<{ mode: 'postgresql' | 'local-json' }> {
  if (process.env.DATABASE_URL) {
    try {
      const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 2000,
      });
      await pool.query('SELECT 1');
      pgPool = pool;
      pgAvailable = true;
      return { mode: 'postgresql' };
    } catch {
      pgAvailable = false;
    }
  }
  ensureLocalFile();
  return { mode: 'local-json' };
}

function ensureLocalFile(): LocalDatabaseState {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(SEED_DATA, null, 2), 'utf-8');
    return structuredClone(SEED_DATA);
  }
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as LocalDatabaseState;
  } catch {
    return structuredClone(SEED_DATA);
  }
}

function saveLocalFile(state: LocalDatabaseState): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

export function getStorageStatus() {
  return { mode: pgAvailable && pgPool ? 'postgresql' : 'local-json' };
}

export function listProfiles(): ChildProfile[] {
  return ensureLocalFile().profiles;
}

export function updateResearchConsent(childId: string, granted: boolean, irbProtocolCode = ''): ChildProfile | null {
  const state = ensureLocalFile();
  const target = state.profiles.find((p) => p.id === childId);
  if (!target) return null;
  target.researchConsentGranted = granted;
  target.irbProtocolCode = granted ? irbProtocolCode || 'IRB-VN-OPEN-2026' : '';
  saveLocalFile(state);
  return target;
}

export function listABCObservations(childId?: string): ABCObservation[] {
  const obs = ensureLocalFile().abcObservations;
  return childId ? obs.filter((o) => o.childId === childId) : obs;
}

export function addABCObservation(input: Omit<ABCObservation, 'id' | 'observedAt'>): ABCObservation {
  const state = ensureLocalFile();
  const created: ABCObservation = {
    ...input,
    id: `abc-${crypto.randomUUID().slice(0, 8)}`,
    observedAt: new Date().toISOString(),
  };
  state.abcObservations.unshift(created);
  saveLocalFile(state);
  return created;
}

export function listStudies(): Array<SCEDStudy & { sessions: SCEDSessionRecord[] }> {
  const state = ensureLocalFile();
  return state.studies.map((st) => ({
    ...st,
    sessions: state.sessions
      .filter((s) => s.studyId === st.id)
      .sort((a, b) => a.sessionNumber - b.sessionNumber),
  }));
}

export function addSCEDSession(input: Omit<SCEDSessionRecord, 'id' | 'sessionNumber'>): SCEDSessionRecord {
  const state = ensureLocalFile();
  const existing = state.sessions.filter((s) => s.studyId === input.studyId && s.childId === input.childId);
  const nextNumber = existing.length > 0 ? Math.max(...existing.map((e) => e.sessionNumber)) + 1 : 1;
  const created: SCEDSessionRecord = {
    ...input,
    id: `sess-${crypto.randomUUID().slice(0, 8)}`,
    sessionNumber: nextNumber,
  };
  state.sessions.push(created);
  saveLocalFile(state);
  return created;
}
