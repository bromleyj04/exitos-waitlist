import { projectConfig } from "@/config/project.config";
import { WaitlistPage } from "@/components/waitlist/WaitlistPage";

export default function Home() {
  return <WaitlistPage config={projectConfig} />;
}
