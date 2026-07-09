import type { ValidationGroup, ValidationGroupId } from "./validationGroups";

export type MobileDeckHealthMetricId = "deck-size" | "legends" | "copies" | "ram";
export type MobileDeckHealthState = "good" | "warning" | "error";

export interface MobileDeckHealthMetric {
  id: MobileDeckHealthMetricId;
  label: string;
  state: MobileDeckHealthState;
  issueCount: number;
}

export interface MobileDeckHealthSummary {
  legal: boolean;
  metrics: MobileDeckHealthMetric[];
  topIssue?: {
    groupId: ValidationGroupId;
    title: string;
    message: string;
    severity: "error" | "warning" | "info";
  };
}

const metricDefinitions: Array<{ id: MobileDeckHealthMetricId; label: string }> = [
  { id: "deck-size", label: "Size" },
  { id: "legends", label: "Legends" },
  { id: "copies", label: "Copies" },
  { id: "ram", label: "RAM" }
];

function groupState(group: ValidationGroup | undefined): MobileDeckHealthState {
  if (!group) return "good";
  if (group.issues.some((issue) => issue.severity === "error")) return "error";
  if (group.issues.some((issue) => issue.severity === "warning")) return "warning";
  return "good";
}

export function summarizeMobileDeckHealth(groups: ValidationGroup[], legal: boolean): MobileDeckHealthSummary {
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const metrics = metricDefinitions.map(({ id, label }) => {
    const group = groupById.get(id);
    return {
      id,
      label,
      state: groupState(group),
      issueCount: group?.issues.length ?? 0
    };
  });
  const issueGroup = groups.find((group) => group.issues.some((issue) => issue.severity !== "info"));
  const issue = issueGroup?.issues.find((candidate) => candidate.severity !== "info");

  return {
    legal,
    metrics,
    topIssue: issueGroup && issue
      ? {
          groupId: issueGroup.id,
          title: issueGroup.title,
          message: issue.message,
          severity: issue.severity
        }
      : undefined
  };
}
