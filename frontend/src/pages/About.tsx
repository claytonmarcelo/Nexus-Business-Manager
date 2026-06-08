import { motion } from 'framer-motion';
import {
  GlobeAltIcon,
  EnvelopeIcon,
  PhoneIcon,
  ServerIcon,
  CalendarIcon,
  ArrowPathIcon,
  UsersIcon,
  UserPlusIcon,
  CircleStackIcon,
  KeyIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  UserGroupIcon,
  TruckIcon,
  CubeIcon,
  ArchiveBoxIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  IdentificationIcon,
  BanknotesIcon,
  BellIcon,
  UserIcon,
  Cog6ToothIcon,
  CalendarDaysIcon,
  CpuChipIcon,
  CodeBracketSquareIcon,
  ServerStackIcon,
  WrenchScrewdriverIcon,
  PaintBrushIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

const modules = [
  { title: 'Dashboard', desc: 'Visão geral do negócio', icon: ChartBarIcon },
  { title: 'Clientes', desc: 'Gestão de clientes', icon: UserGroupIcon },
  { title: 'Fornecedores', desc: 'Gestão de fornecedores', icon: TruckIcon },
  { title: 'Produtos', desc: 'Catálogo de produtos', icon: CubeIcon },
  { title: 'Estoque', desc: 'Controle de estoque', icon: ArchiveBoxIcon },
  { title: 'Compras', desc: 'Gestão de compras', icon: ShoppingCartIcon },
  { title: 'Vendas', desc: 'Gestão de vendas', icon: CurrencyDollarIcon },
  { title: 'CMR', desc: 'Relacionamento com cliente', icon: IdentificationIcon },
  { title: 'Financeiro', desc: 'Gestão financeira', icon: BanknotesIcon },
  { title: 'Relatórios', desc: 'Relatórios e análises', icon: ChartBarIcon },
  { title: 'Notificações', desc: 'Central de alertas', icon: BellIcon },
  { title: 'Auditoria', desc: 'Logs e auditoria', icon: ShieldCheckIcon },
  { title: 'Usuários', desc: 'Gestão de usuários', icon: UserIcon },
  { title: 'Configurações', desc: 'Configurações do sistema', icon: Cog6ToothIcon },
  { title: 'Agenda', desc: 'Compromissos e tarefas', icon: CalendarDaysIcon },
];

const technologies = [
  { name: 'React 18', desc: 'Biblioteca para interfaces SPA e React Router v6', icon: CpuChipIcon, color: '#61dafb' },
  { name: 'TypeScript', desc: 'Tipagem estática e segurança em tempo de desenvolvimento', icon: CodeBracketSquareIcon, color: '#3178c6' },
  { name: 'Fastify', desc: 'Framework backend de alto desempenho e baixa sobrecarga', icon: ServerStackIcon, color: '#4caf50' },
  { name: 'MySQL & Prisma', desc: 'Banco de dados relacional e ORM moderno para modelagem', icon: CircleStackIcon, color: '#00758f' },
  { name: 'Tailwind CSS', desc: 'Estilização utilitária com suporte a temas dinâmicos', icon: PaintBrushIcon, color: '#38bdf8' },
  { name: 'Vite', desc: 'Ferramenta de build e dev server ultra-rápido', icon: BoltIcon, color: '#646cff' },
];

export function About() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="pb-12 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--nexus-text)' }}>Sobre o Nexus Business Manager</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--nexus-muted-2)' }}>Sistema completo para gestão empresarial</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Main Hero Panel */}
          <div className="rounded-xl p-6 relative overflow-hidden" style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}>
            <div className="absolute top-6 right-6 border rounded-full px-3 py-1 text-xs font-medium" style={{ borderColor: 'var(--nexus-gold)', color: 'var(--nexus-gold)', background: 'rgba(var(--nexus-gold-rgb), 0.1)' }}>
              Versão 2.4.1
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-start mb-8">
              <div className="flex-1 mt-2">
                <h2 className="text-2xl font-bold" style={{ color: 'var(--nexus-text)' }}>Nexus Business Manager</h2>
                <p className="text-sm mb-6" style={{ color: 'var(--nexus-muted-2)' }}>Sistema de Gestão Empresarial</p>
                <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--nexus-muted)' }}>
                  O Nexus Business Manager é uma plataforma completa e integrada para gestão empresarial, desenvolvida para ajudar empresas a controlar e otimizar todos os seus processos de forma eficiente.
                </p>
                <p className="text-xs" style={{ color: 'var(--nexus-muted-2)' }}>
                  © 2026 Nexus Solutions. Todos os direitos reservados.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-6 pt-6 mt-4" style={{ borderTop: '1px solid var(--nexus-border)' }}>
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
                <GlobeAltIcon className="w-5 h-5" style={{ color: 'var(--nexus-gold)' }} />
                www.nexus.com.br
              </div>
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
                <EnvelopeIcon className="w-5 h-5" style={{ color: 'var(--nexus-gold)' }} />
                contato@nexus.com.br
              </div>
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
                <PhoneIcon className="w-5 h-5" style={{ color: 'var(--nexus-gold)' }} />
                (11) 99999-9999
              </div>
            </div>
          </div>

          {/* Modules Panel */}
          <div className="rounded-xl p-6" style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}>
            <h3 className="text-lg font-semibold mb-6" style={{ color: 'var(--nexus-text)' }}>Módulos do sistema</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {modules.map((m, i) => {
                const Icon = m.icon;
                return (
                  <div key={i} className="flex gap-3 p-3 rounded-lg border transition-colors hover:bg-white/5" style={{ borderColor: 'var(--nexus-border)', background: 'rgba(0,0,0,0.2)' }}>
                    <div className="mt-1">
                      <Icon className="w-5 h-5" style={{ color: 'var(--nexus-gold)' }} />
                    </div>
                    <div>
                      <div className="text-xs font-medium" style={{ color: 'var(--nexus-text)' }}>{m.title}</div>
                      <div className="text-[10px] mt-0.5 leading-tight" style={{ color: 'var(--nexus-muted-2)' }}>{m.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Finalidade do Projeto Panel */}
          <div className="rounded-xl p-6" style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--nexus-text)' }}>Finalidade do projeto</h3>
            <div className="space-y-4 text-xs leading-relaxed" style={{ color: 'var(--nexus-muted)' }}>
              <p>
                O Nexus Business Manager foi criado como um projeto de código aberto com a missão de democratizar o acesso a ferramentas profissionais de gestão empresarial.
              </p>
              <p>
                Muitas pequenas e médias empresas não conseguem investir em sistemas ERP comerciais de alto custo. Gerenciar uma empresa com planilhas dispersas e ferramentas desconectadas gera ineficiência e perda de oportunidades.
              </p>
              <p>
                Este projeto oferece uma alternativa completa, profissional e gratuita, permitindo que qualquer empresa, independente do seu tamanho, tenha acesso a uma gestão integrada, auditável e altamente eficiente.
              </p>
            </div>
          </div>

          {/* Direitos e Deveres Panel */}
          <div className="rounded-xl p-6" style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--nexus-text)' }}>Direitos e deveres</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Usuário */}
              <div className="rounded-lg p-4" style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--nexus-border)' }}>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5" style={{ color: 'var(--nexus-gold)' }}>
                  <UserIcon className="w-4 h-4" /> Usuário Comum
                </h4>
                
                <div className="space-y-3">
                  <div>
                    <h5 className="text-[10px] font-bold uppercase tracking-wider mb-1 text-emerald-500">Direitos</h5>
                    <ul className="space-y-1 text-[11px]" style={{ color: 'var(--nexus-muted-2)' }}>
                      <li className="flex items-start gap-1">
                        <span className="text-emerald-500 font-bold">✓</span> Utilizar recursos autorizados
                      </li>
                      <li className="flex items-start gap-1">
                        <span className="text-emerald-500 font-bold">✓</span> Atualizar o próprio perfil
                      </li>
                      <li className="flex items-start gap-1">
                        <span className="text-emerald-500 font-bold">✓</span> Consultar dados permitidos
                      </li>
                      <li className="flex items-start gap-1">
                        <span className="text-emerald-500 font-bold">✓</span> Solicitar suporte técnico
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h5 className="text-[10px] font-bold uppercase tracking-wider mb-1 text-rose-500">Deveres</h5>
                    <ul className="space-y-1 text-[11px]" style={{ color: 'var(--nexus-muted-2)' }}>
                      <li className="flex items-start gap-1">
                        <span className="text-rose-500 font-bold">•</span> Não compartilhar a senha
                      </li>
                      <li className="flex items-start gap-1">
                        <span className="text-rose-500 font-bold">•</span> Não acessar dados indevidos
                      </li>
                      <li className="flex items-start gap-1">
                        <span className="text-rose-500 font-bold">•</span> Utilizar o sistema corretamente
                      </li>
                      <li className="flex items-start gap-1">
                        <span className="text-rose-500 font-bold">•</span> Manter dados atualizados
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Administrador */}
              <div className="rounded-lg p-4" style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--nexus-border)' }}>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5" style={{ color: 'var(--nexus-gold)' }}>
                  <ShieldCheckIcon className="w-4 h-4" /> Administrador
                </h4>
                
                <div className="space-y-3">
                  <div>
                    <h5 className="text-[10px] font-bold uppercase tracking-wider mb-1 text-emerald-500">Direitos</h5>
                    <ul className="space-y-1 text-[11px]" style={{ color: 'var(--nexus-muted-2)' }}>
                      <li className="flex items-start gap-1">
                        <span className="text-emerald-500 font-bold">✓</span> Gerenciar usuários e acessos
                      </li>
                      <li className="flex items-start gap-1">
                        <span className="text-emerald-500 font-bold">✓</span> Configurar dados da empresa
                      </li>
                      <li className="flex items-start gap-1">
                        <span className="text-emerald-500 font-bold">✓</span> Gerenciar permissões (roles)
                      </li>
                      <li className="flex items-start gap-1">
                        <span className="text-emerald-500 font-bold">✓</span> Visualizar logs de auditoria
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h5 className="text-[10px] font-bold uppercase tracking-wider mb-1 text-rose-500">Deveres</h5>
                    <ul className="space-y-1 text-[11px]" style={{ color: 'var(--nexus-muted-2)' }}>
                      <li className="flex items-start gap-1">
                        <span className="text-rose-500 font-bold">•</span> Garantir a segurança dos dados
                      </li>
                      <li className="flex items-start gap-1">
                        <span className="text-rose-500 font-bold">•</span> Gerenciar acessos corretamente
                      </li>
                      <li className="flex items-start gap-1">
                        <span className="text-rose-500 font-bold">•</span> Proteger dados corporativos
                      </li>
                      <li className="flex items-start gap-1">
                        <span className="text-rose-500 font-bold">•</span> Manter usuários atualizados
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Support Panel */}
          <div className="rounded-xl p-6" style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}>
            <h3 className="text-lg font-semibold mb-6" style={{ color: 'var(--nexus-text)' }}>Suporte e contato</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center text-center">
                <h4 className="text-sm font-medium mb-1" style={{ color: 'var(--nexus-text)' }}>Suporte técnico</h4>
                <p className="text-xs mb-4" style={{ color: 'var(--nexus-muted-2)' }}>Para dúvidas e suporte técnico</p>
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors border w-full justify-center" style={{ color: 'var(--nexus-gold)', borderColor: 'rgba(var(--nexus-gold-rgb), 0.3)', background: 'transparent' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(var(--nexus-gold-rgb), 0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <PhoneIcon className="w-4 h-4" />
                  Abrir chamado
                </button>
              </div>
              <div className="flex flex-col items-center text-center">
                <h4 className="text-sm font-medium mb-1" style={{ color: 'var(--nexus-text)' }}>Documentação</h4>
                <p className="text-xs mb-4" style={{ color: 'var(--nexus-muted-2)' }}>Acesse a documentação completa</p>
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors border w-full justify-center" style={{ color: 'var(--nexus-gold)', borderColor: 'rgba(var(--nexus-gold-rgb), 0.3)', background: 'transparent' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(var(--nexus-gold-rgb), 0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  Ver documentação
                </button>
              </div>
              <div className="flex flex-col items-center text-center">
                <h4 className="text-sm font-medium mb-1" style={{ color: 'var(--nexus-text)' }}>Comunidade</h4>
                <p className="text-xs mb-4" style={{ color: 'var(--nexus-muted-2)' }}>Participe da nossa comunidade</p>
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors border w-full justify-center" style={{ color: 'var(--nexus-gold)', borderColor: 'rgba(var(--nexus-gold-rgb), 0.3)', background: 'transparent' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(var(--nexus-gold-rgb), 0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <UsersIcon className="w-4 h-4" />
                  Ir para comunidade
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* System Info Panel */}
          <div className="rounded-xl p-6" style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}>
            <h3 className="text-lg font-semibold mb-6" style={{ color: 'var(--nexus-text)' }}>Informações do sistema</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2" style={{ color: 'var(--nexus-muted-2)' }}>
                  <CpuChipIcon className="w-4 h-4" style={{ color: 'var(--nexus-gold)' }} /> Versão
                </div>
                <div style={{ color: 'var(--nexus-text)' }}>2.4.1</div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2" style={{ color: 'var(--nexus-muted-2)' }}>
                  <ServerIcon className="w-4 h-4" style={{ color: 'var(--nexus-gold)' }} /> Ambiente
                </div>
                <div style={{ color: 'var(--nexus-text)' }}>Produção</div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2" style={{ color: 'var(--nexus-muted-2)' }}>
                  <CalendarIcon className="w-4 h-4" style={{ color: 'var(--nexus-gold)' }} /> Data da instalação
                </div>
                <div style={{ color: 'var(--nexus-text)' }}>15/01/2024 08:30</div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2" style={{ color: 'var(--nexus-muted-2)' }}>
                  <ArrowPathIcon className="w-4 h-4" style={{ color: 'var(--nexus-gold)' }} /> Última atualização
                </div>
                <div style={{ color: 'var(--nexus-text)' }}>05/06/2026 14:20</div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2" style={{ color: 'var(--nexus-muted-2)' }}>
                  <UsersIcon className="w-4 h-4" style={{ color: 'var(--nexus-gold)' }} /> Limite de usuários
                </div>
                <div style={{ color: 'var(--nexus-text)' }}>50 usuários</div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2" style={{ color: 'var(--nexus-muted-2)' }}>
                  <UserPlusIcon className="w-4 h-4" style={{ color: 'var(--nexus-gold)' }} /> Usuários ativos
                </div>
                <div style={{ color: 'var(--nexus-text)' }}>24 usuários</div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2" style={{ color: 'var(--nexus-muted-2)' }}>
                  <CircleStackIcon className="w-4 h-4" style={{ color: 'var(--nexus-gold)' }} /> Banco de dados
                </div>
                <div style={{ color: 'var(--nexus-text)' }}>MySQL 8.0</div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2" style={{ color: 'var(--nexus-muted-2)' }}>
                  <ServerStackIcon className="w-4 h-4" style={{ color: 'var(--nexus-gold)' }} /> Armazenamento
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-1.5 rounded-full bg-black/40 overflow-hidden">
                    <div className="h-full" style={{ width: '51%', background: 'var(--nexus-gold)' }}></div>
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--nexus-muted)' }}>256 GB / 500 GB (51%)</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2" style={{ color: 'var(--nexus-muted-2)' }}>
                  <KeyIcon className="w-4 h-4" style={{ color: 'var(--nexus-gold)' }} /> Licença
                </div>
                <div className="font-medium" style={{ color: 'var(--nexus-success)' }}>Empresarial</div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2" style={{ color: 'var(--nexus-muted-2)' }}>
                  <ShieldCheckIcon className="w-4 h-4" style={{ color: 'var(--nexus-gold)' }} /> Status do sistema
                </div>
                <div className="flex items-center gap-1.5 font-medium" style={{ color: 'var(--nexus-success)' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: 'var(--nexus-success)' }}></span>
                  Operacional
                </div>
              </div>
            </div>
          </div>

          {/* Tech Panel */}
          <div className="rounded-xl p-6" style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}>
            <h3 className="text-lg font-semibold mb-6" style={{ color: 'var(--nexus-text)' }}>Tecnologias utilizadas</h3>
            <div className="space-y-4">
              {technologies.map((t, i) => {
                const Icon = t.icon;
                return (
                  <div key={i} className="flex gap-3">
                    <div className="mt-1">
                      <Icon className="w-6 h-6" style={{ color: t.color }} />
                    </div>
                    <div>
                      <div className="text-sm font-medium" style={{ color: 'var(--nexus-text)' }}>{t.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--nexus-muted-2)' }}>{t.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Credits Panel */}
          <div className="rounded-xl p-6 text-center" style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}>
            <p className="text-sm font-medium mb-3" style={{ color: 'var(--nexus-text)' }}>Desenvolvido com <span className="text-red-500">❤️</span> por Nexus Solutions</p>
            <p className="text-xs leading-relaxed mb-6" style={{ color: 'var(--nexus-muted-2)' }}>
              Nosso compromisso é fornecer soluções inovadoras que impulsionam o sucesso do seu negócio.
            </p>
            <button className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm mx-auto transition-colors border" style={{ color: 'var(--nexus-gold)', borderColor: 'rgba(var(--nexus-gold-rgb), 0.3)', background: 'transparent' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(var(--nexus-gold-rgb), 0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              Saiba mais sobre nós
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </button>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
