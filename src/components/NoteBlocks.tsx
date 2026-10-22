"use client";

import React from "react";

/**
 * 섹션 본문(`config` 원문, `overview` 서술)을 그리는 유일한 곳.
 *
 * 쓸 때와 읽을 때의 모습이 다르면 머릿속에 남은 이미지와 화면이 어긋난다.
 * 그래서 편집·백지 인출·문제 풀이가 모두 이 파일의 스타일을 공유한다.
 * **여기 밖에서 본문용 스타일을 새로 선언하지 말 것.**
 *
 * 설정 원문
 * - 긴 줄은 줄바꿈하지 않고 가로로 스크롤한다 (원문의 줄 = 화면의 줄).
 * - 빈칸은 글자를 지우는 대신 같은 폭(`ch`)의 칸으로 바꾼다. 토큰 길이와
 *   무관하게 뒤쪽 열이 밀리지 않아야 가린 상태에서도 정렬이 유지된다.
 *
 * 서술
 * - 쓴 줄바꿈과 빈 줄을 그대로 살린다. 읽기에서 문단이 한 덩어리로 뭉치면
 *   번호 매긴 목록을 알아볼 수 없다.
 */
const SURFACE = "bg-slate-950 border border-slate-800 rounded-xl";
const TEXT = "text-xs font-mono text-emerald-300 leading-relaxed";
const PADDING = "p-3.5";

/** 서술은 등폭이 아니라 본문용 글꼴·색이지만, 줄바꿈 보존은 양쪽이 같다 */
const PROSE_TEXT =
  "text-sm text-slate-300 leading-relaxed break-keep whitespace-pre-wrap";

/** 읽기용 서술 본문 */
export const ProseBody: React.FC<{ body: string }> = ({ body }) => (
  <p className={PROSE_TEXT}>{body}</p>
);

/** 쓰기용 서술 본문. 읽기와 같은 글꼴·크기·색·줄 높이. */
export const ProseTextarea: React.FC<{
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}> = ({ value, onChange, rows = 8 }) => (
  <textarea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    rows={rows}
    className={`${SURFACE} ${PADDING} ${PROSE_TEXT} w-full resize-y placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500`}
  />
);

export const ConfigPath: React.FC<{ path?: string }> = ({ path }) =>
  path ? (
    <p className="text-[11px] font-mono text-slate-500 mb-1.5">{path}</p>
  ) : null;

/** 읽기용 원문. maskToken을 주면 그 토큰이 빈칸으로 가려진다. */
export const ConfigBody: React.FC<{ body: string; maskToken?: string }> = ({
  body,
  maskToken,
}) => (
  <pre className={`${SURFACE} ${PADDING} ${TEXT} overflow-x-auto`}>
    {maskToken ? maskLines(body, maskToken) : body}
  </pre>
);

/** 쓰기용 원문. 읽기와 같은 배경·글자색·줄 높이에 가로 스크롤까지 맞춘다. */
export const ConfigTextarea: React.FC<{
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}> = ({ value, onChange, rows = 8 }) => (
  <textarea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    rows={rows}
    wrap="off"
    spellCheck={false}
    className={`${SURFACE} ${PADDING} ${TEXT} w-full resize-y overflow-x-auto whitespace-pre placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500`}
  />
);

/**
 * 빈칸 토큰 목록. 읽기에서는 선택된 토큰만 넘겨 칩으로 보여주고,
 * 편집에서는 후보 전체를 넘기고 onToggle로 고르게 한다.
 */
export const ConfigBlanks: React.FC<{
  label: string;
  tokens: string[];
  selected: string[];
  onToggle?: (token: string) => void;
  empty?: string;
}> = ({ label, tokens, selected, onToggle, empty }) => (
  <div className="mt-2">
    <p className="text-[11px] font-semibold text-slate-400 mb-1.5">{label}</p>
    {tokens.length === 0 ? (
      empty && <p className="text-[11px] text-slate-600">{empty}</p>
    ) : (
      <div className="flex flex-wrap gap-1">
        {tokens.map((token) => {
          const on = selected.includes(token);
          const chip = `text-[11px] font-mono px-2 py-1 rounded-lg border transition ${
            on
              ? "bg-emerald-600 text-white border-emerald-500"
              : "bg-slate-800 text-slate-400 border-slate-700"
          }`;
          return onToggle ? (
            <button
              key={token}
              type="button"
              onClick={() => onToggle(token)}
              className={`${chip} ${on ? "" : "hover:text-slate-200"}`}
            >
              {token}
            </button>
          ) : (
            <span key={token} className={chip}>
              {token}
            </span>
          );
        })}
      </div>
    )}
  </div>
);

/** 각 줄에서 토큰의 첫 등장만 가린다 (파생 문제의 가림 규칙과 동일). */
function maskLines(body: string, token: string): React.ReactNode[] {
  return body.split("\n").map((line, i) => {
    const at = token ? line.indexOf(token) : -1;
    const lineBreak = i > 0 ? "\n" : "";
    return (
      <React.Fragment key={i}>
        {lineBreak}
        {at < 0 ? (
          line
        ) : (
          <>
            {line.slice(0, at)}
            <Blank length={token.length} />
            {line.slice(at + token.length)}
          </>
        )}
      </React.Fragment>
    );
  });
}

/**
 * 가린 토큰은 같은 글자 수의 `_`로 바꾼다.
 *
 * ASCII(U+0020~U+007E)는 등폭 폰트에서 정확히 1칸이라 글자 수만 맞추면 뒤쪽
 * 열이 밀리지 않는다. `▢`·`░` 같은 폭 모호(East Asian Width = Ambiguous)
 * 문자는 폰트·로케일에 따라 2칸으로 그려지므로 쓰지 말 것.
 */
const Blank: React.FC<{ length: number }> = ({ length }) => (
  <span className="text-slate-600">{"_".repeat(length)}</span>
);
