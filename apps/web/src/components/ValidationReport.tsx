import { memo } from "react";
import type { ValidationGroup } from "../validationGroups";

export const ValidationReport = memo(function ValidationReport({ groups }: { groups: ValidationGroup[] }) {
  const issueCount = groups.reduce((sum, group) => sum + group.issues.length, 0);
  return (
    <section className="panel validation-report">
      <div className="panel-title">
        <h2>Validation</h2>
        <span className="result-count">{issueCount} {issueCount === 1 ? "result" : "results"}</span>
      </div>
      <div className="validation-groups">
        {groups.map((group) => (
          <section className="validation-group" key={group.id}>
            <h3>{group.title}</h3>
            <div className="issue-list">
              {group.issues.map((issue, index) => (
                <article className={`issue ${issue.severity}`} key={`${issue.code}-${index}`}>
                  <strong>{issue.message}</strong>
                  {issue.affectedCardLabels.length > 0 && (
                    <span className="affected-cards">Cards: {issue.affectedCardLabels.join(", ")}</span>
                  )}
                  {issue.suggestedFixes?.map((fix) => <span key={fix}>{fix}</span>)}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
});
