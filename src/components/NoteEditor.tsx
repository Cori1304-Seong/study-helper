"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  LoaderCircle,
  NotebookPen,
  Plus,
  Save,
  Trash2,
  Zap,
} from "lucide-react";
import { Note, NoteItem, NoteSection, NoteSectionKind } from "../types/note";
import { deriveQuestions } from "../lib/questions";

interface NoteEditorProps {
  note: Note;
  isNew: boolean;
  writable: boolean;
  locationTitle: string;
}

const KIND_META: Record<
  NoteSectionKind,
  { label: string; hint: string; derives: string }
> = {
  command: {
    label: "명령어 표",
    hint: "명령어 / 기능 / 옵션쌍. 옵션은 하나하나가 문제가 된다.",
    derives: "열거형 + 정방향 + 역방향 + 옵션형",
  },
  file: {
    label: "파일 표",
    hint: "경로 / 역할 / 필드 포맷.",
    derives: "열거형 + 역방향 + 포맷형",
  },
  config: {
    label: "설정 원문",
    hint: "원문을 그대로 붙여넣고 가릴 토큰을 고른다.",
    derives: "빈칸형",
  },
  steps: {
    label: "절차",
    hint: "순서 자체가 지식인 경우.",
    derives: "순서형",
  },
  overview: {
    label: "서술",
    hint: "표로 떨어지지 않는 이해. 문제를 만들지 않고 백지 인출로만 다룬다.",
    derives: "없음 (백지 인출 전용)",
  },
};

