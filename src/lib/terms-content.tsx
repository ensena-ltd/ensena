// Full structural draft of Ensena's Terms of Service, organized into
// human-readable categories for the /terms page. This is a working legal
// draft written to reflect how the Ensena marketplace actually works today —
// it is NOT a substitute for review by a qualified Nigerian lawyer before
// launch, particularly the cancellation/refund provisions (which should be
// checked against the Federal Competition and Consumer Protection Act) and
// the children/minors provisions (which should be checked against the
// Nigeria Data Protection Act 2023).
import { ArrowRight, CreditCard, User, Video, Wallet } from "lucide-react";

import type { LegalCategory } from "@/components/public-pages/legal-page-layout";

const paymentFlowSteps = [
  { icon: User, label: "Student pays securely" },
  { icon: CreditCard, label: "Payment is processed" },
  { icon: Video, label: "Lesson takes place" },
  { icon: Wallet, label: "Eligible tutor earnings available" },
];

function PaymentFlowDiagram() {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-ensena-border bg-ensena-bg-soft p-5">
      {paymentFlowSteps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-3">
          <div className="flex flex-col items-center gap-1.5 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-white text-ensena-primary">
              <step.icon className="size-4.5" />
            </span>
            <p className="max-w-20 text-xs font-medium text-ensena-ink">{step.label}</p>
          </div>
          {i < paymentFlowSteps.length - 1 && <ArrowRight className="size-4 shrink-0 text-ensena-muted" />}
        </div>
      ))}
    </div>
  );
}

