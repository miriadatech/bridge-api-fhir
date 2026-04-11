export interface Patient {
  id?: string;
  resourceType: 'Patient';
  identifier?: [{ use?: string; system?: string; value?: string }];
  name?: [{ family?: string; given?: string[] }];
  gender?: string;
  birthDate?: string;
  telecom?: any[];
  address?: any[];
}
