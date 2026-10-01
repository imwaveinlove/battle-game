import { useState } from 'react';
import type { RawContent } from '../engine/schema';
import { BASE_RAW, useContentStore, useRaw } from '../store/contentStore';

const FILES: { key: keyof RawContent; file: string }[] = [
  { key: 'characters', file: 'characters.json' },
  { key: 'skills', file: 'skills.json' },
  { key: 'enemies', file: 'enemies.json' },
  { key: 'gacha', file: 'gacha.json' },
];

export default function ExportPanel() {
  const raw = useRaw();
  const setDraft = useContentStore((s) => s.setDraft);
  const [msg, setMsg] = useState('');

  const text = (k: keyof RawContent) => JSON.stringify(raw[k], null, 2) + '\n';
  const changed = (k: keyof RawContent) => JSON.stringify(raw[k]) !== JSON.stringify(BASE_RAW[k]);

  const download = (k: keyof RawContent, file: string) => {
    const url = URL.createObjectURL(new Blob([text(k)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = file;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copy = async (k: keyof RawContent) => {
    await navigator.clipboard.writeText(text(k));
    setMsg(`${k} 복사됨`);
  };

  const importFile = async (k: keyof RawContent, f: File) => {
    try {
      const data = JSON.parse(await f.text());
      setDraft({ ...structuredClone(raw), [k]: data });
      setMsg(`${f.name} 가져옴 (드래프트에 반영)`);
    } catch (e) {
      setMsg(`가져오기 실패: ${(e as Error).message}`);
    }
  };

  return (
    <div className="stack">
      <section className="card stack">
        <h3>배포 방법</h3>
        <ol className="small">
          <li>각 탭에서 편집 → 위의 "검증" 상태가 ✅ 인지 확인</li>
          <li>"게임에 적용"을 켜고 실제 게임 화면에서 테스트 (이 브라우저에만 적용)</li>
          <li>
            변경된 파일을 내려받아 저장소의 <code>data/</code> 폴더 파일과 교체
          </li>
          <li>커밋 &amp; 푸시 → GitHub Actions가 검증·테스트·빌드 후 모든 유저에게 배포</li>
        </ol>
      </section>
      {FILES.map(({ key, file }) => (
        <section key={key} className="card row between center-v wrap gap">
          <div>
            <b>data/{file}</b> {changed(key) ? <span className="tag-changed">변경됨</span> : <span className="muted small">변경 없음</span>}
          </div>
          <div className="row gap-sm wrap">
            <button className="btn btn-sm btn-primary" onClick={() => download(key, file)}>
              다운로드
            </button>
            <button className="btn btn-sm" onClick={() => copy(key)}>
              복사
            </button>
            <label className="btn btn-sm">
              가져오기
              <input type="file" accept=".json,application/json" hidden onChange={(e) => e.target.files?.[0] && importFile(key, e.target.files[0])} />
            </label>
          </div>
        </section>
      ))}
      {msg && <p className="small">{msg}</p>}
    </div>
  );
}
