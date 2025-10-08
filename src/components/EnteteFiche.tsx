import { getEnteteConfig } from '../utils/entetesConfig';
import { db } from '../utils/database';
import type { AllConfigs } from '../types/enteteConfig';

interface EnteteFicheProps {
  type: keyof AllConfigs;
  libelle?: string;
  classe?: string;
  enseignant?: string;
  hideFooter?: boolean;
  // optional metadata rendered on the right of the header (same horizontal line as the school name)
  rightMeta?: React.ReactNode;
}

export default function EnteteFiche({ type, libelle, classe, enseignant, hideFooter = false, rightMeta }: EnteteFicheProps) {
  const cfg = getEnteteConfig(type);

  // Prefer the global "ecole" record when available (nom / logo), fallback to entete config
  const ecole = db.getAll('ecole')?.[0] as any;
  const leftLogo = (ecole && ecole.logo) ? ecole.logo : (cfg.logo || '');
  const rightLogo = cfg.logoMinistere || '';
  const showRightLogo = rightLogo && rightLogo !== leftLogo;
  const etablissementName = (ecole && ecole.nom) ? ecole.nom : (cfg as any).etablissement || cfg.header;

  const gridClass = rightMeta ? 'grid grid-cols-[80px_1fr_80px] items-start gap-3 mb-1 print:mb-0' : 'grid grid-cols-[80px_1fr_80px] items-center gap-3 mb-1 print:mb-0';

  return (
    <div className="w-full mb-1">
      <div className={gridClass}>
        <div className="flex flex-col items-start">
          {leftLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={leftLogo} alt="logo" style={{ maxHeight: 64, width: 'auto' }} className="logo-left object-contain" />
          ) : (
            <div className="h-12 w-12 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-600">Logo</div>
          )}
        </div>

        <div className="text-center px-1">
          <div className="text-sm text-gray-700">{cfg.pays}</div>
          <div className="font-bold text-base tracking-wider text-blue-800">{cfg.ministere}</div>
          <div className="font-extrabold text-lg mt-0">{etablissementName}</div>
          <div className="text-sm text-teal-700 mt-0 entete-libelle font-semibold">{libelle || cfg.header}</div>
          {(classe || enseignant) && (
            <div className="text-xs text-gray-600 mt-1">
              {classe && <span className="mr-2">Classe: {classe}</span>}
              {enseignant && <span>Enseignant: {enseignant}</span>}
            </div>
          )}
          {/* contact info from DB.ecole when available */}
          {(ecole || cfg) && (
            <div className="text-xs text-gray-600 mt-1">
              {ecole?.adresse && <div>{ecole.adresse}</div>}
              <div className="flex items-center justify-center space-x-3">
                {ecole?.telephone && <div>Tel: {ecole.telephone}</div>}
                {ecole?.email && <div>Email: {ecole.email}</div>}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end">
          {rightMeta ? (
            <div className="text-right text-xs text-gray-600">
              {rightMeta}
            </div>
          ) : null}
          {showRightLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={rightLogo} alt="logo-ministere" style={{ maxHeight: 56, width: 'auto' }} className="logo-right object-contain" />
          ) : (
            <div style={{ height: 56, width: 56 }} />
          )}
        </div>
      </div>

      {!hideFooter && <div className="text-xs text-right text-gray-600 print:text-xs">{cfg.footer}</div>}
    </div>
  );
}
