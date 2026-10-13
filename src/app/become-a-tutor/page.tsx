import type { Metadata } from "next";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { DiscoveryPreapproval } from "@/components/become-tutor/discovery-preapproval";
import { PhoneFirstTeaching } from "@/components/become-tutor/phone-first-teaching";
import { PrivateGroupTeaching } from "@/components/become-tutor/private-group-teaching";
import { SimpleValueProp } from "@/components/become-tutor/simple-value-prop";
import { TeacherDashboardPreview } from "@/components/become-tutor/teacher-dashboard-preview";
import { TeacherProfileTrust } from "@/components/become-tutor/teacher-profile-trust";
import { TutorFinalCta } from "@/components/become-tutor/tutor-final-cta";
import { TutorHero } from "@/components/become-tutor/tutor-hero";
import { TutorHowItWorks } from "@/components/become-tutor/tutor-how-it-works";
import { VirtualClassroom } from "@/components/become-tutor/virtual-classroom";

export const metadata: Metadata = {
  title: "Become a Tutor | Ensena",
  description:
    "Turn what you know into something more. Teach students, build your reputation and grow your teaching business on Ensena.",
};

export default function BecomeATutorPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <TutorHero />
        <SimpleValueProp />
        <DiscoveryPreapproval />
        <PrivateGroupTeaching />
        <PhoneFirstTeaching />
        <VirtualClassroom />
        <TeacherDashboardPreview />
        <TeacherProfileTrust />
        <TutorHowItWorks />
        <TutorFinalCta />
      </main>
      <Footer />
    </div>
  );
}
