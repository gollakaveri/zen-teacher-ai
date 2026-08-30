import logo from "@/assets/studyzen-logo.png.asset.json";
import { cn } from "@/lib/utils";

type Props = {
  size?: number;
  className?: string;
  withWordmark?: boolean;
  priority?: boolean;
};

/** Official StudyZen logo. Do not restyle or replace the artwork. */
export function Logo({ size = 44, className, withWordmark = false, priority = false }: Props) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <img
        src={logo.url}
        alt="StudyZen logo"
        width={size}
        height={size}
        loading={priority ? "eager" : "lazy"}
        style={{ width: size, height: size }}
        className="rounded-2xl object-cover object-center shadow-[0_10px_30px_-12px_rgba(0,0,0,0.8)]"
      />
      {withWordmark ? (
        <span className="flex flex-col leading-tight">
          <span className="text-lg font-semibold tracking-tight">
            Study<span className="text-gold-gradient">Zen</span>
          </span>
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Learn • Understand • Grow
          </span>
        </span>
      ) : null}
    </span>
  );
}
