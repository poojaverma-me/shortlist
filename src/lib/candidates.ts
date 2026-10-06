import { hash, int, pick, rng, type Rand } from "./rng";
import type { Candidate, Experience } from "./types";

type Company = { name: string; industry: string; startup?: boolean; bigTech?: boolean; city?: string };
type Trait = { key: string; bullets: string[][]; skills: string[][] };
type Ctx = { r: Rand; lv: Record<string, number>; years: number; flags: Record<string, boolean>; name: string };

type Spec = {
  roleId: string;
  count: number;
  traits: Trait[];
  title: (years: number, ctx: Ctx) => string;
  companies: Company[];
  locations: string[];
  flags: Record<string, number>;
  education: (ctx: Ctx) => string[];
  extras: (ctx: Ctx) => string[];
  summary: (ctx: Ctx) => string;
  yearsRange: [number, number];
};

const FIRST = [
  "Oliver", "Amelia", "James", "Charlotte", "William", "Emily", "Henry", "Sophie", "George", "Grace", "Thomas", "Lucy", "Jack",
  "Hannah", "Daniel", "Olivia", "Samuel", "Ella", "Benjamin", "Chloe", "Matthew", "Isabel", "Edward", "Lily", "Harry", "Rachel",
  "Joseph", "Laura", "Michael", "Anna", "David", "Emma", "Andrew", "Rebecca", "Christopher", "Victoria", "Nathan", "Megan",
  "Ryan", "Jessica", "Liam", "Abigail", "Ethan", "Natalie", "Luke", "Holly", "Adam", "Zoe", "Peter", "Katie",
];
const LAST = [
  "Smith", "Johnson", "Williams", "Brown", "Taylor", "Wilson", "Davies", "Evans", "Thomas", "Roberts", "Walker", "Wright",
  "Thompson", "White", "Hughes", "Edwards", "Green", "Hall", "Wood", "Harris", "Clarke", "Jackson", "Turner", "Hill", "Moore",
  "Cooper", "Ward", "Morris", "King", "Baker", "Carter", "Parker", "Bennett", "Mitchell", "Collins", "Stewart", "Fletcher",
  "Hayes", "Reed", "Foster", "Bailey", "Murphy", "Spencer", "Lawson", "Porter", "Sullivan", "Graham", "Shaw", "Palmer", "Hunt",
];

function fill(r: Rand, t: string, extra: Record<string, string> = {}) {
  return t
    .replace(/\{n\}/g, () => String(int(r, 3, 40)))
    .replace(/\{N\}/g, () => String(int(r, 2, 9) * 100))
    .replace(/\{p\}/g, () => String(int(r, 18, 64)))
    .replace(/\{m\}/g, () => String(int(r, 2, 6)))
    .replace(/\{(\w+)\}/g, (_, k) => extra[k] ?? k);
}

const lvl = (r: Rand, q: number) => Math.max(0, Math.min(4, Math.round(q * 4 + (r() - 0.5) * 2.2)));

