import { AcademicLevels } from "@/components/academic-levels";
import { BecomeTeacher } from "@/components/become-teacher";
import { CounsellorBanner } from "@/components/counsellor-banner";
import { ExamPathwayCards } from "@/components/discovery/exam-pathway-cards";
import { PersonalizedSections } from "@/components/discovery/personalized-sections";
import { UpcomingClassesSection } from "@/components/discovery/upcoming-classes-section";
import { Footer } from "@/components/footer";
import { GroupClasses } from "@/components/group-classes";
import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { PopularSubjects } from "@/components/popular-subjects";
import { TeacherSection } from "@/components/teacher-section";
import { eveningClasses, startingSoonClasses, weekendClasses } from "@/lib/discovery-groups-data";
import { examPrepTeachers, newTeachers, topRatedTeachers } from "@/lib/data";
import {
  getAffordableTutors,
  getAvailableTodayTutors,
  getExperiencedTutors,
  getLanguageTutors,
  getUniversityTutors,
  tutorToTeacher,
} from "@/lib/tutors";

export default function Home() {
  return (
    <div id="top" className="flex min-h-screen flex-col bg-white pb-16 lg:pb-0">
      <Header mobileNav="icons" logoSize={48} />
      <main className="flex-1">
        <Hero />
        <AcademicLevels />
        <TeacherSection
          title="Top Rated Teachers"
          subtitle="Quality academic support, highly rated and reviewed by students nationwide."
          teachers={topRatedTeachers}
          badge="Top Rated"
          viewAllLabel="View all teachers"
        />
        <GroupClasses />
        <TeacherSection
          id="waec-jamb-prep"
          title="WAEC & JAMB Prep"
          subtitle="The academic support you need to excel."
          teachers={examPrepTeachers}
          viewAllLabel="View all exam prep teachers"
        />
        <CounsellorBanner />
        <TeacherSection
          title="University Tutors"
          subtitle="Computer Science, Engineering, Economics and more."
          teachers={getUniversityTutors().map(tutorToTeacher)}
          viewAllLabel="View all university tutors"
          viewAllHref="/find-teachers/browse?level=Undergraduate"
        />
        <TeacherSection
          title="New on Ensena"
          subtitle="Fresh academic support, recently approved and ready to teach."
          teachers={newTeachers}
          badge="New"
          viewAllLabel="View all new teachers"
        />
        <PopularSubjects />
        <ExamPathwayCards />
        <TeacherSection
          title="Learn a New Language"
          subtitle="From heritage languages to global ones."
          teachers={getLanguageTutors().map(tutorToTeacher)}
          viewAllLabel="View all language teachers"
          viewAllHref="/languages"
        />
        <TeacherSection
          title="Great Teachers Under ₦3,000/hr"
          subtitle="Quality academic support that fits your budget."
          teachers={getAffordableTutors().map(tutorToTeacher)}
          viewAllLabel="View all"
        />
        <TeacherSection
          title="Experienced Teachers"
          subtitle="Seasoned academic support with a track record of results."
          teachers={getExperiencedTutors().map(tutorToTeacher)}
          viewAllLabel="View all"
        />
        <TeacherSection
          title="Available Today"
          subtitle="Academic support with open slots right now."
          teachers={getAvailableTodayTutors().map(tutorToTeacher)}
          viewAllLabel="View all"
        />
        <PersonalizedSections />
        <UpcomingClassesSection
          title="Learn This Weekend"
          subtitle="Group classes running this Saturday and Sunday."
          classes={weekendClasses()}
        />
        <UpcomingClassesSection
          title="Learn After School"
          subtitle="Evening group classes for school students."
          classes={eveningClasses()}
        />
        <UpcomingClassesSection
          title="Starting Soon"
          subtitle="Group classes about to fill up."
          classes={startingSoonClasses()}
        />
        <BecomeTeacher />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
