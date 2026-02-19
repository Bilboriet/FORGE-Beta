import type React from "react";

type CoachCardProps = {
  title: React.ReactNode;
  status?: React.ReactNode;
  metaRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

function joinClassNames(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function CoachCard({ title, status, metaRight, children, className }: CoachCardProps) {
  return (
    <div className={joinClassNames("forge-surface", "forgeCardInner", "forgeCoachCard", className)}>
      <div className="forgeCoachCardHeader">
        <div className="forgeCoachCardTitleRow">
          <span className="forgeCoachCardTitle">{title}</span>
          {status ? <span className="forgeCoachCardStatus">{status}</span> : null}
        </div>
        {metaRight ? <div className="forgeCoachCardMeta">{metaRight}</div> : null}
      </div>
      <div className="forgeCoachCardBody">{children}</div>
    </div>
  );
}

