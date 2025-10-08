import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Users, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface EnhancedStatsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  progress?: {
    current: number;
    total: number;
    color: string;
  };
  color: string;
}

export default function EnhancedStatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  progress,
  color
}: EnhancedStatsCardProps) {
  const progressPercentage = progress ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow ${color}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-full ${color.replace('border-', 'bg-').replace('-200', '-100')}`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center space-x-1 text-sm font-medium ${
            trend.isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend.isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>

      <div className="mb-2">
        <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>

      {progress && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Progression</span>
            <span>{progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${progress.color}`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Specialized stats cards for finances
export function FinanceStatsCards({ stats }: { stats: any }) {
  const totalEleves = stats.elevesPayes + stats.elevesPartiels + stats.elevesImpayes;
  const paymentRate = totalEleves > 0 ? Math.round((stats.elevesPayes / totalEleves) * 100) : 0;
  const partialRate = totalEleves > 0 ? Math.round((stats.elevesPartiels / totalEleves) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <EnhancedStatsCard
        title="Total Recettes"
        value={stats.totalRecettes.toLocaleString('fr-FR') + ' FCFA'}
        subtitle="Cumul des paiements"
        icon={<DollarSign className="h-6 w-6 text-green-600" />}
        color="border-green-200"
        trend={{ value: 12, isPositive: true }} // Mock trend
      />

      <EnhancedStatsCard
        title="Payés"
        value={stats.elevesPayes.toString()}
        subtitle={`${paymentRate}% des élèves`}
        icon={<CheckCircle className="h-6 w-6 text-green-600" />}
        color="border-green-200"
        progress={{
          current: stats.elevesPayes,
          total: totalEleves,
          color: 'bg-green-500'
        }}
      />

      <EnhancedStatsCard
        title="Partiels"
        value={stats.elevesPartiels.toString()}
        subtitle={`${partialRate}% des élèves`}
        icon={<AlertTriangle className="h-6 w-6 text-orange-600" />}
        color="border-orange-200"
        progress={{
          current: stats.elevesPartiels,
          total: totalEleves,
          color: 'bg-orange-500'
        }}
      />

      <EnhancedStatsCard
        title="Impayés"
        value={stats.elevesImpayes.toString()}
        subtitle={`${totalEleves > 0 ? Math.round((stats.elevesImpayes / totalEleves) * 100) : 0}% des élèves`}
        icon={<XCircle className="h-6 w-6 text-red-600" />}
        color="border-red-200"
        progress={{
          current: stats.elevesImpayes,
          total: totalEleves,
          color: 'bg-red-500'
        }}
      />

      <EnhancedStatsCard
        title="Reste à encaisser"
        value={stats.totalSolde.toLocaleString('fr-FR') + ' FCFA'}
        subtitle="Montant en attente"
        icon={<Users className="h-6 w-6 text-blue-600" />}
        color="border-blue-200"
        trend={{ value: 8, isPositive: false }} // Mock trend
      />
    </div>
  );
}
