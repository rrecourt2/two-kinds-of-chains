// How three team structures scale (chapter 8). Every mandatory working
// relationship costs each side 2% of their time. Output is counted in
// "people's worth" of useful work.

export const LINK_COST = 0.02;
export const TEAM_SIZE = 6;
export const APPROVER_CAPACITY = 12; // one approver can sign off the work of about 12 people

export const STRUCTURES = [
  { id: 'mesh', label: 'Everyone depends on everyone' },
  { id: 'hub', label: 'Everything goes through one approver' },
  { id: 'teams', label: 'Small teams, clear interfaces' },
];

function teamSizes(people) {
  const teams = Math.ceil(people / TEAM_SIZE);
  const base = Math.floor(people / teams);
  const extra = people % teams;
  return Array.from({ length: teams }, (_, i) => base + (i < extra ? 1 : 0));
}

export function structure(kind, people) {
  if (kind === 'mesh') {
    const overhead = Math.min(1, LINK_COST * (people - 1));
    return { links: (people * (people - 1)) / 2, overhead, output: people * (1 - overhead), overloaded: false };
  }
  if (kind === 'hub') {
    if (people === 1) return { links: 0, overhead: 0, output: 1, overloaded: false };
    const makers = people - 1;
    const work = makers * (1 - LINK_COST);
    // The approver spends their time approving, plus 2% per relationship.
    const overhead = (makers * LINK_COST + 1) / people;
    return {
      links: makers,
      overhead,
      output: Math.min(work, APPROVER_CAPACITY),
      overloaded: work > APPROVER_CAPACITY,
    };
  }
  const sizes = teamSizes(people);
  const teams = sizes.length;
  let output = 0;
  let overheadSum = 0;
  let links = (teams * (teams - 1)) / 2;
  for (const s of sizes) {
    links += (s * (s - 1)) / 2;
    const member = LINK_COST * (s - 1);
    const lead = Math.min(1, member + LINK_COST * (teams - 1));
    output += (s - 1) * (1 - member) + (1 - lead);
    overheadSum += (s - 1) * member + lead;
  }
  return { links, overhead: overheadSum / people, output, overloaded: false, sizes };
}

export function outputCurve(kind, maxPeople = 60) {
  return Array.from({ length: maxPeople }, (_, i) => structure(kind, i + 1).output);
}
