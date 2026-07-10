"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, EmptyState, Textarea } from "@/components/ui";

interface MatchNote {
  authorId: string;
  text: string;
  createdAt: string;
}

interface ShortlistMatch {
  id: string;
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
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [isLoading, setIsLoading] = useState(true);

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

  const submitNote = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeMatchId || !noteText.trim()) {
      return;
    }

    await fetch(`/api/employer/matches/${activeMatchId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: noteText.trim() }),
    });

    setNoteText("");
    await loadMatches();
  };

  if (isLoading) {
    return null;
  }

  if (!matches.length) {
    return labels.emptyState ? <EmptyState title={labels.emptyState} /> : null;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <ul className="space-y-3">
        {matches.map((match) => (
          <li key={match.id}>
            <button
              type="button"
              onClick={() => setActiveMatchId(match.id)}
              className="w-full rounded-radius border border-border bg-surface-1 p-4 text-left hover:bg-surface-2"
            >
              <p className="font-medium text-text-primary">
                {match.student?.fullName ?? match.id}
              </p>
              {match.student?.email ? (
                <p className="mt-1 text-sm text-text-muted">{match.student.email}</p>
              ) : null}
            </button>
          </li>
        ))}
      </ul>

      {activeMatchId ? (
        <section className="rounded-radius border border-border bg-surface-1 p-4">
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
