import React, { useState } from 'react';
import { School, Lock, Eye, EyeOff, User } from 'lucide-react';
import { useToast } from '../Layout/ToastProvider';
import auth from '../../utils/auth';
import { formatNomPrenoms } from '../../utils/formatName';

interface LoginFormProps {
  onLogin: (user: any) => void;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [nomUtilisateur, setNomUtilisateur] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomUtilisateur || !password) {
      showToast('Veuillez remplir tous les champs', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const user = auth.login(nomUtilisateur, password);
      if (user) {
  showToast(`Bienvenue ${formatNomPrenoms(user)}`, 'success');
        onLogin(user);
      } else {
        showToast('Nom d\'utilisateur ou mot de passe incorrect', 'error');
      }
    } catch (error) {
      showToast('Erreur de connexion', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-gray-200 w-full max-w-md">
        {/* Header */}
        <div className="p-8 text-center border-b border-gray-200">
          <div className="w-16 h-16 bg-gray-900 rounded-lg flex items-center justify-center mx-auto mb-4">
            <School className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">KlasNet</h1>
          <p className="text-gray-600">Gestion Scolaire</p>
        </div>

        {/* Formulaire */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom d'utilisateur
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={nomUtilisateur}
                  onChange={(e) => setNomUtilisateur(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors"
                  placeholder="votre_nom_utilisateur"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gray-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Connexion...
                </div>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 text-center border-t border-gray-200">
          <p className="text-xs text-gray-500">
            © 2025 KlasNet - Gestion Scolaire Côte d'Ivoire
          </p>
        </div>
      </div>
    </div>
  );
}