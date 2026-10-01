import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BASE_CONTENT, RAW_BASE_CONTENT } from '../engine/baseContent';
import { parseContent, type Content, type RawContent } from '../engine/schema';

export type RawData = RawContent;

export const BASE_RAW = RAW_BASE_CONTENT as RawData;

interface ContentState {
  /** 어드민이 편집 중인 콘텐츠 (null = 편집 안 함) */
  draft: RawData | null;
  /** 드래프트를 실제 게임에 적용할지 */
  applyDraft: boolean;
  setDraft: (d: RawData) => void;
  updateDraft: (fn: (d: RawData) => void) => void;
  discardDraft: () => void;
  setApplyDraft: (v: boolean) => void;
}

export const useContentStore = create<ContentState>()(
  persist(
    (set, get) => ({
      draft: null,
      applyDraft: false,
      setDraft: (d) => set({ draft: d }),
      updateDraft: (fn) => {
        const d = structuredClone(get().draft ?? BASE_RAW);
        fn(d);
        set({ draft: d });
      },
      discardDraft: () => set({ draft: null, applyDraft: false }),
      setApplyDraft: (v) => set({ applyDraft: v }),
    }),
    { name: 'ohaeng-admin-draft' },
  ),
);

/** 게임에서 사용하는 콘텐츠: 드래프트 적용 중이고 유효하면 드래프트, 아니면 data/*.json */
export function useContent(): Content {
  const draft = useContentStore((s) => s.draft);
  const apply = useContentStore((s) => s.applyDraft);
  return useMemo(() => {
    if (apply && draft) {
      const r = parseContent(draft);
      if (r.ok) return r.content;
    }
    return BASE_CONTENT;
  }, [draft, apply]);
}

/** 어드민 편집용: 드래프트가 없으면 원본 데이터 */
export function useRaw(): RawData {
  return useContentStore((s) => s.draft) ?? BASE_RAW;
}
