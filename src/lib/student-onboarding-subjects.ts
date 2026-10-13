// Subject lists shown on the student onboarding "What do you want help
// with?" step, keyed by the academic level picked at sign-up. School levels
// get a subject list straight away; Undergraduate/Masters/PhD first pick a
// degree course (or type their own via "Other"), then the modules taught in
// that course.

export const OTHER_COURSE = "Other";

export const k1k3Subjects = [
  "Phonics & Early Reading",
  "Early Numeracy",
  "English",
  "Handwriting",
  "Basic Science",
  "Social Habits",
  "Health Habits",
  "Creative Arts",
  "Rhymes & Poems",
  "French",
  "Yoruba",
  "Igbo",
  "Hausa",
];

export const primarySubjects = [
  "Mathematics",
  "English Language",
  "Basic Science & Technology",
  "Social Studies",
  "Civic Education",
  "Verbal Reasoning",
  "Quantitative Reasoning",
  "Computer Studies",
  "Agricultural Science",
  "Home Economics",
  "Cultural & Creative Arts",
  "Physical & Health Education",
  "Christian Religious Studies",
  "Islamic Religious Studies",
  "Handwriting",
  "French",
  "Yoruba",
  "Igbo",
  "Hausa",
];

export const juniorSecondarySubjects = [
  "Mathematics",
  "English Language",
  "Basic Science",
  "Basic Technology",
  "Social Studies",
  "Civic Education",
  "Business Studies",
  "Computer Studies",
  "Agricultural Science",
  "Home Economics",
  "Cultural & Creative Arts",
  "Physical & Health Education",
  "Security Education",
  "Christian Religious Studies",
  "Islamic Religious Studies",
  "French",
  "Yoruba",
  "Igbo",
  "Hausa",
];

export const seniorSecondarySubjects = [
  "Mathematics",
  "English Language",
  "Further Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Agricultural Science",
  "Economics",
  "Government",
  "Geography",
  "Literature in English",
  "Commerce",
  "Financial Accounting",
  "Marketing",
  "Civic Education",
  "History",
  "Data Processing",
  "Computer Studies",
  "Technical Drawing",
  "Food & Nutrition",
  "Visual Arts",
  "Christian Religious Studies",
  "Islamic Religious Studies",
  "French",
  "Yoruba",
  "Igbo",
  "Hausa",
];

export const languageSubjects = [
  "English",
  "French",
  "Spanish",
  "German",
  "Arabic",
  "Mandarin",
  "Portuguese",
  "Italian",
  "Japanese",
  "Korean",
  "Russian",
  "Swahili",
  "Yoruba",
  "Igbo",
  "Hausa",
];

