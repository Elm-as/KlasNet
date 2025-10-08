export interface EnteteBase {
  header: string;
  footer?: string;
  logo?: string;
  logoMinistere?: string;
  pays?: string;
  ministere?: string;
  etablissement?: string;
  columns: string[];
  mention?: boolean;
  compact?: boolean;
}

export interface AllConfigs {
  eleves: EnteteBase;
  recu: EnteteBase;
  transport: EnteteBase;
}

