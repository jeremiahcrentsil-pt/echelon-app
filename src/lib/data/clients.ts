export type MockClient = {
  id: string;
  name: string;
  email: string;
  phase: string;
};

const ACTIVE_KEY = "echelon.activeClientId.v1";

export const MOCK_CLIENTS: MockClient[] = [
  {
    id: "client-alex",
    name: "Alex Rivera",
    email: "alex@example.com",
    phase: "Cut · Plan A",
  },
  {
    id: "client-sam",
    name: "Sam Chen",
    email: "sam@example.com",
    phase: "Recomp",
  },
];

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getClientById(id: string) {
  return MOCK_CLIENTS.find((client) => client.id === id) ?? null;
}

export function loadActiveClientId(): string {
  if (!canUseStorage()) return MOCK_CLIENTS[0].id;
  const stored = window.localStorage.getItem(ACTIVE_KEY);
  if (stored && getClientById(stored)) return stored;
  window.localStorage.setItem(ACTIVE_KEY, MOCK_CLIENTS[0].id);
  return MOCK_CLIENTS[0].id;
}

export function saveActiveClientId(id: string) {
  if (!canUseStorage()) return;
  if (!getClientById(id)) return;
  window.localStorage.setItem(ACTIVE_KEY, id);
}
