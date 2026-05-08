import type {
  DecisionMaker,
  DraftQualityScore,
  FitScore,
  IcpConfig,
  OutreachDraft,
  ProspectCompany,
  ResearchEvidence,
  WebSearchResult,
} from '../schemas/outreach';

const INDUSTRIAL_TERMS = [
  'industrial',
  'machinery',
  'manufacturing',
  'equipment',
  'tooling',
  'component',
  'automation',
  'fabrication',
  'engineered',
];

const DISQUALIFIER_TERMS = [
  'university',
  'college',
  'school',
  'nonprofit',
  'non-profit',
  'charity',
  'consumer',
  'retail',
];

export function normalizeDomain(input: string): string {
  const withProtocol = input.startsWith('http://') || input.startsWith('https://') ? input : `https://${input}`;

  try {
    return new URL(withProtocol).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return input
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
      .toLowerCase();
  }
}

export function uniqueByDomain(companies: ProspectCompany[]): ProspectCompany[] {
  const seen = new Set<string>();
  return companies.filter(company => {
    const domain = normalizeDomain(company.domain || company.website);
    if (seen.has(domain)) return false;
    seen.add(domain);
    return true;
  });
}

export function extractCompaniesFromSearchResults(results: WebSearchResult[], limit: number): ProspectCompany[] {
  const companies = results
    .filter(result => !/linkedin\.com|facebook\.com|instagram\.com|youtube\.com|wikipedia\.org/i.test(result.url))
    .map(result => {
      const domain = normalizeDomain(result.url);
      const name = cleanCompanyName(result.title, domain);
      return {
        name,
        domain,
        website: `https://${domain}`,
        location: inferLocation(`${result.title} ${result.snippet}`),
        industry: inferIndustry(`${result.title} ${result.snippet}`),
        sourceUrls: [result.url],
      };
    });

  return uniqueByDomain(companies).slice(0, limit);
}

export function extractPageText(html: string, maxLength = 12_000): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function buildResearchEvidence(company: ProspectCompany, pageText: string, searchSnippets: string[] = []): ResearchEvidence {
  const combined = `${pageText} ${searchSnippets.join(' ')}`;
  const lower = combined.toLowerCase();
  const evidenceUrls = [...new Set(company.sourceUrls.length > 0 ? company.sourceUrls : [company.website])];
  const websiteObservations = [
    hasAny(lower, ['request a quote', 'contact us', 'get a quote'])
      ? 'Website has a basic sales/contact path.'
      : 'Website does not show an obvious quote or conversion path in fetched copy.',
    hasAny(lower, ['case study', 'case studies', 'success story'])
      ? 'Website includes case study or proof language.'
      : 'Fetched copy did not surface case studies or proof-of-process content.',
  ];

  return {
    company,
    websiteObservations,
    ctaQuality: hasAny(lower, ['request a quote', 'get a quote', 'schedule', 'contact sales'])
      ? 'strong'
      : hasAny(lower, ['contact us', 'contact'])
        ? 'weak'
        : 'missing',
    caseStudyPresence: hasAny(lower, ['case study', 'case studies', 'success story']) ? 'present' : 'absent',
    tradeShowSignals: pickSignals(combined, ['trade show', 'expo', 'conference', 'booth', 'exhibitor']),
    linkedInContentSignals: pickSignals(combined, ['linkedin', 'post', 'company update']),
    hiringSignals: pickSignals(combined, ['hiring', 'careers', 'sales manager', 'marketing coordinator']),
    acquisitionOrRebrandSignals: pickSignals(combined, ['acquired', 'acquisition', 'rebrand', 'new brand', 'portfolio company']),
    evidenceUrls,
    confidence: Math.min(0.95, 0.45 + evidenceUrls.length * 0.1 + websiteObservations.length * 0.05),
    summary: `${company.name} appears to be ${company.industry || 'an industrial company'} with public website evidence available for review.`,
  };
}

export function scoreCompanyFit(evidence: ResearchEvidence, icpConfig: IcpConfig): FitScore {
  const company = evidence.company;
  const text = `${company.name} ${company.industry} ${company.location} ${evidence.summary} ${evidence.websiteObservations.join(' ')}`.toLowerCase();
  const disqualifierHits = [
    ...icpConfig.disqualifiers.filter(disqualifier => text.includes(disqualifier.toLowerCase())),
    ...DISQUALIFIER_TERMS.filter(term => text.includes(term)),
  ];

  if (company.employeeEstimate !== undefined && company.employeeEstimate < 50) {
    disqualifierHits.push('under 50 employees');
  }

  let score = 0;
  const reasons: string[] = [];
  const missingData: string[] = [];

  if (hasAny(text, INDUSTRIAL_TERMS) || icpConfig.industries.some(industry => text.includes(industry.toLowerCase()))) {
    score += 25;
    reasons.push('Matches industrial manufacturing category.');
  } else {
    missingData.push('industrial category confidence');
  }

  if (company.employeeEstimate) {
    if (company.employeeEstimate >= icpConfig.employeeRange.min && company.employeeEstimate <= icpConfig.employeeRange.max) {
      score += 20;
      reasons.push('Employee estimate fits the 201-500 ICP range.');
    } else if (company.employeeEstimate >= 50) {
      score += 10;
      reasons.push('Employee estimate is above the minimum disqualifier threshold.');
    }
  } else {
    score += 8;
    missingData.push('employee estimate');
  }

  if (icpConfig.geos.some(geo => company.location.toLowerCase().includes(geo.toLowerCase()))) {
    score += 15;
    reasons.push('Company is in a priority geography.');
  } else if (/tx|oh|nc|sc|co|texas|ohio|carolina|colorado/i.test(company.location)) {
    score += 8;
    reasons.push('Company is in a priority state/region.');
  } else {
    missingData.push('priority geography match');
  }

  if (evidence.ctaQuality === 'weak' || evidence.ctaQuality === 'missing') {
    score += 15;
    reasons.push('Website conversion path appears weak or missing.');
  }

  if (evidence.caseStudyPresence === 'absent') {
    score += 10;
    reasons.push('Fetched copy did not surface case studies or process proof.');
  }

  if (evidence.tradeShowSignals.length > 0 || evidence.hiringSignals.length > 0 || evidence.acquisitionOrRebrandSignals.length > 0) {
    score += 15;
    reasons.push('Public signals suggest active go-to-market motion or change.');
  }

  if (disqualifierHits.length > 0) {
    return {
      totalScore: 0,
      tier: 'Reject',
      reasons,
      disqualifierHits: [...new Set(disqualifierHits)],
      missingData,
    };
  }

  const totalScore = Math.min(100, score);
  return {
    totalScore,
    tier: totalScore >= 85 ? 'A' : totalScore >= 75 ? 'B' : totalScore >= 55 ? 'C' : 'Reject',
    reasons,
    disqualifierHits: [],
    missingData,
  };
}

