import type { Attribute, Role } from "./types";

const EXPERIENCE: Attribute = {
  id: "experience",
  label: "Total experience",
  short: "Experience",
  kind: "choice",
  question: "How many years of full-time professional experience does this candidate have in total?",
  options: {
    "0–2 yrs": "Fresh graduate or up to 2 years",
    "3–5 yrs": "Three to five years",
    "6–8 yrs": "Six to eight years",
    "9–12 yrs": "Nine to twelve years",
    "13+ yrs": "Thirteen or more years",
  },
  optionValues: { "0–2 yrs": 1, "3–5 yrs": 4, "6–8 yrs": 7, "9–12 yrs": 10.5, "13+ yrs": 14 },
  weight: 0,
};

const levels = (topic: string) => [
  `No evidence of ${topic}`,
  `Basic or academic ${topic}`,
  `Some professional ${topic}`,
  `Solid, repeated professional ${topic}`,
  `Deep, expert-level ${topic} with clear impact`,
];

export const ROLES: Role[] = [
  {
    id: "backend-java",
    title: "Senior Backend Engineer, Java",
    team: "Payments Platform",
    location: "Bengaluru · Hybrid",
    type: "Full-time",
    postedDaysAgo: 12,
    description:
      "Own high-throughput Java/Spring services for our payments platform: design event-driven systems on Kafka, run them on Kubernetes, and mentor a growing team.",
    attributes: [
      { id: "java", label: "Java & Spring depth", short: "Java", kind: "score", question: "How deep is the candidate's professional Java / Spring Boot expertise?", levels: levels("Java and Spring experience"), weight: 3 },
      { id: "distsys", label: "Distributed systems", short: "Dist. systems", kind: "score", question: "How strong is the candidate's experience designing and running distributed systems (queues, streaming, sharding, high availability)?", levels: levels("distributed-systems experience"), weight: 2 },
      { id: "cloud", label: "Cloud & DevOps", short: "Cloud", kind: "score", question: "How strong is the candidate's cloud and DevOps experience (AWS/GCP, Kubernetes, CI/CD, infrastructure as code)?", levels: levels("cloud and DevOps experience"), weight: 1.5 },
      { id: "leadership", label: "Leadership & mentoring", short: "Leadership", kind: "score", question: "How much technical leadership and mentoring has the candidate demonstrated?", levels: ["No leadership evidence", "Helped peers informally", "Mentored interns or juniors", "Tech lead for a team", "Managed or led multiple engineers with measurable outcomes"], weight: 1.5 },
      { id: "communication", label: "Resume clarity", short: "Clarity", kind: "score", question: "How clearly and concretely does the resume communicate the candidate's impact?", levels: ["Vague, generic, errors", "Mostly generic duties", "Some concrete outcomes", "Clear with metrics", "Crisp, specific and quantified throughout"], weight: 1 },
      EXPERIENCE,
      {
        id: "industry",
        label: "Primary industry",
        short: "Industry",
        kind: "choice",
        question: "In which industry has this candidate spent most of their career?",
        options: { Fintech: "Payments, banking, lending, trading", "E-commerce": "Retail, marketplaces, delivery", SaaS: "B2B software products", "Big tech": "Large global technology companies", "IT services": "Consulting and outsourcing firms", Healthcare: "Health and medical technology", Other: null },
        weight: 0,
      },
      { id: "startup", label: "Startup experience", short: "Startup", kind: "noul", question: "Has the candidate worked at an early-stage startup?", weight: 0 },
      { id: "oss", label: "Open-source contributor", short: "Open source", kind: "noul", question: "Does the candidate contribute to or maintain open-source projects?", weight: 0 },
    ],
    suggestions: [
      { label: "Research experience in Canada", kind: "score", question: "How much research experience has the candidate gained in Canada?" },
      { label: "Kafka & event streaming", kind: "score", question: "How strong is the candidate's hands-on Kafka and event-streaming experience?" },
      { label: "Payments domain", kind: "score", question: "How much experience does the candidate have building payments or fintech systems?" },
      { label: "JVM performance tuning", kind: "score", question: "How much experience does the candidate have profiling and tuning JVM performance (GC, memory, latency)?" },
      { label: "Big-tech alumni", kind: "noul", question: "Has the candidate worked at a large global technology company such as Google, Amazon or Microsoft?" },
      { label: "Notice period ≤ 30 days", kind: "noul", question: "Is the candidate's notice period 30 days or less?" },
      { label: "Job-hopping risk", kind: "noul", question: "Has the candidate changed jobs frequently, averaging less than 18 months per role?" },
      { label: "Remote collaboration", kind: "score", question: "How much experience does the candidate have working in remote or distributed teams?" },
    ],
  },
  {
    id: "ml-research",
    title: "Machine Learning Research Scientist",
    team: "Applied Research",
    location: "Toronto · On-site",
    type: "Full-time",
    postedDaysAgo: 20,
    description:
      "Publish and ship: lead research on large language models and bring results into production with our platform team in Toronto.",
    attributes: [
      { id: "research", label: "Research depth", short: "Research", kind: "score", question: "How strong is the candidate's research track record (publications, venues, citations)?", levels: ["No research", "Course or thesis projects", "Workshop papers or a few publications", "Several main-venue publications", "Prolific first-author record at top venues"], weight: 3 },
      { id: "dl", label: "Deep learning", short: "Deep learning", kind: "score", question: "How deep is the candidate's hands-on deep learning expertise (PyTorch/JAX, transformers, large-scale training)?", levels: levels("deep-learning experience"), weight: 2.5 },
      { id: "prodml", label: "Production ML", short: "Prod ML", kind: "score", question: "How much experience does the candidate have shipping ML models to production (serving, MLOps, monitoring)?", levels: levels("production ML experience"), weight: 1.5 },
      { id: "math", label: "Math & statistics", short: "Math", kind: "score", question: "How strong is the candidate's mathematical and statistical background?", levels: ["Little evidence", "Undergraduate-level", "Graduate coursework", "Strong applied math or stats", "Exceptional theoretical depth"], weight: 1 },
      { id: "communication", label: "Resume clarity", short: "Clarity", kind: "score", question: "How clearly and concretely does the resume communicate the candidate's impact?", levels: ["Vague, generic, errors", "Mostly generic duties", "Some concrete outcomes", "Clear with metrics", "Crisp, specific and quantified throughout"], weight: 1 },
      EXPERIENCE,
      { id: "phd", label: "Holds a PhD", short: "PhD", kind: "noul", question: "Does the candidate hold a PhD (completed, not in progress)?", weight: 0 },
      { id: "canada", label: "Studied or worked in Canada", short: "Canada", kind: "noul", question: "Has the candidate studied or worked in Canada?", weight: 0 },
    ],
    suggestions: [
      { label: "Research experience in Canada", kind: "score", question: "How much research experience has the candidate gained in Canada?" },
      { label: "LLM & NLP expertise", kind: "score", question: "How strong is the candidate's expertise in large language models and NLP?" },
      { label: "Top-tier venues", kind: "noul", question: "Has the candidate published at NeurIPS, ICML, ICLR, ACL or CVPR?" },
      { label: "Reinforcement learning", kind: "score", question: "How much reinforcement learning experience does the candidate have?" },
      { label: "Teaching & mentoring", kind: "score", question: "How much teaching or mentoring experience does the candidate have?" },
      { label: "Industry lab experience", kind: "noul", question: "Has the candidate worked at an industry research lab?" },
    ],
  },
  {
    id: "product-design",
    title: "Senior Product Designer",
    team: "Design Systems",
    location: "Remote · India",
    type: "Full-time",
    postedDaysAgo: 6,
    description: "Shape the end-to-end experience of a B2B analytics product and evolve our design system across web and mobile.",
    attributes: [
      { id: "visual", label: "Visual craft", short: "Visual", kind: "score", question: "How strong is the candidate's visual and interface design craft?", levels: levels("visual design craft"), weight: 2.5 },
      { id: "research", label: "UX research", short: "Research", kind: "score", question: "How much user research has the candidate planned and run?", levels: levels("UX research experience"), weight: 2 },
      { id: "systems", label: "Design systems", short: "Systems", kind: "score", question: "How much experience does the candidate have building or maintaining design systems?", levels: levels("design-systems experience"), weight: 2 },
      { id: "prototyping", label: "Prototyping & motion", short: "Prototyping", kind: "score", question: "How strong is the candidate's prototyping and motion design work?", levels: levels("prototyping and motion design"), weight: 1 },
      { id: "collab", label: "Cross-functional collaboration", short: "Collab", kind: "score", question: "How well has the candidate collaborated with engineering, product and leadership?", levels: levels("cross-functional collaboration"), weight: 1.5 },
      EXPERIENCE,
      { id: "b2b", label: "B2B SaaS background", short: "B2B SaaS", kind: "noul", question: "Has the candidate designed B2B or enterprise SaaS products?", weight: 0 },
      { id: "portfolio", label: "Portfolio linked", short: "Portfolio", kind: "noul", question: "Does the resume include a portfolio link?", weight: 0 },
    ],
    suggestions: [
      { label: "Accessibility expertise", kind: "score", question: "How much accessibility (WCAG) expertise does the candidate show?" },
      { label: "Data visualisation", kind: "score", question: "How much data-visualisation or dashboard design experience does the candidate have?" },
      { label: "Mobile app design", kind: "score", question: "How much native mobile app design experience does the candidate have?" },
      { label: "Design leadership", kind: "score", question: "How much design leadership (managing designers, running critiques) has the candidate shown?" },
      { label: "Speaks at conferences", kind: "noul", question: "Has the candidate spoken at design conferences or meetups?" },
    ],
  },
];

export const ROLE_BY_ID = Object.fromEntries(ROLES.map((r) => [r.id, r]));
