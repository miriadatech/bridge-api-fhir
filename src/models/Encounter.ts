export interface Encounter {
  id?: string;
  resourceType: 'Encounter';
  status: string;
  subject: { reference: string };
  period?: { start?: string; end?: string };
}
