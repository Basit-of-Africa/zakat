/**
 * The research the app points to. Each entry says what it found in a sentence
 * that the source itself supports; nothing here is paraphrased into a stronger
 * claim than the paper makes. Checked November 2026.
 */
export interface Source {
  readonly publisher: string;
  /** Omitted where it could not be confirmed. */
  readonly year?: number;
  readonly title: string;
  readonly finding: string;
  readonly url: string;
}

/** Islamic Development Bank research on zakat and poverty. */
export const RESEARCH: readonly Source[] = [
  {
    publisher: "IsDB Institute (IRTI)",
    year: 2004,
    title: "Role of Zakah and Awqaf in Poverty Alleviation",
    finding: "Commissioned by the IsDB's Board, it studies zakat and waqf institutions in Malaysia, Pakistan and South Africa, and how they can be organised to reduce poverty.",
    url: "https://isdbinstitute.org/product/role-of-zakah-and-awqaf-in-poverty-alleviation/",
  },
  {
    publisher: "IRTI",
    year: 2016,
    title: "Zakah for Poverty Alleviation: Evidence from Sudan",
    finding: "A working paper on Sudan's state zakat system, one of the few with decades of records, and what it has done for the poor.",
    url: "https://irti.org/product/zakah-for-poverty-alleviation-evidence-from-sudan/",
  },
  {
    publisher: "IsDB Institute",
    year: 2017,
    title: "Practical Means of Integrating Zakāt and Waqf into the Poverty Reduction Agenda of OIC Member Countries",
    finding: "Recommends bringing zakat and waqf into the formal poverty-reduction plans of OIC member countries.",
    url: "https://isdbinstitute.org/product/practical-means-of-integrating-zakat-and-waqf-into-the-poverty-reduction-agenda-of-oic-member-countries/",
  },
];

/** How large is zakat? The honest answer is a range, with its sources. */
export const SCALE: readonly Source[] = [
  {
    publisher: "Global Humanitarian Assistance",
    year: 2015,
    title: "An Act of Faith: Humanitarian financing and zakat",
    finding: "No reliable figure exists. Formal collection is at least in the tens of billions of US dollars a year; informal giving could take the total into the hundreds of billions.",
    url: "https://library.alnap.org/node/55544",
  },
  {
    publisher: "UNHCR and DinarStandard",
    year: 2019,
    title: "Refugee Zakat Fund launch report",
    finding: "Estimates the zakat given worldwide at about US$76 billion a year.",
    url: "https://www.dinarstandard.com/amp/unhcr-zakat-program-2019-launch-report",
  },
  {
    publisher: "Effective Altruism Forum",
    title: "On estimates of how much zakat there is",
    finding: "The widely quoted $500 billion to $1 trillion range has no substantiated origin; a rough check gives $80 billion to $800 billion.",
    url: "https://forum.effectivealtruism.org/posts/fQfzafDceM8yTcKGB/on-estimates-of-how-much-zakat-there-is",
  },
];

/** Nigeria, where most of the app's users are. */
export const NIGERIA: readonly Source[] = [
  {
    publisher: "Muslim News Nigeria",
    year: 2025,
    title: "Five leading zakat agencies disbursed ₦736m to 4,243 beneficiaries in 2024",
    finding: "A press analysis of five agencies' disbursements in 2024. An estimate from public reports, not official accounts.",
    url: "https://muslimnews.com.ng/2025/01/06/data-shows-five-leading-zakat-agencies-disbursed-n736m-to-4243-beneficiaries-in-2024",
  },
  {
    publisher: "International Journal of Islamic Finance (Emerald)",
    title: "An empirical study of the challenges facing zakat and waqf institutions in Northern Nigeria",
    finding: "Studies the institutional problems state zakat and waqf bodies in Northern Nigeria face in collecting and distributing.",
    url: "https://emerald.com/insight/content/doi/10.1108/IJIF-04-2018-0044/full/html",
  },
];
