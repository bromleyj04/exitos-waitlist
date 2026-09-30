import Image from "next/image";
import type { WaitlistProjectConfig } from "@/config/schema";

export function LogoMark({ logo, name }: { logo: WaitlistProjectConfig["logo"]; name: string }) {
  if (logo.type === "image") {
    return <Image src={logo.src} alt={logo.alt} width={160} height={40} className="mx-auto h-8 w-auto" />;
  }

  return (
    <div className="mx-auto inline-flex items-center gap-2 text-lg font-semibold tracking-normal text-foreground">
      <span className="inline-block size-2.5 rounded-full bg-primary shadow-soft" />
      <span>{logo.text || name}</span>
    </div>
  );
}
