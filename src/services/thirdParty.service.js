
const PROCESSORS = [
  { id: "analytics-01", name: "Acme Analytics", country: "SE", purposes: ["analytics"], dpa: true, safeguards: "EEA", compliant: true },
  { id: "email-01", name: "MailMagic", country: "US", purposes: ["transactional_email"], dpa: true, safeguards: "SCC", compliant: true },
  { id: "storage-01", name: "CloudBox", country: "RU", purposes: ["storage"], dpa: false, safeguards: null, compliant: false }
];

const SAFE_EEA_ISO = new Set(["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE","IS","LI","NO"]);

function isCountrySafe(country, safeguards) {
  if (SAFE_EEA_ISO.has(country)) return true;
  if (country === "GB") return true;
  if (country === "CH") return true;
  if (country === "US") return safeguards === "SCC" || safeguards === "BCR";
  return false;
}

function listProcessors() {
  return PROCESSORS.map(p => ({ id: p.id, name: p.name, country: p.country, purposes: p.purposes, compliant: p.compliant, safeguards: p.safeguards }));
}

function anonymize(data) {
  if (!data || typeof data !== "object") return data;
  const clone = { ...data };
  delete clone.email; delete clone.name; delete clone.phone; delete clone.ip; delete clone.address; delete clone.userId;
  return clone;
}

function evaluateTransfer(processorId, payload) {
  const proc = PROCESSORS.find(p => p.id === processorId);
  if (!proc) return { allowed: false, reason: "processor_not_found", data: null };
  const regionSafe = isCountrySafe(proc.country, proc.safeguards);
  if (!proc.compliant || !regionSafe) return { allowed: false, reason: "unsafe_region_or_non_compliant", data: anonymize(payload) };
  return { allowed: true, reason: "ok", data: payload };
}

function getProcessorDetails(processorId) {
  return PROCESSORS.find(p => p.id === processorId) || null;
}

function getProcessorsByPurpose(purpose) {
  return PROCESSORS.filter(p => p.purposes.includes(purpose));
}

function getComplianceReport() {
  const total = PROCESSORS.length;
  const compliant = PROCESSORS.filter(p => p.compliant && isCountrySafe(p.country, p.safeguards)).length;
  const nonCompliant = total - compliant;
  
  const byCountry = {};
  PROCESSORS.forEach(p => {
    byCountry[p.country] = (byCountry[p.country] || 0) + 1;
  });

  return {
    total,
    compliant,
    nonCompliant,
    complianceRate: Math.round((compliant / total) * 100),
    processorsByCountry: byCountry,
    safeguardTypes: PROCESSORS.map(p => ({ id: p.id, safeguard: p.safeguards }))
  };
}

export default { 
  listProcessors, 
  evaluateTransfer, 
  isCountrySafe, 
  anonymize,
  getProcessorDetails,
  getProcessorsByPurpose,
  getComplianceReport
};