export function inferDecisionMaker(company: ProspectCompany, icpConfig: IcpConfig): DecisionMaker {
  const title = icpConfig.buyerTitles[0] || 'VP of Sales';
  return {
    title,
    inferredRole: 'decision-maker',
    confidence: company.sourceUrls.length > 0 ? 0.55 : 0.4,
  };
}

export function draftOutreach(company: ProspectCompany, evidence: ResearchEvidence, decisionMaker: DecisionMaker): OutreachDraft {
  const observation = evidence.websiteObservations[0] || 'your site has a lot of technical product depth';
  const secondObservation =
    evidence.caseStudyPresence === 'absent'
      ? 'I could not quickly find case studies or proof-of-process content'
      : 'there may be an opportunity to make proof and conversion paths easier for buyers to find';
  const cta = 'Worth me sending over a quick teardown of where your site may be leaking qualified industrial buyers?';
  const body = [
    `Hi ${decisionMaker.name || 'there'},`,
    '',
    `I was looking at ${company.name} and noticed ${sentenceCase(observation)} ${secondObservation}.`,
    '',
    'Scaler helps mid-market industrial manufacturers turn engineering expertise into a clearer website and marketing system that creates more consistent inbound lead flow beyond referrals and trade shows.',
    '',
    `I can send a short custom teardown with a few practical pipeline opportunities for ${company.name}. ${cta}`,
  ].join('\n');

  return {
    subjectLines: [`Quick teardown for ${company.name}`, `${company.name} pipeline audit idea`],
    openingPersonalization: observation,
    body,
    customTeardownBullets: [
      'Audit the homepage and product pages for buyer-specific conversion paths.',
      'Identify where technical differentiators can be translated into ROI-focused proof.',
      'Find missed CTA opportunities for quote requests, consultations, or spec reviews.',
    ],
    cta,
    riskNotes: evidence.evidenceUrls.length === 0 ? ['No source URLs were available; review before sending.'] : [],
    sourceBackedPersonalizationNotes: evidence.evidenceUrls,
  };
}

export function scoreOutreachDraft(draft: OutreachDraft, evidence: ResearchEvidence): DraftQualityScore {
  const issues: string[] = [];
  const wordCount = draft.body.split(/\s+/).filter(Boolean).length;
  const grounded = evidence.evidenceUrls.length > 0 && draft.sourceBackedPersonalizationNotes.length > 0;

  if (wordCount < 90 || wordCount > 140) issues.push('Email body should be 90-140 words.');
  if (!grounded) issues.push('Draft lacks source-backed personalization notes.');
  if ((draft.body.match(/\?/g) || []).length !== 1) issues.push('Draft should use one clear CTA question.');
  if (/guarantee|private analytics|internal pipeline|we met|as discussed/i.test(draft.body)) {
    issues.push('Draft contains unsupported or risky claims.');
  }

  const score = Math.max(0, 100 - issues.length * 20);
  return {
    score,
    grounded,
    wordCount,
    issues,
    recommendation: score >= 80 ? 'approve' : score >= 50 ? 'revise' : 'reject',
  };
}

function cleanCompanyName(title: string, domain: string): string {
  const cleaned = title
    .replace(/\s[-|].*$/, '')
    .replace(/\b(home|official site|website)\b/gi, '')
    .trim();
  return cleaned || domain.split('.')[0].replace(/-/g, ' ');
}

function inferLocation(text: string): string {
  const known = ['Houston', 'Dallas', 'Charlotte', 'Cleveland', 'Fort Worth', 'Texas', 'Ohio', 'Colorado', 'North Carolina', 'South Carolina'];
  return known.find(location => text.toLowerCase().includes(location.toLowerCase())) || 'Unknown';
}

function inferIndustry(text: string): string {
  return hasAny(text.toLowerCase(), INDUSTRIAL_TERMS) ? 'Industrial Machinery Manufacturing' : 'Unknown';
}

function hasAny(text: string, terms: string[]): boolean {
  return terms.some(term => text.includes(term.toLowerCase()));
}

function pickSignals(text: string, terms: string[]): string[] {
  const lower = text.toLowerCase();
  return terms.filter(term => lower.includes(term)).map(term => `Public copy mentions ${term}.`);
}

function sentenceCase(value: string): string {
  return value.length === 0 ? value : value[0].toLowerCase() + value.slice(1);
}
