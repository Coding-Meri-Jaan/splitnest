/**
 * Marketing-only demo data for the landing page preview card.
 * The signed-in app reads everything from Supabase.
 */

export interface DemoMember {
  id: string;
  name: string;
  email: string;
  city: string;
}

export interface DemoBalance {
  memberId: string;
  amount: number;
}

export const members: DemoMember[] = [
  { id: "m-aarav", name: "Aarav Sharma", email: "aarav@example.in", city: "Bengaluru" },
  { id: "m-priya", name: "Priya Nair", email: "priya@example.in", city: "Bengaluru" },
  { id: "m-rohan", name: "Rohan Mehta", email: "rohan@example.in", city: "Mumbai" },
  { id: "m-ananya", name: "Ananya Iyer", email: "ananya@example.in", city: "Chennai" },
  { id: "m-vikram", name: "Vikram Singh", email: "vikram@example.in", city: "Delhi" },
  { id: "m-meera", name: "Meera Reddy", email: "meera@example.in", city: "Hyderabad" },
];

export const balances: DemoBalance[] = [
  { memberId: "m-priya", amount: 1500 },
  { memberId: "m-ananya", amount: 2700 },
  { memberId: "m-meera", amount: 640 },
  { memberId: "m-rohan", amount: -900 },
  { memberId: "m-vikram", amount: -2350 },
];

export const summary = {
  youAreOwed: 4840,
  youOwe: 3250,
  netBalance: 1590,
  activeGroups: 4,
};

export function getMember(id: string): DemoMember | undefined {
  return members.find((member) => member.id === id);
}