function build(spec: Spec): Candidate[] {
  const out: Candidate[] = [];
  const usedNames = new Set<string>();
  for (let i = 0; i < spec.count; i++) {
    const r = rng(hash(`${spec.roleId}-${i}`));
    let name = "";
    do name = `${pick(r, FIRST)} ${pick(r, LAST)}`;
    while (usedNames.has(name));
    usedNames.add(name);

    const q = Math.pow(r(), 0.85); // overall strength
    const lv: Record<string, number> = Object.fromEntries(spec.traits.map((t) => [t.key, lvl(r, q)]));
    const [ylo, yhi] = spec.yearsRange;
    const years = Math.max(ylo, Math.min(yhi, Math.round(ylo + (yhi - ylo) * (0.35 * q + 0.65 * r()))));
    const flags = Object.fromEntries(Object.entries(spec.flags).map(([k, p]) => [k, r() < p]));
    const ctx: Ctx = { r, lv, years, flags, name };

    // Work history — more jobs for job-hoppers.
    const jobsCount = Math.max(1, Math.min(6, Math.round(years / (flags.hopper ? 1.2 : 2.8))));
    const endYear = 2026;
    let cursor = endYear;
    const exp: Experience[] = [];
    const used = new Set<string>();
    const companies = [...spec.companies];
    for (let j = 0; j < jobsCount; j++) {
      const span = j === jobsCount - 1 ? Math.max(1, years - (endYear - cursor)) : Math.max(1, Math.round(years / jobsCount + (r() - 0.5) * 1.5));
      const start = Math.max(endYear - years, cursor - span);
      let company: Company;
      if (j === 0 && flags.bigtech) company = pick(r, companies.filter((c) => c.bigTech)) ?? pick(r, companies);
      else if (flags.startup && j === Math.min(1, jobsCount - 1)) company = pick(r, companies.filter((c) => c.startup)) ?? pick(r, companies);
      else company = pick(r, companies.filter((c) => !c.bigTech || flags.bigtech));
      companies.splice(companies.indexOf(company), 1);
      const seniorityDrop = j === 0 ? 0 : 1;
      const bullets: string[] = [];
      // Resumes lead with strengths: order traits by level, with a little noise.
      const traitOrder = spec.traits
        .filter((t) => t.key !== "communication")
        .map((t) => ({ t, k: lv[t.key] + r() * 1.6 }))
        .sort((a, b) => b.k - a.k)
        .map((x) => x.t);
      for (const t of traitOrder) {
        if (bullets.length >= (j === 0 ? 4 : 3)) break;
        const L = Math.max(0, lv[t.key] - seniorityDrop);
        const pool = (t.bullets[L] ?? []).filter((b) => !used.has(b));
        if (!pool.length) continue;
        const tpl = pick(r, pool);
        used.add(tpl);
        bullets.push(fill(r, tpl, { company: company.name }));
      }
      const vague = spec.traits.find((t) => t.key === "communication")?.bullets[lv.communication] ?? [];
      if (vague.length) bullets.push(pick(r, vague));
      if (lv.communication !== undefined && lv.communication <= 1)
        for (let b = 0; b < bullets.length; b++) bullets[b] = bullets[b].replace(/,? ?(cutting|reducing|improving|achieving|by) [^,.;]*\d+%[^,.;]*/i, "");
      const yearsAgo = endYear - cursor;
      exp.push({
        title: spec.title(years - yearsAgo, ctx),
        company: company.name,
        industry: company.industry,
        location: company.city ?? pick(r, spec.locations),
        period: `${start} – ${j === 0 ? "Present" : cursor}`,
        bullets,
      });
      cursor = start;
      if (cursor <= endYear - years) break;
    }

    const skills = Array.from(new Set(spec.traits.flatMap((t) => (t.skills[lv[t.key]] ?? []).slice(0, 4))));
    const extras = spec.extras(ctx);
    const summary = spec.summary(ctx);
    const education = spec.education(ctx);
    const location = flags.canadaLocated ? pick(r, ["Toronto, Canada", "Montréal, Canada", "Waterloo, Canada", "Vancouver, Canada"]) : pick(r, spec.locations);
    const noticeDays = pick(r, [0, 15, 30, 30, 60, 60, 90, 90]);
    if (spec.roleId !== "ml-research") extras.push(`Notice period: ${noticeDays === 0 ? "immediate joiner" : `${noticeDays} days`}`);

    const c: Candidate = {
      id: `${spec.roleId}-${String(i + 1).padStart(3, "0")}`,
      roleId: spec.roleId,
      name,
      hue: int(r, 0, 359),
      title: exp[0].title,
      company: exp[0].company,
      location,
      years,
      email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@mail.example`,
      source: pick(r, ["LinkedIn", "Referral", "Careers page", "Naukri", "Wellfound", "LinkedIn", "Referral"]),
      appliedDaysAgo: int(r, 0, 21),
      noticeDays,
      summary,
      experience: exp,
      education,
      skills,
      extras,
      resume: "",
    };
    c.resume = toText(c);
    out.push(c);
  }
  return out;
}

function toText(c: Candidate) {
  return [
    `${c.name}`,
    `${c.title} · ${c.location} · ${c.email}`,
    ``,
    `SUMMARY`,
    c.summary,
    ``,
    `EXPERIENCE`,
    ...c.experience.flatMap((e) => [`${e.title}, ${e.company} (${e.industry}) — ${e.location} — ${e.period}`, ...e.bullets.map((b) => `• ${b}`), ``]),
    `EDUCATION`,
    ...c.education.map((e) => `• ${e}`),
    ``,
    `SKILLS`,
    c.skills.join(", "),
    ...(c.extras.length ? [``, `ADDITIONAL`, ...c.extras.map((e) => `• ${e}`)] : []),
  ].join("\n");
}

/* ───────────────────────── Backend (Java) ───────────────────────── */

const BACKEND: Spec = {
  roleId: "backend-java",
  count: 40,
  yearsRange: [1, 16],
  flags: { startup: 0.35, oss: 0.22, bigtech: 0.16, hopper: 0.18, canadaResearch: 0.13, remote: 0.3, kafkaExtra: 0.3 },
  locations: ["Bengaluru", "Hyderabad", "Pune", "Chennai", "Gurugram", "Mumbai", "Noida", "Kochi", "Ahmedabad"],
  companies: [
    { name: "Razorpay", industry: "Fintech" }, { name: "PhonePe", industry: "Fintech" }, { name: "Paysphere", industry: "Fintech", startup: true },
    { name: "Ledgerly", industry: "Fintech", startup: true }, { name: "Zerodha", industry: "Fintech" }, { name: "Credora", industry: "Fintech", startup: true },
    { name: "Flipkart", industry: "E-commerce" }, { name: "Swiggy", industry: "E-commerce" }, { name: "Meesho", industry: "E-commerce" },
    { name: "Kartwise", industry: "E-commerce", startup: true }, { name: "Freshworks", industry: "SaaS" }, { name: "Zoho", industry: "SaaS" },
    { name: "Stackhive", industry: "SaaS", startup: true }, { name: "Workloop", industry: "SaaS", startup: true }, { name: "Atlassian", industry: "SaaS" },
    { name: "Infosys", industry: "IT services" }, { name: "TCS", industry: "IT services" }, { name: "Wipro", industry: "IT services" },
    { name: "Cognizant", industry: "IT services" }, { name: "Medivault", industry: "Healthcare", startup: true }, { name: "Practo", industry: "Healthcare" },
    { name: "Amazon", industry: "Big tech", bigTech: true }, { name: "Microsoft", industry: "Big tech", bigTech: true },
    { name: "Google", industry: "Big tech", bigTech: true }, { name: "Uber", industry: "Big tech", bigTech: true },
  ],
  traits: [
    {
      key: "java",
      bullets: [
        ["Built backend services primarily in Python (Django, FastAPI)", "Developed Node.js/TypeScript APIs for a customer portal", "Wrote Go services for log ingestion"],
        ["Completed academic projects in Java; day-to-day work in Python", "Familiar with core Java from coursework; production work in Node.js"],
        ["Developed REST APIs in Java and Spring MVC for internal dashboards", "Fixed defects and added features in a legacy Java EE monolith", "Maintained Java batch jobs scheduled with Quartz"],
        ["Built and owned {m} Java/Spring Boot microservices for order and settlement workflows", "Implemented Hibernate/JPA data layers on PostgreSQL with optimistic locking", "Wrote JUnit 5 and Testcontainers suites, raising coverage to {p}%"],
        ["Led migration of {n} Spring Boot services from Java 8 to Java 21, cutting p99 latency by {p}%", "Tuned G1/ZGC garbage collection and JVM flags for a {N}k RPS payments API", "Authored an internal Java resilience library (idempotent retries, circuit breakers) adopted by {m} teams", "Adopted virtual threads and structured concurrency across the Java service fleet, improving throughput by {p}%"],
      ],
      skills: [["Python", "Node.js", "Go"], ["Java (academic)", "Python"], ["Java", "Spring MVC", "MySQL"], ["Java 17", "Spring Boot", "Hibernate", "JUnit"], ["Java 21", "Spring Boot", "JVM tuning", "Reactor"]],
    },
    {
      key: "distsys",
      bullets: [
        [],
        ["Built CRUD services on a single MySQL instance"],
        ["Used RabbitMQ for asynchronous job processing", "Integrated third-party APIs with retries and timeouts"],
        ["Built Kafka consumers and an outbox pattern for reliable cross-service messaging", "Introduced a Redis caching layer, reducing database load by {p}%", "Moved synchronous REST calls to gRPC between {m} services"],
        ["Designed an event-driven architecture on Kafka processing {N}M events/day with exactly-once semantics", "Led zero-downtime sharding of a {n}TB PostgreSQL cluster", "Designed multi-region active-active failover reaching 99.99% availability"],
      ],
      skills: [[], ["MySQL"], ["RabbitMQ", "REST"], ["Kafka", "Redis", "gRPC"], ["Kafka Streams", "Cassandra", "Consensus (Raft)"]],
    },
    {
      key: "cloud",
      bullets: [
        ["Deployed applications to on-premise servers via manual release process"],
        ["Basic familiarity with Docker for local development"],
        ["Deployed services to AWS EC2 using Jenkins pipelines", "Set up CloudWatch alarms for core APIs"],
        ["Containerised services with Docker and deployed them on Kubernetes", "Built CI/CD in GitHub Actions with blue-green deployments", "Managed AWS infrastructure (VPC, RDS, SQS) with Terraform"],
        ["Owned the EKS platform running {n}0+ services; wrote Helm charts and ArgoCD pipelines", "Reduced AWS spend by {p}% through rightsizing and a Graviton migration", "Built an internal developer platform that cut service bootstrap time from days to {m} hours"],
      ],
      skills: [["Linux"], ["Docker"], ["AWS EC2", "Jenkins"], ["Kubernetes", "Terraform", "GitHub Actions"], ["EKS", "Helm", "ArgoCD", "Observability"]],
    },
    {
      key: "leadership",
      bullets: [[], [], ["Mentored {m} interns through their summer projects", "Ran sprint demos for the team"], ["Tech lead for a squad of {m} engineers; ran design reviews and on-call", "Drove the RFC process for the payments squad"], ["Managed a team of {n} engineers; ran hiring loops and quarterly planning", "Mentored {m} engineers to promotion and built the team's career ladder"]],
      skills: [[], [], [], ["Tech leadership"], ["People management", "Hiring"]],
    },
    {
      key: "communication",
      bullets: [["Responsible for various backend tasks as assigned"], ["Worked on many modules and handled responsibilities"], [], [], []],
      skills: [[], [], [], [], []],
    },
  ],
  title: (y) =>
    y < 3 ? "Software Engineer" : y < 6 ? "Software Engineer II" : y < 9 ? "Senior Software Engineer" : y < 12 ? "Staff Engineer" : "Principal Engineer",
  education: ({ r, years }) => {
    const college = pick(r, ["IIT Bombay", "IIT Madras", "NIT Trichy", "BITS Pilani", "IIIT Hyderabad", "VIT Vellore", "Anna University", "Pune University", "RV College of Engineering", "Manipal Institute of Technology", "Jadavpur University"]);
    const grad = 2026 - years - 1;
    const out = [`B.Tech, Computer Science — ${college}, ${grad}`];
    if (r() < 0.18) out.unshift(`M.Tech, Computer Science — ${pick(r, ["IISc Bengaluru", "IIT Delhi", "IIT Kharagpur"])}, ${grad + 2}`);
    return out;
  },
  extras: ({ r, flags, lv }) => {
    const out: string[] = [];
    if (flags.oss) out.push(pick(r, ["Maintainer of an open-source Java rate-limiting library on GitHub (1.2k stars)", "Contributor to Apache Kafka (consumer group rebalancing fixes)", "Contributor to Spring Framework and Micrometer", "Open-source contributor to Resilience4j"]));
    if (flags.canadaResearch) out.push(pick(r, ["Research assistant, Distributed Systems Lab, University of Waterloo (Canada), 2 years", "Visiting researcher at the University of Toronto systems group, working on consensus protocols for 18 months", "Graduate research on stream processing at McGill University, Montréal"]));
    if (flags.remote) out.push("Worked fully remote with a team spread across 5 time zones");
    if (flags.kafkaExtra && lv.distsys >= 3) out.push("Confluent Certified Developer for Apache Kafka");
    if (lv.cloud >= 4 && r() < 0.6) out.push("AWS Certified Solutions Architect – Professional; Certified Kubernetes Administrator (CKA)");
    if (r() < 0.25) out.push(pick(r, ["Winner, Smart India Hackathon", "Speaker at a regional Java user group meetup", "Ranked top 1% on LeetCode contests"]));
    out.push(`Languages: English, ${pick(r, ["Hindi", "Kannada", "Tamil", "Telugu", "Marathi", "Malayalam", "Bengali"])}`);
    return out;
  },
  summary: ({ r, lv, years }) => {
    if (lv.communication <= 1) return pick(r, ["Hard working and sincere engineer looking for a good opportunity in a reputed company.", "Software developer with experience in many technologies. Quick learner and team player.", "Seeking a challenging role where I can utilise my skills for growth of organisation."]);
    const core = lv.java >= 3 ? "Java/Spring backend engineer" : lv.java >= 2 ? "Backend engineer with Java exposure" : "Backend engineer (Python/Go)";
    const dist = lv.distsys >= 3 ? " building event-driven, high-throughput systems" : "";
    return `${core} with ${years} year${years === 1 ? "" : "s"} of experience${dist}. ${lv.leadership >= 3 ? "Leads teams through design, delivery and on-call. " : ""}${lv.communication >= 3 ? "Focused on measurable reliability and latency wins." : ""}`.trim();
  },
};

/* ───────────────────────── ML research (Toronto) ───────────────────────── */

const ML: Spec = {
  roleId: "ml-research",
  count: 24,
  yearsRange: [0, 14],
  flags: { phd: 0.5, canada: 0.45, canadaLocated: 0.35, llm: 0.55, rl: 0.25, industryLab: 0.35, teaching: 0.4 },
  locations: ["Toronto, Canada", "Bengaluru", "San Francisco", "London", "Montréal, Canada", "Seattle", "Zurich", "Singapore"],
  companies: [
    { name: "Vector Institute", industry: "Research institute", city: "Toronto, Canada" }, { name: "Mila", industry: "Research institute", city: "Montréal, Canada" },
    { name: "Cohere", industry: "AI startup", startup: true, city: "Toronto, Canada" }, { name: "Google DeepMind", industry: "Industry lab", bigTech: true, city: "London" },
    { name: "Microsoft Research", industry: "Industry lab", bigTech: true }, { name: "Meta FAIR", industry: "Industry lab", bigTech: true },
    { name: "Shopify", industry: "E-commerce", city: "Ottawa, Canada" }, { name: "Layer 6 AI", industry: "Fintech", city: "Toronto, Canada" },
    { name: "Sarvam AI", industry: "AI startup", startup: true, city: "Bengaluru" }, { name: "Flipkart", industry: "E-commerce", city: "Bengaluru" },
    { name: "Amii", industry: "Research institute", city: "Edmonton, Canada" }, { name: "Uber AI", industry: "Big tech", bigTech: true },
    { name: "Nimbus Analytics", industry: "SaaS", startup: true }, { name: "Infosys", industry: "IT services" }, { name: "Element AI", industry: "AI startup", startup: true, city: "Montréal, Canada" },
  ],
  traits: [
    {
      key: "research",
      bullets: [[], ["Completed a master's thesis on image classification", "Reproduced published baselines for course projects"], ["Published {m} workshop papers on efficient fine-tuning", "Co-authored a paper at a regional ML conference"], ["Published {m} papers at main conferences (NeurIPS, ICLR) on representation learning", "Reviewer for ICML and NeurIPS"], ["First author of {n} papers at NeurIPS, ICML and ACL with {N}0+ citations", "Led a research agenda on scaling laws adopted across the lab"]],
      skills: [[], ["Literature review"], ["Paper writing"], ["Peer review"], ["Research leadership"]],
    },
    {
      key: "dl",
      bullets: [["Built dashboards and SQL reports for business teams"], ["Trained scikit-learn models for churn prediction"], ["Fine-tuned BERT models in PyTorch for text classification"], ["Trained transformer models on multi-node GPU clusters with PyTorch FSDP", "Implemented custom CUDA kernels for attention"], ["Pre-trained a {n}B-parameter language model on 2T tokens with JAX on TPU pods", "Designed mixture-of-experts architectures improving quality per FLOP by {p}%"]],
      skills: [["SQL", "Tableau"], ["scikit-learn", "pandas"], ["PyTorch", "Hugging Face"], ["PyTorch FSDP", "CUDA", "Transformers"], ["JAX", "TPU", "MoE", "Distributed training"]],
    },
    {
      key: "prodml",
      bullets: [[], ["Shared notebooks with engineering for deployment"], ["Deployed a model behind a Flask API"], ["Shipped models to production with feature stores and online monitoring", "Built offline/online evaluation pipelines"], ["Owned the inference platform serving {N}M requests/day with vLLM and Triton", "Cut serving cost by {p}% with quantisation and speculative decoding"]],
      skills: [[], ["Jupyter"], ["Flask", "Docker"], ["MLflow", "Feature store"], ["vLLM", "Triton", "Kubernetes"]],
    },
    {
      key: "math",
      bullets: [[], [], ["Applied Bayesian A/B testing to model launches"], ["Derived variance-reduction estimators for off-policy evaluation"], ["Proved convergence guarantees for a new optimiser (published)"]],
      skills: [["Statistics"], ["Linear algebra"], ["Probability"], ["Optimisation", "Bayesian inference"], ["Learning theory", "Convex optimisation"]],
    },
    { key: "communication", bullets: [["Did many ML tasks"], ["Worked on AI projects"], [], [], []], skills: [[], [], [], [], []] },
  ],
  title: (y, { flags }) => (y < 2 ? (flags.phd ? "Postdoctoral Fellow" : "ML Engineer") : y < 5 ? "Research Scientist" : y < 9 ? "Senior Research Scientist" : "Staff Research Scientist"),
  education: ({ r, flags, years }) => {
    const grad = 2026 - years;
    const canadian = ["University of Toronto", "University of Waterloo", "McGill University", "Université de Montréal", "University of British Columbia", "University of Alberta"];
    const other = ["IIT Bombay", "IISc Bengaluru", "Stanford University", "ETH Zürich", "Tsinghua University", "University of Cambridge", "IIIT Hyderabad"];
    const where = () => (flags.canada ? pick(r, canadian) : pick(r, other));
    const out: string[] = [];
    if (flags.phd) out.push(`PhD, Computer Science (Machine Learning) — ${where()}, ${grad}`);
    else if (r() < 0.3) out.push(`PhD candidate, Computer Science — ${where()} (expected ${2027 + int(r, 0, 1)})`);
    out.push(`M.Sc., ${pick(r, ["Computer Science", "Statistics", "Applied Mathematics"])} — ${where()}, ${grad - (flags.phd ? 4 : 0)}`);
    out.push(`B.Tech / B.Sc. — ${pick(r, other)}, ${grad - (flags.phd ? 6 : 2)}`);
    return out;
  },
  extras: ({ r, flags }) => {
    const out: string[] = [];
    if (flags.llm) out.push(pick(r, ["Research focus: instruction tuning and RLHF for large language models", "Built multilingual LLM evaluation suites covering 12 Indic languages", "Work on retrieval-augmented generation and long-context LLMs"]));
    if (flags.rl) out.push(pick(r, ["Reinforcement learning for robotics manipulation (sim-to-real)", "Developed offline RL methods for recommendation"]));
    if (flags.teaching) out.push(pick(r, ["Teaching assistant for graduate Deep Learning (3 terms)", "Mentored 6 undergraduate research interns", "Co-instructor for a summer school on NLP"]));
    if (flags.industryLab) out.push("Research internship at an industry AI lab");
    out.push(`Work authorisation: ${flags.canadaLocated ? "Canadian permanent resident" : pick(r, ["Requires sponsorship", "Open work permit (Canada)", "Requires sponsorship"])}`);
    return out;
  },
  summary: ({ r, lv, flags }) => {
    if (lv.communication <= 1) return pick(r, ["Passionate about AI and ML. Looking for opportunity to work on interesting problems.", "AI enthusiast with knowledge of many algorithms and tools."]);
    return `${lv.research >= 3 ? "Research scientist" : "ML practitioner"} working on ${flags.llm ? "large language models" : flags.rl ? "reinforcement learning" : "representation learning"}${lv.prodml >= 3 ? ", with a track record of shipping models to production" : ""}. ${lv.communication >= 3 ? "Bridges rigorous research and measurable product impact." : ""}`.trim();
  },
};

/* ───────────────────────── Product design ───────────────────────── */

const DESIGN: Spec = {
  roleId: "product-design",
  count: 16,
  yearsRange: [1, 14],
  flags: { b2b: 0.5, portfolio: 0.7, a11y: 0.3, dataviz: 0.3, mobile: 0.45, speaker: 0.15, remote: 0.4 },
  locations: ["Bengaluru", "Mumbai", "Pune", "Delhi NCR", "Hyderabad", "Remote", "Chennai", "Goa"],
  companies: [
    { name: "Freshworks", industry: "B2B SaaS" }, { name: "Zoho", industry: "B2B SaaS" }, { name: "Postman", industry: "B2B SaaS" }, { name: "Chargebee", industry: "B2B SaaS" },
    { name: "BrowserStack", industry: "B2B SaaS" }, { name: "CRED", industry: "Fintech" }, { name: "Swiggy", industry: "Consumer" }, { name: "Zomato", industry: "Consumer" },
    { name: "Myntra", industry: "E-commerce" }, { name: "Pixelwell Studio", industry: "Design agency", startup: true }, { name: "Lumen Labs", industry: "B2B SaaS", startup: true },
    { name: "Canvasly", industry: "Consumer", startup: true }, { name: "Microsoft", industry: "Big tech", bigTech: true }, { name: "Atlassian", industry: "B2B SaaS" },
  ],
  traits: [
    { key: "visual", bullets: [["Created social media creatives and banners"], ["Designed marketing landing pages"], ["Designed app screens following an existing style guide"], ["Redesigned the core product UI, lifting task completion by {p}%", "Defined iconography and illustration style for the product"], ["Led the visual redesign of a flagship app used by {N}k people; featured on Awwwards", "Set the visual language for a full rebrand across web, iOS and Android"]], skills: [["Canva"], ["Photoshop"], ["Figma"], ["Figma", "Typography"], ["Art direction", "Typography", "Illustration"]] },
    { key: "research", bullets: [[], ["Collected feedback through informal surveys"], ["Ran usability tests with {m} participants per sprint"], ["Planned and ran contextual inquiries and diary studies with {n} enterprise customers", "Built a research repository in Dovetail"], ["Established the research practice: {n}0+ interviews per quarter feeding the roadmap"]], skills: [[], ["Surveys"], ["Usability testing"], ["Contextual inquiry", "Dovetail"], ["Research ops", "Mixed methods"]] },
    { key: "systems", bullets: [[], ["Reused components from a UI kit"], ["Contributed components to the team's Figma library"], ["Built and documented a design system of {n}0+ components with tokens", "Partnered with engineers on a React component library"], ["Led the multi-brand design system adopted by {m} product lines; ran the governance council"]], skills: [[], ["UI kits"], ["Figma libraries"], ["Design tokens", "Storybook"], ["Design systems leadership"]] },
    { key: "prototyping", bullets: [[], ["Shared static mockups with developers"], ["Built clickable prototypes in Figma"], ["Prototyped micro-interactions in Principle and ProtoPie"], ["Built coded prototypes in SwiftUI and Framer with production-grade motion"]], skills: [[], ["Static mockups"], ["Figma prototyping"], ["ProtoPie", "After Effects"], ["Framer", "SwiftUI", "Rive"]] },
    { key: "collab", bullets: [[], ["Worked on tasks given by the product manager"], ["Collaborated with PMs and engineers in sprint rituals"], ["Partnered with PM and engineering leads to shape quarterly roadmaps"], ["Influenced exec strategy; co-owned product OKRs with the VP of Product"]], skills: [[], [], ["Agile"], ["Roadmapping"], ["Strategy", "Facilitation"]] },
    { key: "communication", bullets: [["Did designs for many projects"], ["Responsible for UI/UX"], [], [], []], skills: [[], [], [], [], []] },
  ],
  title: (y) => (y < 3 ? "Product Designer" : y < 6 ? "Product Designer II" : y < 9 ? "Senior Product Designer" : y < 12 ? "Lead Product Designer" : "Principal Designer"),
  education: ({ r, years }) => [`${pick(r, ["B.Des, Interaction Design — NID Ahmedabad", "B.Des — IIT Bombay (IDC)", "B.Des — Srishti Manipal", "B.Tech — VIT Vellore", "BFA — Sir J.J. School of Art", "M.Des — IDC IIT Bombay", "B.Des — NIFT Delhi"])}, ${2026 - years - 1}`],
  extras: ({ r, flags, name }) => {
    const out: string[] = [];
    if (flags.portfolio) out.push(`Portfolio: ${name.split(" ")[0].toLowerCase()}.design`);
    if (flags.a11y) out.push("Led a WCAG 2.2 AA accessibility audit and remediation programme");
    if (flags.dataviz) out.push("Designed analytics dashboards and data visualisations for enterprise reporting");
    if (flags.mobile) out.push("Shipped native iOS and Android apps end to end");
    if (flags.speaker) out.push(pick(r, ["Speaker at Config India and UX India", "Speaker at a regional design meetup on design systems"]));
    if (flags.remote) out.push("Comfortable working remote-first with async documentation");
    return out;
  },
  summary: ({ r, lv, flags }) => {
    if (lv.communication <= 1) return pick(r, ["Creative designer passionate about design. Looking for exciting opportunity.", "UI/UX designer with good knowledge of tools."]);
    const focus = [flags.b2b && "complex B2B workflows", lv.systems >= 3 && "scalable design systems", lv.visual >= 3 && "polished visual craft"].filter(Boolean);
    return `Product designer${focus.length ? ` focused on ${focus.join(" and ")}` : ""}. ${lv.research >= 3 ? "Grounds decisions in research. " : ""}${lv.communication >= 3 ? "Measures success in shipped outcomes." : ""}`.trim();
  },
};

export const CANDIDATES: Candidate[] = [...build(BACKEND), ...build(ML), ...build(DESIGN)];
export const CANDIDATE_BY_ID: Record<string, Candidate> = Object.fromEntries(CANDIDATES.map((c) => [c.id, c]));
export const candidatesFor = (roleId: string) => CANDIDATES.filter((c) => c.roleId === roleId);
