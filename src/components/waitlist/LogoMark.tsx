import Image from "next/image";
import type { WaitlistProjectConfig } from "@/config/schema";

export function LogoMark({ brand }: { brand: WaitlistProjectConfig["brand"] }) {
  const darkMark = brand.markDark ?? brand.mark;
  const lightMark = brand.markLight ?? brand.mark;

  return (
    <div className="logo-mark mx-auto" aria-label={`${brand.name} mark`}>
      <Image className="logo-mark__asset logo-mark__asset--dark" src={darkMark.src} alt={darkMark.alt} width={116} height={116} />
      <Image className="logo-mark__asset logo-mark__asset--light" src={lightMark.src} alt={lightMark.alt} width={116} height={116} />
    </div>
  );
}
