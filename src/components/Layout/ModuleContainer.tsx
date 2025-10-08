// React import not required with automatic JSX runtime

export default function ModuleContainer({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">{title}</h1>
            {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
          </div>
          {actions && <div className="mt-4 sm:mt-0 flex items-center gap-3">{actions}</div>}
        </div>

        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
}