function DiscoverySessionCallout() {
  return (
    <div className="rounded-2xl border border-ensena-secondary bg-ensena-secondary/40 p-5">
      <p className="font-heading text-sm font-semibold text-ensena-ink">Free Discovery Session</p>
      <p className="mt-1 text-xs font-medium text-ensena-muted">25 minutes · Online · ₦0</p>
      <p className="mt-2 text-sm text-ensena-ink">
        Discovery Sessions are free and do not obligate you to purchase anything. They&apos;re intended only for
        getting to know the tutor and discussing your learning needs.
      </p>
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export const termsCategories: LegalCategory[] = [
  {
    id: "overview",
    title: "Overview",
    clauses: [
      {
        id: "about-ensena",
        number: 1,
        title: "About Ensena",
        content: (
          <>
            <p>
              Ensena is an academic support platform designed to help learners access the academic support they
              need. The Platform may provide access to private tutoring, Group Classes, free Discovery Sessions,
              tutor discovery and profiles, instant booking, Pre-approval requests, tutor Special Offers, academic
              counselling, scheduling, messaging, a virtual classroom, a study planner, reviews and ratings,
              payments, tutor earnings and payouts, and other educational services Ensena introduces over time.
            </p>
            <p>
              Ensena may support learners across academic levels, including primary and secondary education,
              WAEC/NECO and JAMB/UTME preparation, undergraduate and postgraduate study, languages and other areas of
              learning. The exact services available may change as the Platform develops.
            </p>
          </>
        ),
      },
    ],
  },
  {
    id: "accounts",
    title: "Accounts",
    clauses: [
      {
        id: "user-accounts",
        number: 2,
        title: "User Accounts",
        content: (
          <>
            <p>
              Certain features of Ensena require an account. When creating an account, you agree to provide
              information that is accurate, current and complete, and to keep your login credentials secure.
            </p>
            <Bullets
              items={[
                "You must not impersonate another person or create an account using deliberately false information.",
                "You must not access another person's account without permission, or sell or transfer your account.",
                "You must not use automated systems to create accounts, or attempt to circumvent a suspension or restriction.",
              ]}
            />
            <p>Notify Ensena promptly if you believe your account has been accessed without authorization.</p>
          </>
        ),
      },
      {
        id: "student-accounts",
        number: 3,
        title: "Student Accounts",
        content: (
          <p>
            Students may use Ensena to search for tutors, take part in Discovery Sessions, send Pre-approval
            requests, book lessons, join Group Classes, message tutors and manage their lessons. Students are
            responsible for providing accurate information about their learning needs, and must not misrepresent
            their academic level, identity or payment information.
          </p>
        ),
      },
      {
        id: "parents-guardians",
        number: 4,
        title: "Parents, Guardians and Younger Learners",
        content: (
          <p>
            Where a student is a minor, an account is expected to be created and supervised by a parent or
            guardian, who is responsible for the information provided on the learner&apos;s behalf. Ensena may
            introduce additional safeguards for younger learners, including restrictions on messaging, classroom
            access or payments. How Ensena handles personal information, including a child&apos;s, is described in the
            Privacy Policy. This section should be reviewed against the Nigeria Data Protection Act 2023&apos;s
            provisions on children&apos;s data before launch.
          </p>
        ),
      },
    ],
  },
  {
    id: "tutors",
    title: "Tutors",
    clauses: [
      {
        id: "tutor-accounts",
        number: 5,
        title: "Tutor Accounts",
        content: (
          <>
            <p>
              Users offering tutoring through Ensena must create a Tutor Account and complete Ensena&apos;s onboarding
              and verification process. Tutors may be asked to provide their name, contact details, subjects,
              qualifications, experience, availability, rates, identity information and payout details.
            </p>
            <p>Ensena may require additional verification before activating or maintaining a Tutor Account.</p>
          </>
        ),
      },
      {
        id: "accuracy-of-tutor-profiles",
        number: 6,
        title: "Accuracy of Tutor Profiles",
        content: (
          <>
            <p>
              Tutors must ensure their profile accurately represents their qualifications, experience, subjects and
              availability, and must not fabricate credentials, misrepresent experience, use another person&apos;s
              identity, manipulate ratings, or make false claims about guaranteed results.
            </p>
            <p>Ensena may request evidence supporting information shown on a tutor&apos;s profile.</p>
          </>
        ),
      },
      {
        id: "tutor-verification",
        number: 7,
        title: "Tutor Verification",
        content: (
          <p>
            A verification badge means only that the particular verification step it represents has been
            completed. It is not an unconditional guarantee of a tutor&apos;s future conduct, teaching quality or
            suitability for every student. Students and parents should make their own judgment about whether a
            tutor meets their needs.
          </p>
        ),
      },
      {
        id: "tutor-responsibilities",
        number: 8,
        title: "Tutor Responsibilities",
        content: (
          <>
            <Bullets
              items={[
                "Attend confirmed lessons on time and maintain accurate availability.",
                "Provide professional educational services and communicate respectfully.",
                "Respect student privacy and follow safeguarding requirements.",
                "Avoid discriminatory, inappropriate or unprofessional conduct.",
                "Notify students appropriately when a schedule changes.",
              ]}
            />
            <p>
              Repeated cancellations, missed lessons, misleading profiles or serious misconduct may result in
              restrictions or suspension.
            </p>
          </>
        ),
      },
      {
        id: "tutor-relationship",
        number: 9,
        title: "Relationship Between Ensena and Tutors",
        content: (
          <p>
            Unless a separate written agreement says otherwise, Ensena operates as a technology platform connecting
            tutors and learners. Tutors determine aspects of the educational services they provide, subject to
            Ensena&apos;s Platform rules and applicable law. Nothing here should automatically be read as creating an
            employment, partnership or agency relationship between a tutor and Ensena. This should be reviewed
            against the actual operating relationship before launch.
          </p>
        ),
      },
    ],
  },
  {
    id: "discovery-sessions",
    title: "Discovery Sessions",
    after: <DiscoverySessionCallout />,
    clauses: [
      {
        id: "free-discovery-sessions",
        number: 10,
        title: "Free Discovery Sessions",
        content: (
          <>
            <p>
              Ensena allows students to book a free Discovery Session with participating tutors, so the student and
              tutor can determine whether they&apos;re a good learning match before the student books paid lessons.
              Unless shown otherwise at booking, a Discovery Session lasts around 25 minutes and may cover
              introductions, learning goals, academic level, teaching approach, availability and next steps.
            </p>
            <p>A Discovery Session is not a full paid lesson unless Ensena expressly states otherwise.</p>
          </>
        ),
      },
      {
        id: "discovery-sessions-are-free",
        number: 11,
        title: "Discovery Sessions Are Free",
        content: (
          <p>
            Where a Discovery Session is advertised as free, the student will not be charged a tutoring fee for it.
            Tutors must not independently demand payment from a student for a session advertised as a free
            Discovery Session.
          </p>
        ),
      },
      {
        id: "discovery-session-abuse",
        number: 12,
        title: "Discovery Session Abuse",
        content: (
          <p>
            Ensena may limit the Discovery Session feature (such as one free session per student per tutor)
            where it reasonably identifies misuse, such as repeatedly creating accounts to obtain free sessions or
            using Discovery Sessions as a substitute for paid lessons.
          </p>
        ),
      },
    ],
  },
  {
    id: "bookings",
    title: "Bookings",
    clauses: [
      {
        id: "private-lessons",
        number: 13,
        title: "Private Lessons",
        content: (
          <p>
            Students may book private tutoring sessions with tutors through the Platform. Tutor profiles display
            price, lesson duration, subjects, availability, academic levels, experience, ratings and reviews.
            Students should review the booking details carefully before confirming payment.
          </p>
        ),
      },
      {
        id: "book-instantly",
        number: 14,
        title: "Book Instantly",
        content: (
          <p>
            Where available, Book Instantly lets a student proceed directly to booking without first sending a
            Pre-approval request, selecting subject, duration, date, time, frequency and number of lessons. The
            final price and material booking terms are shown before payment is confirmed.
          </p>
        ),
      },
    ],
  },
  {
    id: "pre-approvals-special-offers",
    title: "Pre-approvals & Special Offers",
    clauses: [
      {
        id: "pre-approval-requests",
        number: 15,
        title: "Pre-approval Requests",
        content: (
          <p>
            Instead of booking immediately, a student may send a Pre-approval request describing their tutoring
            needs (subject, level, goal, schedule, frequency, duration and a message to the tutor) before
            committing to a paid booking. Sending a Pre-approval request does not itself create a confirmed,
            charged booking.
          </p>
        ),
      },
      {
        id: "daily-weekly-monthly-requests",
        number: 16,
        title: "Daily, Weekly and Monthly Requests",
        content: (
          <p>
            Where Ensena lets a student specify booking frequency, a Daily request allows a single selected day; a
            Weekly request allows the student to choose how many days per week and then select exactly that many
            days; and a Monthly request works the same way as Weekly, repeated across the chosen number of months.
            The booking interface displays the resulting schedule and price before the student sends the request.
          </p>
        ),
      },
      {
        id: "tutor-response-to-pre-approval",
        number: 17,
        title: "Tutor Response to a Pre-approval Request",
        content: (
          <p>
            A tutor may accept a Pre-approval request, decline it, send a Special Offer instead, or message the
            student. Acceptance does not by itself take payment from the student. The Platform clearly identifies
            the step at which a paid booking is created.
          </p>
        ),
      },
      {
        id: "special-offers",
        number: 18,
        title: "Special Offers",
        content: (
          <p>
            Tutors may send a student a Special Offer containing custom pricing and schedule terms, up to Ensena&apos;s
            maximum discount limit. Students cannot require a tutor to provide a Special Offer. Students may
            discuss pricing with a tutor through messaging, but only the tutor decides whether to send one.
          </p>
        ),
      },
      {
        id: "accepting-a-special-offer",
        number: 19,
        title: "Accepting a Special Offer",
        content: (
          <p>
            Before accepting a Special Offer, the student is shown its material terms, including price. The
            student may accept or decline it; if acceptance requires payment, that is made clear before the student
            confirms. Once payment is processed and the booking confirmed, the lessons appear in the relevant
            dashboards.
          </p>
        ),
      },
    ],
  },
  {
    id: "group-classes",
    title: "Group Classes",
    clauses: [
      {
        id: "group-classes-clause",
        number: 20,
        title: "Group Classes",
        content: (
          <p>
            Tutors may create Group Classes where this feature is available, allowing multiple students to attend
            the same scheduled session. A listing shows the class title, tutor, subject, level, description,
            schedule, duration, price per student, class size and available spaces.
          </p>
        ),
      },
      {
        id: "joining-a-group-class",
        number: 21,
        title: "Joining a Group Class",
        content: (
          <p>
            A place in a paid Group Class is confirmed only once the booking has been successfully completed.
            Spaces may be limited, and beginning the checkout process does not itself reserve a place unless
            Ensena expressly says otherwise.
          </p>
        ),
      },
      {
        id: "group-class-changes",
        number: 22,
        title: "Group Class Changes",
        content: (
          <p>
            Tutors should not materially change a confirmed Group Class without appropriate notice. If a tutor
            cancels a class and no suitable replacement is offered, affected students may be entitled to a refund,
            credit, or rescheduling under Ensena&apos;s Refund Policy and applicable law.
          </p>
        ),
      },
    ],
  },
  {
    id: "scheduling",
    title: "Scheduling",
    clauses: [
      {
        id: "tutor-calendars",
        number: 23,
        title: "Tutor Calendars",
        content: (
          <p>
            A tutor profile may show an availability calendar marking times as available, booked (already taken by
            another confirmed booking) or blocked (the tutor has manually made the time unavailable). Availability
            shown on the Platform can change, and merely viewing a time does not reserve it.
          </p>
        ),
      },
      {
        id: "time-zones",
        number: 24,
        title: "Time Zones",
        content: (
          <p>
            Ensena may display lesson times in the user&apos;s selected or detected time zone. Users are responsible for
            checking the time shown before confirming a booking.
          </p>
        ),
      },
    ],
  },
  {
    id: "payments",
    title: "Payments",
    after: <PaymentFlowDiagram />,
    clauses: [
      {
        id: "prices",
        number: 25,
        title: "Prices",
        content: (
          <p>
            Tutor rates and Group Class prices are displayed through the Platform and may vary by tutor, duration,
            subject or format. Students are shown the applicable total price and material charges before completing
            payment.
          </p>
        ),
      },
      {
        id: "payment-processing",
        number: 26,
        title: "Payment Processing",
        content: (
          <p>
            Ensena uses third-party payment providers (such as Paystack or Flutterwave) to process transactions. By
            paying, you may also be subject to that provider&apos;s own terms and privacy practices. Ensena does not
            store full card details itself.
          </p>
        ),
      },
      {
        id: "payment-authorization",
        number: 27,
        title: "Payment Authorization",
        content: (
          <p>
            Submitting a paid booking authorizes Ensena and/or its payment provider to charge your selected payment
            method for the amount shown at checkout. A booking may remain unconfirmed until authorization succeeds.
          </p>
        ),
      },
      {
        id: "payment-holding-tutor-earnings",
        number: 28,
        title: "Payment Holding and Tutor Earnings",
        content: (
          <p>
            Student payments are held until the conditions for release to the tutor are met (typically, the lesson
            being completed). This description must match Ensena&apos;s actual payment architecture and payment-provider
            agreement. Ensena will not describe this as a regulated escrow service unless that is legally and
            technically accurate.
          </p>
        ),
      },
      {
        id: "tutor-platform-fees",
        number: 29,
        title: "Tutor Platform Fees",
        content: (
          <p>
            Ensena charges tutors a commission on the amount a student actually pays for a booking, calculated on
            the final, discounted price where a Special Offer applies, never on the undiscounted standard price.
            The applicable rate is shown in the tutor dashboard and may change with appropriate notice.
          </p>
        ),
      },
      {
        id: "tutor-payouts",
        number: 30,
        title: "Tutor Payouts",
        content: (
          <p>
            Eligible tutor earnings may be withdrawn using supported payout methods. Availability depends on lesson
            completion, payment settlement, identity verification, fraud checks and the payment provider&apos;s
            processing times. Tutor dashboards show earnings as pending, available, processing or paid.
          </p>
        ),
      },
    ],
  },
  {
    id: "cancellations-refunds",
    title: "Cancellations & Refunds",
    after: (
      <a
        href="/refund-policy"
        className="w-fit rounded-full border border-ensena-border bg-ensena-surface px-4 py-2 text-sm font-semibold text-ensena-primary hover:border-ensena-primary/40 hover:bg-ensena-bg-soft"
      >
        Read the full Cancellation &amp; Refund Policy →
      </a>
    ),
    clauses: [
      {
        id: "cancellation-policy",
        number: 31,
        title: "Cancellation Policy",
        content: (
          <p>
            Students and tutors should review the cancellation window shown at booking. Cancellation rights and any
            charge are subject to applicable law. Under Nigeria&apos;s FCCPA, consumers generally have a right to
            cancel advance bookings subject to a reasonable cancellation charge, so Ensena&apos;s final Refund Policy
            must be designed consistently with that right.
          </p>
        ),
      },
      {
        id: "tutor-cancellation",
        number: 32,
        title: "Tutor Cancellation",
        content: (
          <p>
            Tutors should make reasonable efforts to attend confirmed lessons. If a tutor cannot attend, they should
            cancel or request rescheduling through the Platform as soon as possible. Where a tutor cancels and the
            lesson isn&apos;t delivered, the student may receive rescheduling, credit or a refund depending on the
            circumstances.
          </p>
        ),
      },
      {
        id: "student-cancellation",
        number: 33,
        title: "Student Cancellation",
        content: (
          <p>
            Students should cancel through the Platform rather than simply not attending. Any applicable
            cancellation consequence is shown before the cancellation is finalized. Ensena will not impose terms
            that override rights that cannot lawfully be excluded.
          </p>
        ),
      },
      {
        id: "no-shows",
        number: 34,
        title: "No-Shows",
        content: (
          <p>
            A user is a no-show when they fail to attend a confirmed lesson without properly cancelling within the
            required window. Different consequences may apply depending on whether the tutor or the student failed
            to attend, consistent with applicable consumer rights.
          </p>
        ),
      },
      {
        id: "technical-problems",
        number: 35,
        title: "Technical Problems",
        content: (
          <p>
            If a lesson cannot reasonably proceed because of a significant technical problem with the Ensena
            Platform, Ensena may offer rescheduling, credit, a refund or another appropriate remedy. Report
            technical problems promptly through the Platform.
          </p>
        ),
      },
    ],
  },
  {
    id: "virtual-classroom",
    title: "Virtual Classroom",
    clauses: [
      {
        id: "virtual-classroom-clause",
        number: 36,
        title: "Virtual Classroom",
        content: (
          <p>
            Ensena provides an integrated virtual classroom for online lessons, which may include video, audio,
            chat, screen sharing and other educational tools. Users must use these tools only for their intended
            purpose.
          </p>
        ),
      },
      {
        id: "classroom-conduct",
        number: 37,
        title: "Classroom Conduct",
        content: (
          <p>
            Students and tutors must behave respectfully in the classroom. Harassment, threats, discriminatory
            abuse, bullying, sexual misconduct, unauthorized recording or other prohibited conduct may result in
            removal from the classroom or account restrictions.
          </p>
        ),
      },
      {
        id: "recording",
        number: 38,
        title: "Recording",
        content: (
          <p>
            Lessons are not automatically recorded unless Ensena clearly states otherwise. If recording is
            introduced, appropriate notice and consent will be built in before it begins where required.
          </p>
        ),
      },
    ],
  },
  {
    id: "messaging",
    title: "Messaging",
    clauses: [
      {
        id: "ensena-messaging",
        number: 39,
        title: "Ensena Messaging",
        content: (
          <p>
            Students and tutors may communicate through Ensena&apos;s messaging system for legitimate tutoring matters:
            learning objectives, scheduling, lesson preparation, Pre-approvals, Special Offers and Group Classes.
          </p>
        ),
      },
      {
        id: "messaging-rules",
        number: 40,
        title: "Messaging Rules",
        content: (
          <p>
            Users must not use Ensena messages to send spam, harass others, commit fraud, distribute malware or
            solicit prohibited transactions. Ensena may investigate reported messages and take proportionate action,
            consistent with the Privacy Policy and applicable data-protection law.
          </p>
        ),
      },
    ],
  },
  {
    id: "counselling",
    title: "Counselling",
    clauses: [
      {
        id: "speak-to-a-counsellor",
        number: 41,
        title: "Speak to a Counsellor",
        content: (
          <>
            <p>
              Ensena&apos;s Speak to a Counsellor service helps students make educational decisions: choosing tutors,
              selecting subjects, identifying learning goals, creating a learning plan, understanding academic
              pathways and navigating Ensena.
            </p>
          </>
        ),
      },
      {
        id: "scope-of-counselling",
        number: 42,
        title: "Scope of Counselling",
        content: (
          <p>
            Unless Ensena states otherwise, counselling is educational and academic guidance. It is not medical,
            mental-health, legal or financial advice. Users needing services outside that scope should seek an
            appropriately qualified professional.
          </p>
        ),
      },
    ],
  },
  {
    id: "reviews-ratings",
    title: "Reviews & Ratings",
    clauses: [
      {
        id: "reviews-and-ratings",
        number: 43,
        title: "Reviews and Ratings",
        content: (
          <p>
            Students may review tutors after eligible interactions or completed lessons. Reviews should reflect
            genuine experiences. Users must not post fake reviews, exchange money for reviews, threaten a tutor
            with a negative review to get a discount, or coordinate artificial ratings.
          </p>
        ),
      },
      {
        id: "review-moderation",
        number: 44,
        title: "Review Moderation",
        content: (
          <p>
            Ensena may remove reviews that violate Platform policies, including spam, abuse, irrelevant content or
            fraud, but will not remove a genuine negative review merely because it&apos;s unfavorable to a tutor.
          </p>
        ),
      },
    ],
  },
  {
    id: "academic-integrity",
    title: "Academic Integrity",
    clauses: [
      {
        id: "educational-assistance",
        number: 45,
        title: "Educational Assistance",
        content: (
          <p>
            Ensena exists to help students learn, not to facilitate academic dishonesty. Tutors may explain
            concepts, review work, provide practice exercises and help students prepare for exams.
          </p>
        ),
      },
      {
        id: "prohibited-academic-conduct",
        number: 46,
        title: "Prohibited Academic Conduct",
        content: (
          <p>
            Users must not use Ensena to facilitate cheating, impersonation, unauthorized exam assistance,
            falsified academic credentials, or submitting another person&apos;s work as one&apos;s own where prohibited by
            the relevant institution.
          </p>
        ),
      },
    ],
  },
  {
    id: "safety-conduct",
    title: "Safety & Conduct",
    clauses: [
      {
        id: "user-safety",
        number: 47,
        title: "User Safety",
        content: (
          <p>
            Ensena implements safety measures including account verification, reporting tools, blocking, message
            controls, fraud detection and administrative moderation. These systems don&apos;t remove a user&apos;s
            responsibility to behave appropriately.
          </p>
        ),
      },
      {
        id: "reporting",
        number: 48,
        title: "Reporting",
        content: (
          <p>
            Report suspected harassment, fraud, impersonation, academic misconduct, inappropriate behaviour, payment
            manipulation, fake qualifications or other safety concerns. Ensena may investigate and take
            proportionate action.
          </p>
        ),
      },
    ],
  },
  {
    id: "prohibited-use",
    title: "Prohibited Use",
    clauses: [
      {
        id: "prohibited-activities",
        number: 49,
        title: "Prohibited Activities",
        content: (
          <Bullets
            items={[
              "Using Ensena for unlawful purposes, fraud, or impersonation.",
              "Manipulating payments, bookings, reviews or Discovery Sessions.",
              "Interfering with Platform security, scraping data, or attempting unauthorized access.",
              "Harassing other users or circumventing account restrictions.",
              "Falsifying qualifications, or infringing intellectual-property rights.",
            ]}
          />
        ),
      },
    ],
  },
  {
    id: "intellectual-property",
    title: "Intellectual Property",
    clauses: [
      {
        id: "ensena-ip",
        number: 50,
        title: "Ensena Intellectual Property",
        content: (
          <p>
            The Ensena Platform and its branding, software, designs and original content are owned by or licensed
            to Ensena. Users may not copy or commercially exploit Ensena&apos;s protected intellectual property except
            as permitted by law or authorized by Ensena.
          </p>
        ),
      },
      {
        id: "user-content",
        number: 51,
        title: "User Content",
        content: (
          <p>
            Users may upload content such as profile photos, bios, teaching materials and messages. Users retain
            any rights they lawfully hold in that content, and grant Ensena a limited license to host, store and
            display it as reasonably necessary to operate the Platform. Users must have the rights needed to upload
            what they submit.
          </p>
        ),
      },
    ],
  },
  {
    id: "privacy",
    title: "Privacy",
    clauses: [
      {
        id: "personal-information",
        number: 52,
        title: "Personal Information",
        content: (
          <p>
            Ensena processes personal information in accordance with its Privacy Policy and applicable
            data-protection law, including the Nigeria Data Protection Act 2023. Read the Privacy Policy before
            using the Platform.
          </p>
        ),
      },
    ],
  },
  {
    id: "account-suspension",
    title: "Account Suspension & Termination",
    clauses: [
      {
        id: "account-restrictions",
        number: 53,
        title: "Account Restrictions",
        content: (
          <p>
            Ensena may restrict, suspend or terminate an account where reasonably necessary because of serious or
            repeated violations, fraud, safety concerns, falsified credentials, payment abuse, harassment, academic
            misconduct or legal requirements. Where appropriate and legally required, Ensena will provide notice or
            an opportunity to appeal.
          </p>
        ),
      },
      {
        id: "effect-of-termination",
        number: 54,
        title: "Effect of Termination",
        content: (
          <p>
            Termination doesn&apos;t eliminate obligations that arose before it. Ensena will handle outstanding bookings,
            legitimate refunds, tutor earnings and personal information in line with applicable law and Ensena&apos;s
            policies.
          </p>
        ),
      },
    ],
  },
  {
    id: "platform-availability",
    title: "Platform Availability",
    clauses: [
      {
        id: "changes-to-ensena",
        number: 55,
        title: "Changes to Ensena",
        content: (
          <p>
            Ensena is an evolving service and may introduce, modify or discontinue functionality. Where a change
            materially affects an existing paid booking or a user&apos;s legal rights, Ensena will handle it consistently
            with applicable law and the terms that applied to that transaction.
          </p>
        ),
      },
      {
        id: "service-interruptions",
        number: 56,
        title: "Service Interruptions",
        content: (
          <p>
            Ensena aims for reliable availability but cannot guarantee it will never be interrupted, due to
            maintenance, technical issues, third-party infrastructure failures or circumstances outside Ensena&apos;s
            control. Where an interruption prevents a paid service from being delivered, applicable refund/
            rescheduling policies continue to apply.
          </p>
        ),
      },
    ],
  },
  {
    id: "third-party-services",
    title: "Third-Party Services",
    clauses: [
      {
        id: "third-party-providers",
        number: 57,
        title: "Third-Party Providers",
        content: (
          <p>
            Ensena relies on third-party providers for services such as payment processing, hosting, authentication
            and video conferencing. Use of certain third-party functionality may be subject to that provider&apos;s own
            terms or privacy notice, as described further in Ensena&apos;s Privacy Policy.
          </p>
        ),
      },
    ],
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    clauses: [
      {
        id: "educational-outcomes",
        number: 58,
        title: "Educational Outcomes",
        content: (
          <p>
            Learning outcomes vary between students. Unless Ensena expressly provides a specific written guarantee,
            Ensena does not guarantee any particular exam score, grade, admission, scholarship or academic result
            from using a tutor.
          </p>
        ),
      },
      {
        id: "platform-role",
        number: 59,
        title: "Platform Role",
        content: (
          <p>
            Tutors are responsible for the tutoring services they personally provide. Nothing in these Terms is
            intended to exclude consumer protections, warranties or remedies that cannot lawfully be excluded,
            including under the Federal Competition and Consumer Protection Act&apos;s limits on excluding liability for
            defective performance, negligence, fraud or misrepresentation.
          </p>
        ),
      },
    ],
  },
  {
    id: "disputes-complaints",
    title: "Disputes & Complaints",
    clauses: [
      {
        id: "contacting-ensena-first",
        number: 60,
        title: "Contacting Ensena First",
        content: (
          <p>
            If a problem arises with a booking, payment, tutor, student or Group Class, contact Ensena Support
            first with your booking reference, account email, and a description of the issue. Ensena will aim to
            investigate complaints fairly.
          </p>
        ),
      },
      {
        id: "consumer-rights",
        number: 61,
        title: "Consumer Rights",
        content: (
          <p>
            Nothing in these Terms removes rights available to consumers under applicable law, including under the
            Federal Competition and Consumer Protection Commission&apos;s rules.
          </p>
        ),
      },
    ],
  },
  {
    id: "general-terms",
    title: "General Terms",
    clauses: [
      {
        id: "changes-to-these-terms",
        number: 62,
        title: "Changes to These Terms",
        content: (
          <p>
            Ensena may update these Terms as the Platform develops or to reflect legal or operational changes. The
            latest version always shows its effective date, and material changes affecting users&apos; rights will be
            given additional notice where appropriate.
          </p>
        ),
      },
      {
        id: "governing-law",
        number: 63,
        title: "Governing Law",
        content: (
          <p>
            Unless applicable law requires otherwise, these Terms are governed by the laws of the Federal Republic
            of Nigeria. Nothing here prevents a consumer from exercising rights that cannot lawfully be waived.
          </p>
        ),
      },
      {
        id: "entire-agreement",
        number: 64,
        title: "Entire Agreement",
        content: (
          <p>
            These Terms, together with policies expressly incorporated into them, form the agreement governing use
            of Ensena to the extent permitted by law. Additional terms may apply to specific services.
          </p>
        ),
      },
      {
        id: "severability",
        number: 65,
        title: "Severability",
        content: (
          <p>
            If a provision of these Terms is found unlawful or unenforceable, the remaining provisions continue to
            apply to the extent permitted by law.
          </p>
        ),
      },
      {
        id: "no-waiver",
        number: 66,
        title: "No Waiver",
        content: (
          <p>
            If Ensena doesn&apos;t immediately enforce a provision, that doesn&apos;t permanently waive that provision or any
            related right.
          </p>
        ),
      },
      {
        id: "assignment",
        number: 67,
        title: "Assignment",
        content: (
          <p>
            Users may not transfer their rights or obligations under these Terms without Ensena&apos;s permission. Ensena
            may transfer its rights and obligations as part of a lawful restructuring, merger or sale.
          </p>
        ),
      },
    ],
  },
  {
    id: "contact",
    title: "Contact",
    clauses: [
      {
        id: "contact-information",
        number: 68,
        title: "Contact Information",
        content: (
          <p>
            Questions, complaints or concerns about these Terms can be sent through the{" "}
            <a href="/contact" className="font-medium text-ensena-primary hover:underline">
              Ensena Contact page
            </a>{" "}
            or to support@ensena.co. For booking-related issues, please include your booking reference.
          </p>
        ),
      },
      {
        id: "acceptance",
        number: 69,
        title: "Acceptance",
        content: (
          <p>
            By creating an Ensena account or continuing to use the Platform after being presented with these Terms,
            you acknowledge that you have read and understood them and agree to be bound by them, subject to rights
            that cannot lawfully be waived.
          </p>
        ),
      },
    ],
  },
];