// Widely offered degree programmes worldwide, each with its core modules.
export const degreeCourses: Record<string, string[]> = {
  "Computer Science": ["Programming Fundamentals", "Data Structures & Algorithms", "Discrete Mathematics", "Database Systems", "Operating Systems", "Computer Networks", "Software Engineering", "Theory of Computation", "Artificial Intelligence", "Machine Learning", "Web Development", "Computer Architecture"],
  "Software Engineering": ["Programming Fundamentals", "Object-Oriented Programming", "Data Structures & Algorithms", "Software Design & Architecture", "Software Testing", "Requirements Engineering", "Database Systems", "Web Development", "Mobile App Development", "DevOps & Cloud Computing", "Project Management"],
  "Information Technology": ["Programming Fundamentals", "Networking", "Database Systems", "Systems Administration", "Web Development", "Information Security", "Cloud Computing", "IT Project Management", "Human-Computer Interaction"],
  "Data Science": ["Statistics", "Probability", "Linear Algebra", "Python for Data Science", "R Programming", "Machine Learning", "Data Visualisation", "Big Data", "Database Systems", "Deep Learning"],
  "Cyber Security": ["Networking", "Cryptography", "Ethical Hacking", "Network Security", "Digital Forensics", "Operating Systems", "Secure Programming", "Risk Management", "Security Policy & Law"],
  "Computer Engineering": ["Engineering Mathematics", "Digital Electronics", "Circuit Theory", "Microprocessors & Microcontrollers", "Computer Architecture", "Embedded Systems", "Programming", "Signals & Systems", "Data Structures & Algorithms"],
  "Electrical & Electronic Engineering": ["Engineering Mathematics", "Circuit Theory", "Electronics", "Electromagnetics", "Signals & Systems", "Control Systems", "Power Systems", "Electrical Machines", "Digital Electronics", "Telecommunications"],
  "Mechanical Engineering": ["Engineering Mathematics", "Engineering Drawing", "Statics & Dynamics", "Thermodynamics", "Fluid Mechanics", "Strength of Materials", "Heat Transfer", "Machine Design", "Manufacturing Processes", "Engineering Materials"],
  "Civil Engineering": ["Engineering Mathematics", "Engineering Drawing", "Statics", "Strength of Materials", "Structural Analysis", "Soil Mechanics", "Fluid Mechanics", "Surveying", "Reinforced Concrete Design", "Highway Engineering", "Hydrology"],
  "Chemical Engineering": ["Engineering Mathematics", "Material & Energy Balances", "Thermodynamics", "Fluid Mechanics", "Heat & Mass Transfer", "Reaction Engineering", "Process Control", "Separation Processes", "Organic Chemistry", "Plant Design"],
  "Petroleum Engineering": ["Engineering Mathematics", "Petroleum Geology", "Reservoir Engineering", "Drilling Engineering", "Production Engineering", "Fluid Mechanics", "Thermodynamics", "Well Testing", "Petroleum Economics"],
  "Biomedical Engineering": ["Engineering Mathematics", "Human Anatomy & Physiology", "Biomechanics", "Biomaterials", "Medical Instrumentation", "Signals & Systems", "Medical Imaging", "Electronics"],
  "Architecture": ["Architectural Design", "Architectural Drawing", "History of Architecture", "Building Construction", "Building Structures", "Environmental Design", "Computer-Aided Design (CAD)", "Urban Design", "Building Services"],
  "Medicine & Surgery": ["Anatomy", "Physiology", "Biochemistry", "Pathology", "Pharmacology", "Microbiology", "Internal Medicine", "Surgery", "Paediatrics", "Obstetrics & Gynaecology", "Community Medicine", "Psychiatry"],
  "Nursing": ["Anatomy & Physiology", "Fundamentals of Nursing", "Medical-Surgical Nursing", "Pharmacology", "Maternal & Child Health Nursing", "Community Health Nursing", "Mental Health Nursing", "Nutrition", "Nursing Research"],
  "Pharmacy": ["Pharmaceutical Chemistry", "Pharmacology", "Pharmaceutics", "Pharmacognosy", "Clinical Pharmacy", "Pharmaceutical Microbiology", "Physiology", "Biochemistry", "Pharmacy Law & Ethics"],
  "Dentistry": ["Anatomy", "Physiology", "Biochemistry", "Oral Biology", "Dental Materials", "Oral Pathology", "Restorative Dentistry", "Orthodontics", "Oral Surgery", "Periodontology"],
  "Public Health": ["Epidemiology", "Biostatistics", "Health Policy & Management", "Environmental Health", "Health Promotion", "Global Health", "Nutrition", "Research Methods"],
  "Medical Laboratory Science": ["Anatomy & Physiology", "Clinical Chemistry", "Haematology", "Medical Microbiology", "Histopathology", "Immunology", "Blood Transfusion Science", "Parasitology"],
  "Biochemistry": ["General Chemistry", "Organic Chemistry", "Cell Biology", "Metabolism", "Enzymology", "Molecular Biology", "Genetics", "Analytical Biochemistry", "Nutritional Biochemistry"],
  "Microbiology": ["General Biology", "General Microbiology", "Bacteriology", "Virology", "Mycology", "Immunology", "Microbial Genetics", "Industrial Microbiology", "Food Microbiology"],
  "Biology": ["Cell Biology", "Genetics", "Ecology", "Evolution", "Botany", "Zoology", "Microbiology", "Physiology", "Molecular Biology", "Biostatistics"],
  "Chemistry": ["General Chemistry", "Organic Chemistry", "Inorganic Chemistry", "Physical Chemistry", "Analytical Chemistry", "Spectroscopy", "Biochemistry", "Environmental Chemistry", "Quantum Chemistry"],
  "Physics": ["Mechanics", "Electricity & Magnetism", "Waves & Optics", "Thermodynamics & Statistical Physics", "Quantum Mechanics", "Mathematical Physics", "Electronics", "Solid State Physics", "Nuclear Physics", "Relativity"],
  "Mathematics": ["Calculus", "Linear Algebra", "Real Analysis", "Complex Analysis", "Abstract Algebra", "Differential Equations", "Probability", "Numerical Analysis", "Discrete Mathematics", "Topology"],
  "Statistics": ["Introduction to Statistics", "Probability Theory", "Statistical Inference", "Regression Analysis", "Sampling Techniques", "Design of Experiments", "Time Series Analysis", "Multivariate Analysis", "Statistical Computing (R / SPSS)"],
  "Economics": ["Microeconomics", "Macroeconomics", "Mathematics for Economists", "Statistics for Economists", "Econometrics", "Development Economics", "Monetary Economics", "Public Finance", "International Economics"],
  "Accounting": ["Financial Accounting", "Management Accounting", "Cost Accounting", "Auditing", "Taxation", "Corporate Finance", "Business Law", "Accounting Information Systems", "Public Sector Accounting"],
  "Finance": ["Corporate Finance", "Financial Accounting", "Financial Markets & Institutions", "Investment Analysis", "Risk Management", "Financial Modelling", "Econometrics", "Banking"],
  "Business Administration": ["Principles of Management", "Organisational Behaviour", "Marketing", "Financial Accounting", "Business Law", "Human Resource Management", "Operations Management", "Strategic Management", "Entrepreneurship", "Business Statistics"],
  "Marketing": ["Principles of Marketing", "Consumer Behaviour", "Marketing Research", "Digital Marketing", "Brand Management", "Sales Management", "Advertising", "International Marketing"],
  "Management": ["Principles of Management", "Organisational Behaviour", "Human Resource Management", "Operations Management", "Strategic Management", "Business Ethics", "Leadership", "Project Management"],
  "Law": ["Legal Methods", "Constitutional Law", "Contract Law", "Criminal Law", "Law of Torts", "Land Law / Property Law", "Equity & Trusts", "Commercial Law", "Company Law", "Evidence", "International Law", "Jurisprudence"],
  "Political Science": ["Introduction to Political Science", "Political Theory", "Comparative Politics", "International Relations", "Public Administration", "Public Policy", "Research Methods"],
  "International Relations": ["Introduction to International Relations", "Foreign Policy Analysis", "International Political Economy", "International Law", "Diplomacy", "Conflict & Peace Studies", "Global Governance"],
  "Psychology": ["Introduction to Psychology", "Developmental Psychology", "Cognitive Psychology", "Social Psychology", "Abnormal Psychology", "Biological Psychology", "Research Methods", "Statistics for Psychology", "Personality"],
  "Sociology": ["Introduction to Sociology", "Sociological Theory", "Social Research Methods", "Social Statistics", "Sociology of the Family", "Criminology", "Urban Sociology", "Gender Studies"],
  "Mass Communication": ["Introduction to Mass Communication", "News Writing & Reporting", "Broadcasting", "Public Relations", "Advertising", "Media Law & Ethics", "Photojournalism", "Digital Media", "Communication Research"],
  "English & Literature": ["Use of English", "Phonetics & Phonology", "Syntax", "Semantics", "African Literature", "English Literature", "Literary Theory", "Creative Writing", "Poetry", "Drama"],
  "Linguistics": ["Introduction to Linguistics", "Phonetics & Phonology", "Morphology", "Syntax", "Semantics", "Sociolinguistics", "Psycholinguistics", "Historical Linguistics"],
  "History": ["World History", "African History", "Historiography", "Economic History", "History of International Relations", "Colonialism & Decolonisation", "Research Methods"],
  "Philosophy": ["Introduction to Philosophy", "Logic", "Ethics", "Epistemology", "Metaphysics", "Political Philosophy", "History of Philosophy", "African Philosophy"],
  "Education": ["Philosophy of Education", "Educational Psychology", "Curriculum Studies", "Teaching Methods", "Educational Measurement & Evaluation", "Educational Technology", "Guidance & Counselling", "Research Methods"],
  "Agriculture": ["Crop Production", "Soil Science", "Animal Science", "Agricultural Economics", "Agricultural Extension", "Plant Pathology", "Farm Management", "Agronomy"],
  "Environmental Science": ["Environmental Chemistry", "Ecology", "Environmental Management", "Climate Science", "Geographic Information Systems (GIS)", "Environmental Impact Assessment", "Waste Management", "Hydrology"],
  "Geography": ["Physical Geography", "Human Geography", "Cartography", "Geographic Information Systems (GIS)", "Remote Sensing", "Climatology", "Urban Geography", "Research Methods"],
};

