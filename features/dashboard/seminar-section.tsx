"use client";

import { useState } from "react";
import { Check, Mic2, MapPin } from "lucide-react";

import { formatSeminarWhen } from "@/lib/partner-event-config";
import { hasAllocatedPanelSlots } from "@/lib/panel-discussion-visibility";
import {
  seminarTopicFailureShouldRefresh,
  type PartnerSeminarTopicCatalog,
  type SeminarTopicChoice,
} from "@/lib/seminar-topics";
import type { EventPackageSummary } from "@/lib/types";

function topicWhen(topic: SeminarTopicChoice): string {
  return formatSeminarWhen({
    date: topic.date ?? "",
    startTime: topic.startTime ?? "",
    endTime: topic.endTime ?? "",
    hall: topic.hall ?? 0,
  });
}

export function SeminarSection({
  packages,
  catalog,
  saving,
  onSaveTopics,
  onRefresh,
}: {
  packages: EventPackageSummary[];
  catalog: PartnerSeminarTopicCatalog | null;
  saving?: boolean;
  onSaveTopics?: (
    topics: Array<{ eventId: string; seminarId: string }>,
    confirm: boolean
  ) => Promise<void>;
  onRefresh?: () => void;
}) {
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const busy = Boolean(saving) || pending;
  const events = catalog?.events ?? [];
  if (!hasAllocatedPanelSlots(packages)) return null;

  const selectedTopics = events.flatMap((group) =>
    group.topics
      .filter((topic) => topic.selected)
      .map((topic) => ({ eventId: topic.eventId, seminarId: topic.seminarId }))
  );

  const save = async (
    topics: Array<{ eventId: string; seminarId: string }>,
    confirm = false
  ) => {
    if (!onSaveTopics || busy) return;
    setError("");
    setPending(true);
    try {
      await onSaveTopics(topics, confirm);
      if (confirm) setConfirming(false);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not save topics.";
      setError(message);
      if (seminarTopicFailureShouldRefresh(message)) onRefresh?.();
    } finally {
      setPending(false);
    }
  };

  const addTopic = (topic: SeminarTopicChoice) => {
    const group = events.find((row) => row.eventId === topic.eventId);
    if (!group || group.remaining <= 0) {
      setError("Remove a topic before choosing a different one.");
      return;
    }
    void save([
      ...selectedTopics,
      { eventId: topic.eventId, seminarId: topic.seminarId },
    ]);
  };

  const removeTopic = (topic: SeminarTopicChoice) => {
    if (topic.locked) return;
    void save(
      selectedTopics.filter(
        (row) => !(row.eventId === topic.eventId && row.seminarId === topic.seminarId)
      )
    );
  };

  return (
    <section className="cu-panel">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="cu-eyebrow">Stage time</p>
          <h2 className="mt-3 flex items-center gap-2 font-display text-[1.85rem] font-bold tracking-tight">
            <Mic2 className="h-6 w-6 text-cu-red" />
            Panel Discussion Topics
          </h2>
          <p className="mt-2 max-w-xl text-sm font-medium text-ink-soft">
            {catalog?.fullyConfirmed
              ? "These topics are confirmed."
              : "Choose one unique topic for each allocated seminar slot. You can change unlocked topics until you confirm."}
          </p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="space-y-4">
          <p className="text-sm font-medium text-ink-soft">
            Topic choices are unavailable right now. Your assigned seminars are shown below.
          </p>
          <AssignedTopics packages={packages} />
        </div>
      ) : (
        <div className="space-y-8">
          {events.map((group) => (
            <div key={group.eventId}>
              {events.length > 1 ? (
                <div className="mb-3 flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-cu-red" />
                  <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-cu-red">
                    {group.city || group.title}
                  </p>
                </div>
              ) : null}
              <div className="mb-4 flex flex-wrap gap-2 text-xs font-extrabold">
                <span className="rounded-full bg-paper px-3 py-1.5 text-ink">
                  Allocated: {group.allocated}
                </span>
                <span className="rounded-full bg-paper px-3 py-1.5 text-ink">
                  Selected: {group.selected}
                </span>
                <span className="rounded-full bg-cu-red-soft px-3 py-1.5 text-cu-red-dark">
                  Remaining: {group.remaining}
                </span>
              </div>
              <p className="mb-3 text-sm font-semibold text-ink">
                {group.selected} of {group.allocated} topics selected
                {group.remaining > 0 ? ` · ${group.remaining} remaining` : ""}
              </p>
              <ul className="space-y-3">
                {group.topics.map((topic) => (
                  <li key={topic.seminarId}>
                    <article
                      className={`rounded-2xl border px-5 py-4 ${
                        topic.selected
                          ? "border-cu-red bg-cu-red-soft/40"
                          : "border-line bg-paper"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-display text-lg font-bold leading-snug">
                            {topic.title}
                          </h3>
                          {topicWhen(topic) ? (
                            <p className="mt-2 text-xs font-medium text-ink-muted">
                              {topicWhen(topic)}
                            </p>
                          ) : null}
                        </div>
                        {topic.selected ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1 text-xs font-bold text-white">
                            <Check className="h-3.5 w-3.5" />
                            {topic.locked ? "Confirmed" : "Selected"}
                          </span>
                        ) : null}
                      </div>
                      {!catalog?.fullyConfirmed ? (
                        <div className="mt-4">
                          {topic.selected && !topic.locked ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => removeTopic(topic)}
                              className="cu-btn-ghost !px-4 !py-2 text-sm"
                            >
                              Remove
                            </button>
                          ) : null}
                          {!topic.selected ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => addTopic(topic)}
                              className="cu-btn-primary !px-4 !py-2 text-sm"
                            >
                              Select topic
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {error ? (
            <p className="rounded-2xl bg-cu-red-soft px-4 py-3 text-sm font-semibold text-cu-red-dark">
              {error}
            </p>
          ) : null}

          {catalog?.canConfirm && !confirming ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirming(true)}
                className="cu-btn-primary w-full sm:w-auto"
              >
                Confirm Topics
              </button>
              <p className="text-sm font-medium text-ink-soft">
                You can still change unlocked topics before confirming.
              </p>
            </div>
          ) : null}

          {confirming ? (
            <div className="rounded-2xl border border-line bg-paper p-5">
              <p className="font-display text-xl font-bold">Confirm these topics?</p>
              <p className="mt-2 text-sm font-medium text-ink-soft">
                Confirmed topics stay locked. You will not be able to change them afterwards.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void save(selectedTopics, true)}
                  className="cu-btn-primary w-full sm:w-auto"
                >
                  {busy ? "Confirming…" : "Confirm topics"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirming(false)}
                  className="cu-btn-ghost w-full sm:w-auto"
                >
                  Keep editing
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function AssignedTopics({ packages }: { packages: EventPackageSummary[] }) {
  const rows = packages.filter((pkg) => pkg.seminars.length > 0);
  if (rows.length === 0) return null;
  return (
    <ul className="space-y-3">
      {rows.flatMap((pkg) =>
        pkg.seminars.map((seminar) => (
          <li
            key={`${pkg.eventId}-${seminar.id}`}
            className="rounded-2xl border border-line bg-paper px-5 py-4"
          >
            <h3 className="font-display text-lg font-bold leading-snug">{seminar.title}</h3>
            <p className="mt-2 text-xs font-medium text-ink-muted">
              {formatSeminarWhen(seminar)}
            </p>
          </li>
        ))
      )}
    </ul>
  );
}