const KIND_ORDER: NoteSectionKind[] = [
  "command",
  "file",
  "config",
  "steps",
  "overview",
];

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note: initial,
  isNew,
  writable,
  locationTitle,
}) => {
  const router = useRouter();
  const [note, setNote] = useState<Note>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 기획서 8절: "저장 시 파생 문제 수 미리보기"
  const derived = useMemo(() => deriveQuestions(note), [note]);

  const patch = (changes: Partial<Note>) =>
    setNote((prev) => ({ ...prev, ...changes }));

  const patchSection = (index: number, changes: Partial<NoteSection>) =>
    setNote((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) =>
        i === index ? { ...s, ...changes } : s,
      ),
    }));

  const addSection = (kind: NoteSectionKind) => {
    const base: NoteSection = {
      id: nextSectionId(note, kind),
      title: KIND_META[kind].label,
      kind,
      ...(kind === "overview" || kind === "config"
        ? { body: "" }
        : { items: [] }),
      ...(kind === "config" ? { path: "", blanks: [] } : {}),
    };
    patch({ sections: [...note.sections, base] });
  };

  const removeSection = (index: number) => {
    const section = note.sections[index];
    if (
      !confirm(
        `"${section.title}" 섹션을 지웁니다.\n이 섹션에서 파생된 문제의 학습 기록도 함께 삭제됩니다.`,
      )
    )
      return;
    patch({ sections: note.sections.filter((_, i) => i !== index) });
  };

  const moveSection = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= note.sections.length) return;
    const next = [...note.sections];
    [next[index], next[target]] = [next[target], next[index]];
    patch({ sections: next });
  };

  const save = async () => {
    setSaving(true);
    setError(null);

    const res = await fetch(isNew ? "/api/notes" : `/api/notes/${note.id}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(note),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error ?? "저장에 실패했습니다.");
      setSaving(false);
      return;
    }

    // 서버 컴포넌트가 새 필기를 다시 읽도록 갱신하고 커리큘럼으로 돌아간다
    router.push(`/curriculum?note=${note.id}`);
    router.refresh();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      <Link
        href="/curriculum"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        커리큘럼으로
      </Link>

      {!writable && (
        <div className="mb-4 bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs rounded-xl px-3.5 py-2.5 break-keep">
          배포 환경에서는 저장할 수 없습니다. 로컬 `next dev`에서 편집한 뒤
          커밋·푸시하세요.
        </div>
      )}

      {/* 머리말 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-3 font-mono text-[11px] text-slate-500">
          <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
            Part0{note.book.part} · {note.book.item}
          </span>
          <span>{locationTitle}</span>
          <span className="ml-auto">{note.id}</span>
        </div>

        <Field label="제목">
          <input
            value={note.title}
            onChange={(e) => patch({ title: e.target.value })}
            className={inputClass}
          />
        </Field>

        <Field label="한 줄 개요">
          <input
            value={note.summary}
            onChange={(e) => patch({ summary: e.target.value })}
            placeholder="이 항이 무엇을 다루는지 한 문장으로"
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="교재 쪽수">
            <input
              type="number"
              value={note.book.page}
              onChange={(e) =>
                patch({ book: { ...note.book, page: Number(e.target.value) } })
              }
              className={inputClass}
            />
          </Field>
          <Field label="태그 (쉼표로 구분)">
            <input
              value={note.tags.join(", ")}
              onChange={(e) =>
                patch({
                  tags: e.target.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
              className={inputClass}
            />
          </Field>
        </div>
      </div>

      {/* 섹션들 */}
      <div className="space-y-3">
        {note.sections.map((section, index) => (
          <SectionEditor
            key={section.id}
            section={section}
            index={index}
            total={note.sections.length}
            onChange={(changes) => patchSection(index, changes)}
            onRemove={() => removeSection(index)}
            onMove={(delta) => moveSection(index, delta)}
          />
        ))}
      </div>

      {/* 섹션 추가 */}
      <div className="mt-4 bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
        <p className="text-xs font-semibold text-slate-300 mb-2">섹션 추가</p>
        <div className="flex flex-wrap gap-1.5">
          {KIND_ORDER.map((kind) => (
            <button
              key={kind}
              onClick={() => addSection(kind)}
              title={KIND_META[kind].hint}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition"
            >
              <Plus className="w-3 h-3" />
              {KIND_META[kind].label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="mt-4 text-xs text-rose-200 bg-rose-950/40 border border-rose-500/30 rounded-xl px-3.5 py-2.5 break-keep">
          {error}
        </p>
      )}

      {/* 저장 바 */}
      <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 sticky bottom-3">
        <p className="text-xs text-slate-400 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-emerald-400" />이 필기에서 문제{" "}
          <strong className="font-mono text-emerald-300">
            {derived.length}
          </strong>
          개가 파생됩니다
          <span className="text-slate-600">
            (섹션 {note.sections.length}개)
          </span>
        </p>
        <button
          onClick={save}
          disabled={!writable || saving || !note.title.trim()}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-2 rounded-lg transition"
        >
          {saving ? (
            <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          {isNew ? "필기 만들기" : "저장"}
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------

const SectionEditor: React.FC<{
  section: NoteSection;
  index: number;
  total: number;
  onChange: (changes: Partial<NoteSection>) => void;
  onRemove: () => void;
  onMove: (delta: number) => void;
}> = ({ section, index, total, onChange, onRemove, onMove }) => {
  const meta = KIND_META[section.kind];
  const items = section.items ?? [];

  const patchItem = (i: number, changes: Partial<NoteItem>) =>
    onChange({
      items: items.map((it, j) => (j === i ? { ...it, ...changes } : it)),
    });

  const addItem = () => onChange({ items: [...items, { term: "", desc: "" }] });

  const removeItem = (i: number) =>
    onChange({ items: items.filter((_, j) => j !== i) });

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-slate-800/80">
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 shrink-0">
          {meta.label}
        </span>
        <input
          value={section.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className="flex-1 min-w-0 bg-transparent text-sm font-bold text-white focus:outline-none"
          placeholder="섹션 제목"
        />
        <div className="flex items-center gap-0.5 shrink-0">
          <IconButton
            onClick={() => onMove(-1)}
            disabled={index === 0}
            label="위로"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </IconButton>
          <IconButton
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            label="아래로"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </IconButton>
          <IconButton onClick={onRemove} label="섹션 삭제" danger>
            <Trash2 className="w-3.5 h-3.5" />
          </IconButton>
        </div>
      </div>

      <div className="p-3.5">
        <p className="text-[10px] text-slate-500 mb-3 break-keep">
          {meta.hint} <span className="text-slate-600">→ {meta.derives}</span>
        </p>

        {(section.kind === "overview" || section.kind === "config") && (
          <ConfigOrProseBody section={section} onChange={onChange} />
        )}

        {(section.kind === "command" ||
          section.kind === "file" ||
          section.kind === "steps") && (
          <div className="space-y-2">
            {items.map((item, i) => (
              <ItemEditor
                key={i}
                kind={section.kind}
                index={i}
                item={item}
                onChange={(c) => patchItem(i, c)}
                onRemove={() => removeItem(i)}
              />
            ))}
            <button
              onClick={addItem}
              className="w-full flex items-center justify-center gap-1 text-xs py-2 rounded-xl border border-dashed border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              {section.kind === "steps" ? "단계 추가" : "항목 추가"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

/** overview는 본문만, config는 경로·원문·빈칸 토큰까지 */
const ConfigOrProseBody: React.FC<{
  section: NoteSection;
  onChange: (changes: Partial<NoteSection>) => void;
}> = ({ section, onChange }) => {
  // 설정 원문에 실제로 등장하는 토큰만 빈칸 후보로 보여준다
  const tokens = useMemo(() => {
    if (section.kind !== "config") return [];
    const found = new Set<string>();
    for (const line of (section.body ?? "").split("\n")) {
      const first = line.trim().split(/[\s=]+/)[0];
      if (first && !first.startsWith("#") && !first.startsWith("<"))
        found.add(first);
    }
    return [...found];
  }, [section.body, section.kind]);

  const blanks = section.blanks ?? [];

  return (
    <div className="space-y-3">
      {section.kind === "config" && (
        <Field label="설정 파일 경로">
          <input
            value={section.path ?? ""}
            onChange={(e) => onChange({ path: e.target.value })}
            placeholder="/etc/login.defs"
            className={`${inputClass} font-mono`}
          />
        </Field>
      )}

      <Field label={section.kind === "config" ? "설정 원문" : "본문"}>
        <textarea
          value={section.body ?? ""}
          onChange={(e) => onChange({ body: e.target.value })}
          rows={section.kind === "config" ? 6 : 5}
          className={`${inputClass} ${section.kind === "config" ? "font-mono" : ""} resize-y leading-relaxed`}
        />
      </Field>

      {section.kind === "config" && (
        <div>
          <p className="text-[11px] font-semibold text-slate-400 mb-1.5">
            빈칸으로 만들 토큰 ({blanks.length}개 선택)
          </p>
          {tokens.length === 0 ? (
            <p className="text-[11px] text-slate-600">
              원문을 입력하면 토큰이 여기 나타납니다.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {tokens.map((token) => {
                const on = blanks.includes(token);
                return (
                  <button
                    key={token}
                    onClick={() =>
                      onChange({
                        blanks: on
                          ? blanks.filter((b) => b !== token)
                          : [...blanks, token],
                      })
                    }
                    className={`text-[11px] font-mono px-2 py-1 rounded-lg border transition ${
                      on
                        ? "bg-emerald-600 text-white border-emerald-500"
                        : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    {token}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ItemEditor: React.FC<{
  kind: NoteSectionKind;
  index: number;
  item: NoteItem;
  onChange: (changes: Partial<NoteItem>) => void;
  onRemove: () => void;
}> = ({ kind, index, item, onChange, onRemove }) => {
  const options = item.options ?? [];

  return (
    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5">
      <div className="flex items-start gap-2">
        {kind === "steps" && (
          <span className="shrink-0 w-5 h-5 mt-1.5 rounded-md bg-violet-500/15 border border-violet-500/30 text-violet-300 text-[11px] font-mono font-bold flex items-center justify-center">
            {index + 1}
          </span>
        )}
        <div className="flex-1 min-w-0 space-y-1.5">
          <input
            value={item.term}
            onChange={(e) => onChange({ term: e.target.value })}
            placeholder={
              kind === "file"
                ? "/etc/group"
                : kind === "steps"
                  ? "mkswap /swapfile"
                  : "groupadd"
            }
            className={`${inputClass} font-mono text-emerald-300`}
          />
          <input
            value={item.desc}
            onChange={(e) => onChange({ desc: e.target.value })}
            placeholder="한 줄 의미 — 다른 항목과 구별되게 쓸 것"
            className={inputClass}
          />

          {kind === "file" && (
            <input
              value={item.format ?? ""}
              onChange={(e) => onChange({ format: e.target.value })}
              placeholder="필드 포맷 (예: 그룹명:암호:GID:멤버목록)"
              className={`${inputClass} font-mono text-sky-300`}
            />
          )}

          <DetailBox
            value={item.detail}
            onChange={(detail) => onChange({ detail })}
            label={`${item.term || "이 항목"} 상세`}
            placeholder={
              "원리·주의점·실무 맥락. 문제로 만들지 않으므로 길게 써도 된다.\n익숙한 것만 채우면 충분하다."
            }
          />

          {kind === "command" && (
            <div className="pt-1">
              {options.map((opt, i) => (
                // flex-1 min-w-0: inputClass의 w-full을 무시하고 남은 폭을
                // 둘이 정확히 반씩 나눈다. min-w-0이 없으면 입력값이 길어질 때
                // 최소 너비 때문에 다시 부모를 넘친다.
                <div key={i} className="flex items-center gap-1.5 mb-1">
                  <input
                    value={opt.flag}
                    onChange={(e) =>
                      onChange({
                        options: options.map((o, j) =>
                          j === i ? { ...o, flag: e.target.value } : o,
                        ),
                      })
                    }
                    placeholder="-g"
                    className={`${inputClass} flex-1 min-w-0 font-mono text-amber-300`}
                  />
                  <input
                    value={opt.meaning}
                    onChange={(e) =>
                      onChange({
                        options: options.map((o, j) =>
                          j === i ? { ...o, meaning: e.target.value } : o,
                        ),
                      })
                    }
                    placeholder="GID 직접 지정"
                    className={`${inputClass} flex-1 min-w-0`}
                  />
                  <IconButton
                    onClick={() =>
                      onChange({ options: options.filter((_, j) => j !== i) })
                    }
                    label="옵션 삭제"
                    danger
                  >
                    <Trash2 className="w-3 h-3" />
                  </IconButton>
                </div>
              ))}

              {/* 옵션별 상세는 옵션 목록 아래에 모아 둔다. 한 줄에 같이 두면 행이 너무 좁아진다. */}
              {options.map((opt, i) =>
                opt.flag ? (
                  <DetailBox
                    key={`detail-${i}`}
                    value={opt.detail}
                    onChange={(detail) =>
                      onChange({
                        options: options.map((o, j) =>
                          j === i ? { ...o, detail } : o,
                        ),
                      })
                    }
                    label={`${opt.flag} 상세`}
                    placeholder="이 옵션만의 주의점·동작 방식"
                  />
                ) : null,
              )}
              <button
                onClick={() =>
                  onChange({ options: [...options, { flag: "", meaning: "" }] })
                }
                className="text-[11px] text-slate-500 hover:text-slate-300 transition flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                옵션 추가 (하나당 문제 1개)
              </button>
            </div>
          )}
        </div>

        <IconButton onClick={onRemove} label="항목 삭제" danger>
          <Trash2 className="w-3.5 h-3.5" />
        </IconButton>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------

const inputClass =
  "w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500";

/**
 * 상세 설명 입력란. 기본은 접혀 있다.
 *
 * 펼쳐둔 채로 두면 항목 10개짜리 섹션의 편집 화면이 스크롤 지옥이 된다.
 * 내용이 이미 있으면 처음부터 펼친다 — 접혀 있으면 쓴 걸 잊는다.
 */
const DetailBox: React.FC<{
  value?: string;
  onChange: (value: string | undefined) => void;
  label: string;
  placeholder: string;
}> = ({ value, onChange, label, placeholder }) => {
  const [open, setOpen] = useState(!!value?.trim());

  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-400 transition"
      >
        <NotebookPen className="w-3 h-3" />
        {label} 추가
      </button>
    );

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2">
      <div className="flex items-center gap-1 mb-1">
        <NotebookPen className="w-3 h-3 text-sky-400 shrink-0" />
        <span className="text-[10px] font-semibold text-slate-400 truncate">
          {label}
        </span>
        <span className="ml-auto text-[10px] text-slate-600 shrink-0">
          문제로 만들지 않음
        </span>
      </div>
      <textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        onBlur={() => {
          // 빈 채로 두면 필드를 아예 없애 JSON을 깨끗하게 유지한다
          if (!value?.trim()) {
            onChange(undefined);
            setOpen(false);
          }
        }}
        rows={3}
        placeholder={placeholder}
        className={`${inputClass} resize-y leading-relaxed`}
      />
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <label className="block mb-3 last:mb-0">
    <span className="block text-[11px] font-semibold text-slate-400 mb-1">
      {label}
    </span>
    {children}
  </label>
);

const IconButton: React.FC<{
  onClick: () => void;
  label: string;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}> = ({ onClick, label, disabled, danger, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={label}
    className={`shrink-0 p-1.5 rounded-lg transition disabled:opacity-25 disabled:cursor-not-allowed ${
      danger
        ? "text-slate-500 hover:text-rose-300 hover:bg-rose-950/40"
        : "text-slate-500 hover:text-slate-200 hover:bg-slate-800"
    }`}
  >
    {children}
  </button>
);

/**
 * 섹션 id는 한 번 정해지면 바꾸지 않는다 (PLANNING.md 원칙 3).
 * id가 바뀌면 그 섹션과 파생 문제의 학습 기록이 전부 끊긴다.
 */
function nextSectionId(note: Note, kind: NoteSectionKind): string {
  const slug = {
    command: "commands",
    file: "files",
    config: "config",
    steps: "steps",
    overview: "overview",
  }[kind];
  const used = new Set(note.sections.map((s) => s.id));
  let candidate = `${note.id}/${slug}`;
  let n = 2;
  while (used.has(candidate)) candidate = `${note.id}/${slug}-${n++}`;
  return candidate;
}
