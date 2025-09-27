"use client";

import * as React from "react";

import * as Divider from "@/components/ui/divider";
import * as ProgressCircle from "@/components/ui/progress-circle";
import * as StatusBadge from "@/components/ui/status-badge";

type TodoSummaryProps = {
  total: number;
  completed: number;
  active: number;
  overdue: number;
  percentage: number;
};

const formatPercentage = (value: number) => {
  if (Number.isNaN(value)) {
    return "0%";
  }
  return `${Math.round(value)}%`;
};

export function TodoSummary({
  total,
  completed,
  active,
  overdue,
  percentage,
}: TodoSummaryProps) {
  const safeTotal = Math.max(total, 0);
  const safeCompleted = Math.max(completed, 0);
  const safeActive = Math.max(active, 0);
  const safeOverdue = Math.max(overdue, 0);
  const safePercentage = Number.isFinite(percentage) ? percentage : 0;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="text-label-sm text-text-soft-400">Today&apos;s progress</p>
          <h3 className="text-heading-sm text-text-strong-950">
            {safeCompleted}/{safeTotal} tasks completed
          </h3>
          <p className="text-paragraph-sm text-text-sub-600">
            Keep momentum by finishing the remaining items and clearing overdue work.
          </p>
        </div>
        <ProgressCircle.Root
          value={safePercentage}
          max={100}
          size="64"
          color="stroke-success-base"
        >
          <span className="text-paragraph-sm text-text-strong-950">
            {formatPercentage(safePercentage)}
          </span>
        </ProgressCircle.Root>
      </div>

      <Divider.Root variant="line" className="opacity-60" />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatusBadge.Root
          variant="light"
          status="pending"
          className="justify-between bg-bg-white-0 px-3 py-2 text-text-strong-950 ring-1 ring-inset ring-stroke-soft-200"
        >
          <span className="text-label-sm">Active</span>
          <span className="text-heading-xs font-semibold">{safeActive}</span>
        </StatusBadge.Root>
        <StatusBadge.Root
          variant="light"
          status="completed"
          className="justify-between bg-bg-white-0 px-3 py-2 text-text-strong-950 ring-1 ring-inset ring-stroke-soft-200"
        >
          <span className="text-label-sm">Completed</span>
          <span className="text-heading-xs font-semibold">{safeCompleted}</span>
        </StatusBadge.Root>
        <StatusBadge.Root
          variant="light"
          status="failed"
          className="justify-between bg-bg-white-0 px-3 py-2 text-text-strong-950 ring-1 ring-inset ring-stroke-soft-200"
        >
          <span className="text-label-sm">Overdue</span>
          <span className="text-heading-xs font-semibold">{safeOverdue}</span>
        </StatusBadge.Root>
      </div>
    </section>
  );
}

export default TodoSummary;
