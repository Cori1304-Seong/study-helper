"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  PenLine,
  Zap,
  Circle,
  PencilLine,
} from "lucide-react";
import { Note } from "../types/note";
import { noteIdFor } from "../lib/curriculum";
import { useAppStore } from "../lib/appStore";

export const CurriculumTree: React.FC = () => {
  const {
    curriculum: parts,
    noteById,
    questionsByNote,
    questionProgress,
    summary,
    notesWritable,
  } = useAppStore();

  // 홈에서 "새로 필기할 항"으로 강조할 항
  const highlightCode = summary.nextItem?.code;
  // /curriculum?note=note-2-1-1-6 으로 들어오면 그 필기를 펼친 채로 시작한다
  const openNoteId = useSearchParams().get("note") ?? undefined;
  // 필기가 있는 절과 강조 대상 절은 기본으로 펼친다
  const defaultOpen = useMemo(() => {
    const open = new Set<string>();
    for (const part of parts) {
      for (const chapter of part.chapters) {
        for (const section of chapter.sections) {
          const key = `${part.code}/${chapter.code}/${section.code}`;
          const hasNote = section.items.some((i) => i.noteId);
          const hasHighlight = section.items.some(
            (i) => i.code === highlightCode,
          );
          if (hasNote || hasHighlight) open.add(key);
        }
      }
    }
    return open;
  }, [parts, highlightCode]);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | undefined>(openNoteId);

  const isOpen = (key: string) => defaultOpen.has(key) !== collapsed.has(key);
  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const masteryOf = (noteId: string) => {
    const qs = questionsByNote.get(noteId) ?? [];
    const live = qs.filter((q) => !questionProgress.get(q.id)?.suppressed);
    const mastered = live.filter(
      (q) => questionProgress.get(q.id)?.status === "mastered",
    ).length;
    return {
      total: live.length,
      mastered,
      pct: live.length > 0 ? Math.round((mastered / live.length) * 100) : 0,
    };
  };

  const writtenCount = parts
    .flatMap((p) =>
      p.chapters.flatMap((c) => c.sections.flatMap((s) => s.items)),
    )
    .filter((i) => i.noteId).length;
  const totalCount = parts.flatMap((p) =>
    p.chapters.flatMap((c) => c.sections.flatMap((s) => s.items)),
  ).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      <div className="flex items-end justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            커리큘럼
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            교재 목차 전체. 필기하지 않은 항도 보여야 진도가 나온다.
          </p>
        </div>
        <span className="font-mono text-xs text-slate-400 shrink-0">
          필기 <strong className="text-amber-300">{writtenCount}</strong> /{" "}
          {totalCount}항
        </span>
      </div>

      <div className="space-y-5">
        {parts.map((part) => (
          <div key={part.code}>
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                {part.code}
              </span>
              {part.title}
            </h3>

            <div className="space-y-3">
              {part.chapters.map((chapter) => (
                <div key={chapter.code}>
                  <p className="text-[11px] font-semibold text-slate-500 mb-1.5 pl-1">
                    Chapter {chapter.code} · {chapter.title}
                  </p>

                  <div className="space-y-1.5">
                    {chapter.sections.map((section) => {
                      const key = `${part.code}/${chapter.code}/${section.code}`;
                      const open = isOpen(key);
                      const written = section.items.filter(
                        (i) => i.noteId,
                      ).length;

                      return (
                        <div
                          key={key}
                          className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
                        >
                          <button
                            onClick={() => toggle(key)}
                            className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-slate-800/40 transition text-left"
                          >
                            {open ? (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            )}
                            <span className="font-mono text-[11px] text-slate-500 shrink-0">
                              {section.code}
                            </span>
                            <span className="text-xs font-semibold text-slate-200 truncate">
                              {section.title}
                            </span>
                            <span className="ml-auto font-mono text-[10px] text-slate-500 shrink-0">
                              {written > 0 && (
                                <span className="text-amber-300">
                                  {written}
                                </span>
                              )}
                              {written > 0 && "/"}
                              {section.items.length}항
                            </span>
                          </button>

                          {open && (
                            <ul className="border-t border-slate-800/80 divide-y divide-slate-800/60">
                              {section.items.map((item) => {
                                const note = item.noteId
                                  ? noteById.get(item.noteId)
                                  : undefined;
                                const m = note ? masteryOf(note.id) : undefined;
                                const isHighlighted =
                                  item.code === highlightCode;
                                // 필기가 없는 항도 펼칠 수 있어야 "여기서 시작"이 된다
                                const rowId = noteIdFor(part.code, item.code);
                                const isSelected = selected === rowId;

                                return (
                                  <li key={item.code}>
                                    <button
                                      onClick={() =>
                                        setSelected(
                                          isSelected ? undefined : rowId,
                                        )
                                      }
                                      className={`w-full flex items-center gap-2 px-3 py-2 text-left transition hover:bg-slate-800/40 ${
                                        isHighlighted
                                          ? "bg-amber-500/10 border-l-2 border-amber-500"
                                          : ""
                                      }`}
                                    >
                                      {note ? (
                                        <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                      ) : (
                                        <Circle className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                                      )}
                                      <span className="font-mono text-[10px] text-slate-500 shrink-0 w-10">
                                        {item.code}
                                      </span>
                                      <span
                                        className={`text-xs truncate ${
                                          note
                                            ? "text-slate-200 font-medium"
                                            : "text-slate-500"
                                        }`}
                                      >
                                        {item.title}
                                      </span>

                                      {isHighlighted && !note && (
                                        <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded shrink-0">
                                          다음 필기
                                        </span>
                                      )}

                                      <span className="ml-auto flex items-center gap-2 shrink-0">
                                        {m && (
                                          <>
                                            <span className="hidden sm:block w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                              <span
                                                style={{ width: `${m.pct}%` }}
                                                className="block h-full bg-emerald-500"
                                              />
                                            </span>
                                            <span className="font-mono text-[10px] text-emerald-400 w-9 text-right">
                                              {m.pct}%
                                            </span>
                                          </>
                                        )}
                                        <span className="font-mono text-[10px] text-slate-600 w-10 text-right">
                                          p.{item.page || "?"}
                                        </span>
                                      </span>
                                    </button>

                                    {isSelected &&
                                      (note ? (
                                        <NoteDetail
                                          note={note}
                                          writable={notesWritable}
                                          questionCount={
                                            (questionsByNote.get(note.id) ?? [])
                                              .length
                                          }
                                        />
                                      ) : (
                                        <EmptyNoteDetail
                                          noteId={rowId}
                                          writable={notesWritable}
                                        />
                                      ))}
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const KIND_LABEL: Record<string, string> = {
  overview: "서술",
  command: "명령어 표",
  file: "파일 표",
  config: "설정 원문",
  steps: "절차",
};

const EmptyNoteDetail: React.FC<{ noteId: string; writable: boolean }> = ({
  noteId,
  writable,
}) => (
  <div className="bg-slate-950/70 border-t border-slate-800 px-3.5 py-3.5">
    <p className="text-xs text-slate-400 break-keep">
      아직 필기하지 않은 항입니다. 필기를 쓰면 문제가 자동으로 파생됩니다.
    </p>
    {writable ? (
      <Link
        href={`/notes/${noteId}/edit`}
        className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition"
      >
        <PencilLine className="w-3.5 h-3.5" />
        필기 시작
      </Link>
    ) : (
      <p className="mt-2 text-[11px] text-slate-500 break-keep">
        배포 환경에서는 필기를 쓸 수 없습니다. 로컬에서 작성한 뒤
        커밋·푸시하세요.
      </p>
    )}
  </div>
);

const NoteDetail: React.FC<{
  note: Note;
  questionCount: number;
  writable: boolean;
}> = ({ note, questionCount, writable }) => (
  <div className="bg-slate-950/70 border-t border-slate-800 px-3.5 py-3.5">
    <p className="text-xs text-slate-300 leading-relaxed break-keep">
      {note.summary}
    </p>

    <div className="flex flex-wrap gap-1 mt-2">
      {note.tags.map((tag) => (
        <span
          key={tag}
          className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400"
        >
          #{tag}
        </span>
      ))}
    </div>

    <ul className="mt-3 space-y-1">
      {note.sections.map((s) => (
        <li
          key={s.id}
          className="flex items-center gap-2 text-[11px] bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5"
        >
          <span className="text-slate-200 font-medium truncate">{s.title}</span>
          <span className="ml-auto font-mono text-[10px] text-slate-500 shrink-0">
            {KIND_LABEL[s.kind]}
            {s.items ? ` · ${s.items.length}개` : ""}
            {s.blanks ? ` · 빈칸 ${s.blanks.length}` : ""}
          </span>
        </li>
      ))}
    </ul>

    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Link
        href={`/recall?note=${note.id}`}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition"
      >
        <PenLine className="w-3.5 h-3.5" />
        백지 인출
      </Link>
      <Link
        href={`/drill?note=${note.id}&filter=all`}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
      >
        <Zap className="w-3.5 h-3.5" />
        문제 풀이 ({questionCount})
      </Link>
      {writable ? (
        <Link
          href={`/notes/${note.id}/edit`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition"
        >
          <PencilLine className="w-3.5 h-3.5" />
          필기 편집
        </Link>
      ) : (
        <span
          title="배포 환경에서는 읽기 전용입니다"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/50 text-slate-600 text-xs font-bold border border-slate-800 cursor-not-allowed"
        >
          <PencilLine className="w-3.5 h-3.5" />
          읽기 전용
        </span>
      )}
    </div>
  </div>
);