export const degreeCourseNames = Object.keys(degreeCourses);

// Taught to almost every postgraduate, whatever the course.
export const postgraduateExtras = ["Research Methods", "Literature Review", "Thesis / Dissertation Writing", "Data Analysis (SPSS / R / Stata)", "Academic Writing"];

export function isDegreeLevel(academicLevel: string | null | undefined) {
  return academicLevel === "Undergraduate" || academicLevel === "Masters" || academicLevel === "PhD";
}

// Subjects for school/exam/language levels. `detail` is the class/exam
// picked at sign-up (e.g. "JSS2", "SS3", "WAEC").
export function subjectsForLevel(academicLevel: string | null | undefined, detail?: string | null): string[] {
  switch (academicLevel) {
    case "K1-K3":
      return k1k3Subjects;
    case "Primary":
      return primarySubjects;
    case "Secondary":
      return detail?.startsWith("JSS") ? juniorSecondarySubjects : seniorSecondarySubjects;
    case "Exams":
      return seniorSecondarySubjects;
    case "Language":
      return languageSubjects;
    default:
      return seniorSecondarySubjects;
  }
}

// Modules for a degree course. "Other" (or an unknown typed course) gets the
// general study-skills list — the student adds their own modules on top.
export function subjectsForCourse(course: string, academicLevel: string | null | undefined): string[] {
  const modules = degreeCourses[course] ?? [];
  const postgraduate = academicLevel === "Masters" || academicLevel === "PhD";
  if (modules.length === 0) return postgraduate ? postgraduateExtras : ["Academic Writing", "Research Methods", "Statistics", "Presentation Skills"];
  return postgraduate ? [...modules, ...postgraduateExtras] : modules;
}
