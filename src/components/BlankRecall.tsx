"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  Filter,
  Keyboard,
  Layers,
  NotebookPen,
} from "lucide-react";
import { NoteItem, NoteSection, NoteSectionProgress } from "../types/note";
import { CardStatus } from "../types";
import { STATUS_META, formatDue, isDue } from "../lib/review";
import { useAppStore } from "../lib/appStore";

const KIND_HINT: Record<NoteSection["kind"], string> = {
  overview: "머릿속으로 설명해본 뒤 열어보세요",
  command: "명령어와 옵션을 종이에 적은 뒤 열어보세요",
  file: "경로와 필드 포맷을 적은 뒤 열어보세요",
  config: "설정 원문을 그대로 써본 뒤 열어보세요",
  steps: "순서대로 적은 뒤 열어보세요",
};

const KIND_BADGE: Record<NoteSection["kind"], string> = {
  overview: "서술",
  command: "명령어",
  file: "파일",
  config: "설정",
  steps: "절차",
};

export const BlankRecall: React.FC = () => {
  const { notes, sectionProgress, rateSection } = useAppStore();
  const params = useSearchParams();

  // /recall?note=...&due=1 로 진입 지점을 지정할 수 있다
  const [selectedNoteId, setSelectedNoteId] = useState(
    () => params.get("note") ?? notes[0].id,
  );
  const [dueOnly, setDueOnly] = useState(() => params.get("due") === "1");

  const note = useMemo(
    () => notes.find((n) => n.id === selectedNoteId) ?? notes[0],
    [notes, selectedNoteId],
  );

  const sections = useMemo(() => {
    if (!note) return [];
    if (!dueOnly) return note.sections;
    return note.sections.filter((s) =>
      isDue(sectionProgress.get(s.id)?.nextReviewAt),
    );
  }, [note, dueOnly, sectionProgress]);

  if (!note) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      {/* 필기 선택 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 mb-5">
        <div className="flex items-center gap-2 mb-2.5">
          <Layers className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-semibold text-slate-300">
            인출할 필기 선택
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {notes.map((n) => {
            const done = n.sections.filter(
              (s) => sectionProgress.get(s.id)?.status === "mastered",
            ).length;
            const active = n.id === note.id;
            return (
              <button
                key={n.id}
                onClick={() => setSelectedNoteId(n.id)}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition border ${
                  active
                    ? "bg-violet-600 text-white border-violet-500 font-bold"
                    : "bg-slate-800/60 text-slate-300 border-slate-700 hover:text-white"
                }`}
              >
                <span className="font-mono text-[10px] opacity-60 mr-1">
                  {n.book.item}
                </span>
                {n.title}
                <span
                  className={`ml-1.5 font-mono text-[10px] ${
                    active ? "text-violet-100" : "text-slate-500"
                  }`}
                >
                  {done}/{n.sections.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 필기 헤더 */}
      <div className="mb-4">
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-mono">
          Part0{note.book.part} · {note.book.item} · p.{note.book.page}
        </span>
        <h2 className="text-xl font-bold text-white mt-1.5 tracking-tight">
          {note.title}
        </h2>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed break-keep">
          {note.summary}
        </p>
      </div>

      {/* 필터 & 단축키 */}
      <div className="flex items-center justify-between gap-3 mb-4 text-xs">
        <button
          onClick={() => setDueOnly((v) => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium border transition ${
            dueOnly
              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
              : "bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200"
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>복습 기한 도래분만</span>
        </button>
        <span className="text-[11px] text-slate-500 items-center gap-1 hidden sm:flex">
          <Keyboard className="w-3 h-3" />
          Space 공개 | 1·2·3 평가 | ↑↓ 이동
        </span>
      </div>

      {sections.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">
            지금 복습할 섹션이 없습니다
          </h3>
          <p className="text-xs text-slate-400">
            필터를 끄면 전체 섹션을 다시 볼 수 있습니다.
          </p>
        </div>
      ) : (
        // key를 바꿔 가림/커서 상태를 자동으로 리셋한다
        <SectionList
          key={`${note.id}|${dueOnly}`}
          sections={sections}
          sectionProgress={sectionProgress}
          onRate={rateSection}
        />
      )}
    </div>
  );
};

const SectionList: React.FC<{
  sections: NoteSection[];
  sectionProgress: Map<string, NoteSectionProgress>;
  onRate: (sectionId: string, status: CardStatus) => void;
}> = ({ sections, sectionProgress, onRate }) => {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [activeIndex, setActiveIndex] = useState(0);

  const reveal = useCallback(
    (id: string) => setRevealed((prev) => new Set(prev).add(id)),
    [],
  );

  const hide = useCallback(
    (id: string) =>
      setRevealed((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      }),
    [],
  );

  const handleRate = useCallback(
    (id: string, status: CardStatus) => {
      onRate(id, status);
      hide(id);
      setActiveIndex((prev) => Math.min(prev + 1, sections.length - 1));
    },
    [onRate, hide, sections.length],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName))
        return;
      const active = sections[activeIndex];
      if (!active) return;

      if (e.code === "Space") {
        e.preventDefault();
        if (revealed.has(active.id)) hide(active.id);
        else reveal(active.id);
      } else if (e.key === "1") handleRate(active.id, "unlearned");
      else if (e.key === "2") handleRate(active.id, "uncertain");
      else if (e.key === "3") handleRate(active.id, "mastered");
      else if (e.key === "ArrowDown" || e.key === "ArrowRight")
        setActiveIndex((p) => Math.min(p + 1, sections.length - 1));
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft")
        setActiveIndex((p) => Math.max(p - 1, 0));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sections, activeIndex, revealed, reveal, hide, handleRate]);

  return (
    <div className="space-y-3">
      {sections.map((section, idx) => {
        const progress = sectionProgress.get(section.id);
        const meta = STATUS_META[progress?.status ?? "unlearned"];
        const isRevealed = revealed.has(section.id);
        const isActive = idx === activeIndex;
        const itemCount = section.items?.length ?? 0;

        return (
          <section
            key={section.id}
            onClick={() => setActiveIndex(idx)}
            className={`bg-slate-900 border-2 rounded-2xl overflow-hidden transition-all ${
              isActive
                ? "border-violet-500/50 shadow-lg shadow-violet-950/20"
                : "border-slate-800"
            }`}
          >
            {/* 인출 단서: 섹션 제목과 항목 개수만 */}
            <div className="px-4 py-3 flex items-center justify-between gap-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-sm font-bold text-white truncate">
                  {section.title}
                </h3>
                <span className="text-[10px] font-mono text-slate-500 shrink-0">
                  {KIND_BADGE[section.kind]}
                  {section.kind === "steps" && ` · ${itemCount}단계`}
                  {(section.kind === "command" || section.kind === "file") &&
                    ` · ${itemCount}개`}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-mono text-slate-500">
                  {formatDue(progress?.nextReviewAt)}
                </span>
                <span
                  className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded-full border ${meta.bg} ${meta.text} ${meta.border}`}
                >
                  {meta.label}
                </span>
              </div>
            </div>

            {isRevealed ? (
              <div className="p-4">
                <SectionBody section={section} />
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIndex(idx);
                  reveal(section.id);
                }}
                className="w-full py-8 px-4 flex flex-col items-center justify-center text-center group"
              >
                <EyeOff className="w-5 h-5 text-slate-600 group-hover:text-violet-400 mb-2 transition" />
                <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-200 transition break-keep">
                  {KIND_HINT[section.kind]}
                </span>
              </button>
            )}

            {isRevealed && (
              <div className="px-4 pb-4 pt-1">
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80">
                  <RateButton
                    label="❌ 모름"
                    shortcut="1"
                    tone="rose"
                    onClick={() => handleRate(section.id, "unlearned")}
                  />
                  <RateButton
                    label="🔺 헷갈림"
                    shortcut="2"
                    tone="amber"
                    onClick={() => handleRate(section.id, "uncertain")}
                  />
                  <RateButton
                    label="⭕ 체화"
                    shortcut="3"
                    tone="emerald"
                    onClick={() => handleRate(section.id, "mastered")}
                  />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    hide(section.id);
                  }}
                  className="mt-2 w-full flex items-center justify-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition py-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>다시 가리기</span>
                </button>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};

/** 섹션 종류별 본문 렌더링 */
export const SectionBody: React.FC<{ section: NoteSection }> = ({
  section,
}) => {
  if (section.kind === "overview") {
    return (
      <p className="text-sm text-slate-300 leading-relaxed break-keep">
        {section.body}
      </p>
    );
  }

  if (section.kind === "config") {
    return (
      <div>
        {section.path && (
          <p className="text-[11px] font-mono text-slate-500 mb-1.5">
            {section.path}
          </p>
        )}
        <pre className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
          {section.body}
        </pre>
        {section.blanks && section.blanks.length > 0 && (
          <p className="mt-2 text-[10px] text-slate-500">
            빈칸 대상 토큰: {section.blanks.join(", ")}
          </p>
        )}
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {(section.items ?? []).map((item, i) => (
        <li
          key={`${section.id}-${i}`}
          className="flex items-start gap-2.5 bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2.5"
        >
          {section.kind === "steps" && (
            <span className="shrink-0 w-5 h-5 rounded-md bg-violet-500/15 border border-violet-500/30 text-violet-300 text-[11px] font-mono font-bold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <code className="text-sm font-mono font-semibold text-emerald-300 break-all">
              {item.term}
            </code>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed break-keep">
              {item.desc}
            </p>
            {item.format && (
              <p className="text-[11px] font-mono text-sky-300 mt-1 break-all">
                {item.format}
              </p>
            )}
            {item.options && item.options.length > 0 && (
              <ul className="mt-1.5 flex flex-wrap gap-1">
                {item.options.map((opt) => (
                  <li
                    key={opt.flag}
                    className="text-[10px] bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5"
                  >
                    <code className="font-mono text-amber-300">{opt.flag}</code>
                    <span className="text-slate-400 ml-1">{opt.meaning}</span>
                  </li>
                ))}
              </ul>
            )}

            <ItemDetails item={item} />
          </div>
        </li>
      ))}
    </ul>
  );
};

/**
 * 상세 설명은 접어 둔다.
 *
 * 펼쳐두면 "섹션 제목만 보고 재구성하는" 화면이 문서 뷰어가 된다. 상세는 인출
 * 대상이 아니라 참고 자료다. 그래서 헤더의 "N개 항목" 단서에도 세지 않는다.
 */
const ItemDetails: React.FC<{ item: NoteItem }> = ({ item }) => {
  const optionDetails = (item.options ?? []).filter((o) => o.detail?.trim());
  if (!item.detail?.trim() && optionDetails.length === 0) return null;

  return (
    <details className="mt-2 group">
      <summary className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer list-none transition">
        <NotebookPen className="w-3 h-3" />
        상세 메모
        <ChevronRight className="w-3 h-3 transition-transform group-open:rotate-90" />
      </summary>

      <div className="mt-1.5 pl-2 border-l-2 border-slate-800 space-y-2">
        {item.detail?.trim() && (
          <p className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap break-keep">
            {item.detail}
          </p>
        )}
        {optionDetails.map((opt) => (
          <div key={opt.flag}>
            <code className="text-[10px] font-mono text-amber-300">
              {opt.flag}
            </code>
            <p className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap break-keep">
              {opt.detail}
            </p>
          </div>
        ))}
      </div>
    </details>
  );
};

const TONES = {
  rose: "bg-rose-950/40 hover:bg-rose-900/50 border-rose-500/30 text-rose-300",
  amber:
    "bg-amber-950/40 hover:bg-amber-900/50 border-amber-500/30 text-amber-300",
  emerald:
    "bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-500/30 text-emerald-300",
} as const;

const RateButton: React.FC<{
  label: string;
  shortcut: string;
  tone: keyof typeof TONES;
  onClick: () => void;
}> = ({ label, shortcut, tone, onClick }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border transition active:scale-95 ${TONES[tone]}`}
  >
    <span className="text-xs font-bold">{label}</span>
    <kbd className="hidden sm:inline-block text-[10px] bg-black/30 px-1.5 py-0.5 rounded border border-white/10">
      {shortcut}
    </kbd>
  </button>
);
