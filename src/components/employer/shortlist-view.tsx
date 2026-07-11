"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdvancedFilters,
  Button,
  EmptyState,
  Textarea,
  type AdvancedFilterField,
  type AdvancedFilterValue,
} from "@/components/ui";
import { applyClientFilters } from "@/lib/filters/apply-client-filters";

interface MatchNote {
  authorId: string;
  text: string;
  createdAt: string;
}

interface ShortlistMatch {
  id: string;
  shortlistRank: number | null;
  notes: MatchNote[];
  student: {
    fullName: string;
    email: string;
    sector: string;
    seniority: string;
    currentCity: string;
  } | null;
}

export interface ShortlistViewProps {
  labels: Record<string, string>;
}

export function ShortlistView({ labels }: ShortlistViewProps) {
  const [matches, setMatches] = useState<ShortlistMatch[]>([]);
  const [filters, setFilters] = useState<Record<string, AdvancedFilterValue>>({
    search: "",
  });
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadMatches = useCallback(async () => {
    setIsLoading(true);
    const response = await fetch("/api/employer/matches?shortlisted=true");
    const data = (await response.json()) as { matches: ShortlistMatch[] };
    setMatches(data.matches ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

  const filterFields = useMemo<AdvancedFilterField[]>(
    () => [
      {
        id: "search",
        type: "search",
        labelKey: "search",
        placeholderKey: "searchPlaceholder",
      },
    ],
    [],
  );

  const filteredMatches = useMemo(
    () =>
      applyClientFilters(matches, {
        search: {
          value: filters.search,
          accessors: [
            (match) => match.student?.fullName,
            (match) => match.student?.email,
            (match) => match.student?.sector,
            (match) => match.student?.currentCity,
          ],
        },
      }),
    [filters.search, matches],
  );

  const persistOrder = async (next: ShortlistMatch[]) => {
    setMatches(next);
    setActionMessage(null);
    const response = await fetch("/api/employer/matches/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedMatchIds: next.map((match) => match.id) }),
    });
    if (!response.ok) {
      setActionMessage(labels.reorderError ?? "Could not save order.");
      await loadMatches();
    }
  };

  const move = async (from: number, to: number) => {
    if (to < 0 || to >= matches.length || from === to) return;
    const next = [...matches];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    await persistOrder(next);
  };

  const moveFiltered = async (filteredFrom: number, filteredTo: number) => {
    const fromId = filteredMatches[filteredFrom]?.id;
    const toId = filteredMatches[filteredTo]?.id;
    if (!fromId || !toId) return;
    const from = matches.findIndex((match) => match.id === fromId);
    const to = matches.findIndex((match) => match.id === toId);
    await move(from, to);
  };

  const onDrop = async (toIndex: number) => {
    if (dragIndex == null || dragIndex === toIndex) {
      setDragIndex(null);
      return;
    }
    await moveFiltered(dragIndex, toIndex);
    setDragIndex(null);
  };

  const submitNote = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeMatchId || !noteText.trim()) return;

    setActionMessage(null);
    const response = await fetch(`/api/employer/matches/${activeMatchId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: noteText.trim() }),
    });

    if (!response.ok) {
      setActionMessage(labels.noteError ?? "Could not save note.");
      return;
    }

    setNoteText("");
    await loadMatches();
  };

  if (isLoading) return null;

  if (!matches.length) {
    return (
      <EmptyState
        title={labels.emptyState ?? "No shortlisted candidates yet"}
        action={
          <Link
            href="/employer/talent-pool"
            className="text-sm font-medium text-text-accent hover:underline"
          >
            {labels.browseTalentPool ?? "Browse talent pool"}
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      {actionMessage ? (
        <p className="text-sm text-text-warning lg:col-span-2" role="status">
          {actionMessage}
        </p>
      ) : null}

      <div className="space-y-3 lg:col-span-2">
        <AdvancedFilters
          labels={labels}
          fields={filterFields}
          values={filters}
          onChange={setFilters}
          clearKey="clearFilters"
        />
      </div>

      <div className="space-y-2">
        {labels.reorderHint ? (
          <p className="text-xs text-text-muted">{labels.reorderHint}</p>
        ) : null}
        <ul className="space-y-2">
          {filteredMatches.map((match, index) => (
            <li
              key={match.id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => void onDrop(index)}
              className="rounded-radius border border-border bg-grad-card"
            >
              <div className="flex items-stretch gap-1">
                <div className="flex flex-col border-r border-border">
                  <button
                    type="button"
                    className="px-2 py-1 text-xs text-text-muted hover:text-text-primary"
                    aria-label={labels.moveUp ?? "Move up"}
                    onClick={() => void moveFiltered(index, index - 1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="px-2 py-1 text-xs text-text-muted hover:text-text-primary"
                    aria-label={labels.moveDown ?? "Move down"}
                    onClick={() => void moveFiltered(index, index + 1)}
                  >
                    ↓
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveMatchId(match.id)}
                  className="flex-1 p-3 text-left hover:bg-surface-2"
                >
                  <p className="font-mono text-[10px] text-text-muted">
                    #{index + 1}
                  </p>
                  <p className="font-medium text-text-primary">
                    {match.student?.fullName ?? match.id}
                  </p>
                  {match.student?.email ? (
                    <p className="mt-0.5 text-sm text-text-muted">
                      {match.student.email}
                    </p>
                  ) : null}
                </button>
                <Link
                  href={`/employer/talent-pool/${match.id}`}
                  className="flex items-center px-3 text-xs font-medium text-text-label"
                >
                  {labels.viewProfile ?? "View"}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {activeMatchId ? (
        <section className="rounded-radius border border-border bg-grad-card p-4">
          {labels.notesTitle ? (
            <h2 className="mb-4 font-medium text-text-primary">{labels.notesTitle}</h2>
          ) : null}
          <ul className="mb-4 max-h-80 space-y-3 overflow-y-auto">
            {(matches.find((match) => match.id === activeMatchId)?.notes ?? []).map(
              (note, index) => (
                <li
                  key={`${note.createdAt}-${index}`}
                  className="rounded-radius bg-surface-2 p-3 text-sm text-text-secondary"
                >
                  <p>{note.text}</p>
                  {note.createdAt ? (
                    <p className="mt-1 text-xs text-text-muted">
                      {new Date(note.createdAt).toLocaleString()}
                    </p>
                  ) : null}
                </li>
              ),
            )}
          </ul>
          <form className="space-y-3" onSubmit={submitNote}>
            <Textarea
              id="shortlist-note"
              aria-label={labels.notePlaceholder ?? "note"}
              label={labels.noteLabel}
              placeholder={labels.notePlaceholder}
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
            />
            <Button type="submit">{labels.addNote}</Button>
          </form>
        </section>
      ) : labels.selectCandidate ? (
        <p className="text-sm text-text-muted">{labels.selectCandidate}</p>
      ) : null}
    </div>
  );
}
