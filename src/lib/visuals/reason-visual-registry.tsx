import type { ComponentType, CSSProperties, SVGProps } from "react";
import { AlarmIcon } from "@solar-icons/react/bold-duotone/alarm";
import { BellRingIcon } from "@solar-icons/react/bold-duotone/bell-ring";
import { BoltIcon } from "@solar-icons/react/bold-duotone/bolt";
import { ChartSquareIcon } from "@solar-icons/react/bold-duotone/chart-square";
import { DialogIcon } from "@solar-icons/react/bold-duotone/dialog";
import { FilterIcon } from "@solar-icons/react/bold-duotone/filter";
import { GraphUpIcon } from "@solar-icons/react/bold-duotone/graph-up";
import { RocketIcon } from "@solar-icons/react/bold-duotone/rocket";
import { ShareCircleIcon } from "@solar-icons/react/bold-duotone/share-circle";
import { ShieldCheckIcon } from "@solar-icons/react/bold-duotone/shield-check";
import { TargetIcon } from "@solar-icons/react/bold-duotone/target";
import { UsersGroupTwoRoundedIcon } from "@solar-icons/react/bold-duotone/users-group-two-rounded";
import type { ReasonVisualConcept } from "./concepts";

type SolarIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;

const reasonVisualRegistry = {
  "capture-intent": TargetIcon,
  audience: UsersGroupTwoRoundedIcon,
  qualify: FilterIcon,
  growth: GraphUpIcon,
  referral: ShareCircleIcon,
  alert: BellRingIcon,
  automation: BoltIcon,
  analytics: ChartSquareIcon,
  message: DialogIcon,
  security: ShieldCheckIcon,
  time: AlarmIcon,
  launch: RocketIcon,
} satisfies Record<ReasonVisualConcept, SolarIcon>;

export function ReasonVisual({ concept }: { concept: ReasonVisualConcept }) {
  const Icon = reasonVisualRegistry[concept];

  return (
    <div className="reason-visual" aria-hidden="true">
      <Icon
        className="reason-visual__icon"
        style={
          {
            "--solar-secondary-color": "var(--reason-visual-secondary)",
            "--solar-secondary-opacity": "var(--reason-visual-secondary-opacity)",
          } as CSSProperties
        }
      />
    </div>
  );
}
