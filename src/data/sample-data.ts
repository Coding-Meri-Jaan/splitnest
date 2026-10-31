import type {
  Balance,
  DashboardSummary,
  Expense,
  Group,
  Member,
} from "@/types";

export const currentUserId = "m-aarav";

export const members: Member[] = [
  {
    id: "m-aarav",
    name: "Aarav Sharma",
    email: "aarav@example.in",
    city: "Bengaluru",
  },
  {
    id: "m-priya",
    name: "Priya Nair",
    email: "priya@example.in",
    city: "Bengaluru",
  },
  {
    id: "m-rohan",
    name: "Rohan Mehta",
    email: "rohan@example.in",
    city: "Mumbai",
  },
  {
    id: "m-ananya",
    name: "Ananya Iyer",
    email: "ananya@example.in",
    city: "Chennai",
  },
  {
    id: "m-vikram",
    name: "Vikram Singh",
    email: "vikram@example.in",
    city: "Delhi",
  },
  {
    id: "m-meera",
    name: "Meera Reddy",
    email: "meera@example.in",
    city: "Hyderabad",
  },
];

export const groups: Group[] = [
  {
    id: "g-goa",
    name: "Goa Trip 2026",
    emoji: "🏖️",
    memberIds: ["m-aarav", "m-priya", "m-rohan", "m-ananya"],
    netBalance: 4200,
  },
  {
    id: "g-flat",
    name: "Flat 302 · Koramangala",
    emoji: "🏠",
    memberIds: ["m-aarav", "m-priya", "m-vikram", "m-meera"],
    netBalance: -1850,
  },
  {
    id: "g-lunch",
    name: "Office Lunch Crew",
    emoji: "🍱",
    memberIds: ["m-aarav", "m-rohan", "m-meera"],
    netBalance: 640,
  },
  {
    id: "g-diwali",
    name: "Diwali Get-together",
    emoji: "🪔",
    memberIds: ["m-aarav", "m-priya", "m-ananya", "m-vikram"],
    netBalance: 1230,
  },
];

export const expenses: Expense[] = [
  {
    id: "e-01",
    groupId: "g-goa",
    title: "Beach shack dinner",
    amount: 3200,
    paidById: "m-rohan",
    date: "2026-10-04",
    category: "food",
  },
  {
    id: "e-02",
    groupId: "g-goa",
    title: "Cab from airport",
    amount: 1450,
    paidById: "m-aarav",
    date: "2026-10-03",
    category: "travel",
  },
  {
    id: "e-03",
    groupId: "g-goa",
    title: "Hotel — 2 nights",
    amount: 9600,
    paidById: "m-priya",
    date: "2026-10-03",
    category: "travel",
  },
  {
    id: "e-04",
    groupId: "g-goa",
    title: "Water sports",
    amount: 2400,
    paidById: "m-ananya",
    date: "2026-10-04",
    category: "entertainment",
  },
  {
    id: "e-05",
    groupId: "g-flat",
    title: "October rent",
    amount: 12000,
    paidById: "m-aarav",
    date: "2026-10-01",
    category: "rent",
  },
  {
    id: "e-06",
    groupId: "g-flat",
    title: "Electricity bill",
    amount: 2340,
    paidById: "m-vikram",
    date: "2026-10-02",
    category: "utilities",
  },
  {
    id: "e-07",
    groupId: "g-flat",
    title: "BigBasket groceries",
    amount: 3180,
    paidById: "m-meera",
    date: "2026-10-05",
    category: "groceries",
  },
  {
    id: "e-08",
    groupId: "g-flat",
    title: "Airtel WiFi bill",
    amount: 999,
    paidById: "m-priya",
    date: "2026-10-05",
    category: "utilities",
  },
  {
    id: "e-09",
    groupId: "g-lunch",
    title: "Office biryani run",
    amount: 780,
    paidById: "m-aarav",
    date: "2026-10-06",
    category: "food",
  },
  {
    id: "e-10",
    groupId: "g-lunch",
    title: "Filter coffee round",
    amount: 240,
    paidById: "m-rohan",
    date: "2026-10-07",
    category: "food",
  },
  {
    id: "e-11",
    groupId: "g-diwali",
    title: "Sweets & snacks",
    amount: 2100,
    paidById: "m-priya",
    date: "2026-10-08",
    category: "groceries",
  },
  {
    id: "e-12",
    groupId: "g-diwali",
    title: "Decor & diyas",
    amount: 860,
    paidById: "m-vikram",
    date: "2026-10-08",
    category: "shopping",
  },
];

export const balances: Balance[] = [
  { memberId: "m-priya", amount: 1500 },
  { memberId: "m-ananya", amount: 2700 },
  { memberId: "m-meera", amount: 640 },
  { memberId: "m-rohan", amount: -900 },
  { memberId: "m-vikram", amount: -2350 },
];

export const summary: DashboardSummary = {
  youAreOwed: 4840,
  youOwe: 3250,
  netBalance: 1590,
  activeGroups: groups.length,
};

export function getMember(id: string): Member | undefined {
  return members.find((member) => member.id === id);
}

export function getGroup(id: string): Group | undefined {
  return groups.find((group) => group.id === id);
}

export function getGroupMembers(group: Group): Member[] {
  return group.memberIds
    .map((id) => getMember(id))
    .filter((member): member is Member => Boolean(member));
}

export function getExpensesForGroup(groupId: string): Expense[] {
  return expenses
    .filter((expense) => expense.groupId === groupId)
    .sort((a, b) => b.date.localeCompare(a.date));
}
