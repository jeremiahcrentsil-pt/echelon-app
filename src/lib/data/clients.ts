export type MockClient = {
  id: string;
  name: string;
  email: string;
  phase: string;
};

/** Seed ids / fallback names for types and draft defaults. */
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

export function getClientById(id: string) {
  return MOCK_CLIENTS.find((client) => client.id === id) ?? null;
}

/** Fetch the coach roster (or empty for clients) from the session API. */
export async function fetchClients(): Promise<MockClient[]> {
  const { apiJson } = await import("@/lib/api/http");
  const data = await apiJson<{ clients: MockClient[] }>("/api/me");
  return data.clients ?? [];
}
