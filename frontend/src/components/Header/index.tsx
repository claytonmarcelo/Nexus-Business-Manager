import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon, BellIcon, Bars3Icon, CalendarIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';

const STORAGE_KEYS_TO_KEEP = ['@nexus:token', '@nexus:user', '@nexus:theme'];

const MONTHS_PT = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

function fmt(d: Date) {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/* ── Inline DateRangePicker ─────────────────────────────── */
interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onApply: (start: Date, end: Date) => void;
  onClose: () => void;
}

function DateRangePicker({ startDate, endDate, onApply, onClose }: DateRangePickerProps) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(new Date(startDate.getFullYear(), startDate.getMonth(), 1));
  const [selecting, setSelecting] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [localStart, setLocalStart] = useState<Date>(startDate);
  const [localEnd, setLocalEnd] = useState<Date>(endDate);

  const nextViewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);

  function buildCalendar(year: number, month: number): (Date | null)[] {
    const first = new Date(year, month, 1).getDay();
    const days: (Date | null)[] = Array(first).fill(null);
    const total = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= total; d++) days.push(new Date(year, month, d));
    return days;
  }

  function handleDayClick(day: Date) {
    if (!selecting) {
      setSelecting(day);
      setLocalStart(day);
      setLocalEnd(day);
    } else {
      const [s, e] = day < selecting ? [day, selecting] : [selecting, day];
      setLocalStart(s);
      setLocalEnd(e);
      setSelecting(null);
    }
  }

  function isInRange(day: Date) {
    const rangeEnd = selecting && hoverDate ? (hoverDate < selecting ? selecting : hoverDate) : localEnd;
    const rangeStart = selecting && hoverDate ? (hoverDate < selecting ? hoverDate : selecting) : localStart;
    return day > startOfDay(rangeStart) && day < startOfDay(rangeEnd);
  }

  function quickSelect(days: number) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days + 1);
    setLocalStart(startOfDay(start));
    setLocalEnd(startOfDay(end));
    setSelecting(null);
  }

  function DayCell({ day, monthIdx }: { day: Date | null; monthIdx: number }) {
    if (!day) return <div />;
    const isStart = sameDay(day, localStart);
    const isEnd = selecting ? (hoverDate && sameDay(day, hoverDate > selecting ? hoverDate : selecting)) : sameDay(day, localEnd);
    const inRange = isInRange(day);
    const isToday = sameDay(day, today);

    let bg = 'transparent';
    let color = 'var(--nexus-muted)';
    let fontWeight = 400;
    if (isStart || isEnd) { bg = 'var(--nexus-gold)'; color = '#0b0d10'; fontWeight = 700; }
    else if (inRange) { bg = 'rgba(212,149,86,0.18)'; color = 'var(--nexus-text)'; }
    else if (isToday) { color = 'var(--nexus-gold)'; fontWeight = 600; }

    return (
      <button
        onClick={() => handleDayClick(day)}
        onMouseEnter={() => selecting && setHoverDate(day)}
        onMouseLeave={() => selecting && setHoverDate(null)}
        style={{
          background: bg,
          color,
          fontWeight,
          borderRadius: 8,
          width: 32,
          height: 32,
          fontSize: 12,
          cursor: 'pointer',
          border: isToday && !isStart && !isEnd ? '1px solid var(--nexus-gold)' : '1px solid transparent',
          transition: 'all 0.12s',
        }}
      >
        {day.getDate()}
      </button>
    );
  }

  function MonthGrid({ baseDate }: { baseDate: Date }) {
    const y = baseDate.getFullYear(), m = baseDate.getMonth();
    const cells = buildCalendar(y, m);
    return (
      <div style={{ minWidth: 224 }}>
        <p className="text-xs font-semibold text-center mb-3" style={{ color: 'var(--nexus-text)' }}>
          {MONTHS_PT[m]} {y}
        </p>
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {DAYS_PT.map(d => (
            <div key={d} className="text-center text-[10px] font-bold" style={{ color: 'var(--nexus-muted-2)', padding: '2px 0' }}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, i) => <DayCell key={i} day={day} monthIdx={m} />)}
        </div>
      </div>
    );
  }

  return (
    <div
      className="absolute right-0 z-50 rounded-xl shadow-2xl"
      style={{
        top: 'calc(100% + 8px)',
        background: 'var(--nexus-card-strong)',
        border: '1px solid var(--nexus-border)',
        padding: '1rem',
        minWidth: 540,
      }}
    >
      {/* Header nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
          style={{ background: 'var(--nexus-bg-soft)', color: 'var(--nexus-muted)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--nexus-gold)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--nexus-muted)'; }}>
          <ChevronLeftIcon className="w-3.5 h-3.5" />
        </button>
        <div className="flex gap-8">
          <MonthGrid baseDate={viewMonth} />
          <MonthGrid baseDate={nextViewMonth} />
        </div>
        <button onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
          style={{ background: 'var(--nexus-bg-soft)', color: 'var(--nexus-muted)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--nexus-gold)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--nexus-muted)'; }}>
          <ChevronRightIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--nexus-border)', margin: '0 -1rem 0.75rem' }} />

      {/* Quick selects + footer */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {[
            { label: 'Hoje', days: 1 },
            { label: 'Ultimos 7 dias', days: 7 },
            { label: 'Ultimos 30 dias', days: 30 },
            { label: 'Ultimos 90 dias', days: 90 },
          ].map(q => (
            <button key={q.label} onClick={() => quickSelect(q.days)}
              className="text-[11px] px-2.5 py-1 rounded-lg transition-colors"
              style={{ background: 'var(--nexus-bg-soft)', color: 'var(--nexus-muted)', border: '1px solid var(--nexus-border)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--nexus-gold)'; e.currentTarget.style.color = 'var(--nexus-gold)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--nexus-border)'; e.currentTarget.style.color = 'var(--nexus-muted)'; }}>
              {q.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium px-2 py-1 rounded-lg" style={{ background: 'var(--nexus-bg-soft)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)' }}>
            {fmt(localStart)} - {fmt(localEnd)}
          </span>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            style={{ background: 'var(--nexus-bg-soft)', color: 'var(--nexus-muted)' }}>
            <XMarkIcon className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { onApply(localStart, localEnd); onClose(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
            style={{ background: 'var(--nexus-gold)', color: '#0b0d10' }}>
            <CheckIcon className="w-3.5 h-3.5" />
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Header ─────────────────────────────────────────────── */
interface HeaderProps {
  toggleSidebar?: () => void;
}

export function Header({ toggleSidebar }: HeaderProps) {
  const { user, signOut, updateUser } = useAuth();
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const calRef = useRef<HTMLDivElement>(null);

  // Date range state
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(2026, 5, 1),   // 01/06/2026
    end: new Date(2026, 5, 5),     // 05/06/2026
  });

  // Close calendar on outside click
  useEffect(() => {
    if (!calOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (calRef.current && !calRef.current.contains(e.target as Node)) {
        setCalOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [calOpen]);

  const handleAvatarClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Tipo de arquivo nao permitido. Use jpg, png ou webp.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Arquivo muito grande. Maximo 5MB.', 'error');
      return;
    }
    setAvatarLoading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await api.post('/users/avatar', formData);
      const avatarUrl = res.data.data?.avatar_url;
      if (avatarUrl) {
        updateUser({ avatar_url: avatarUrl, avatarUrl });
      }
      showToast('Avatar atualizado com sucesso.');
    } catch (error) {
      console.error('Erro ao atualizar avatar:', error);
      showToast('Erro ao atualizar avatar.', 'error');
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [showToast, updateUser]);

  const handleClearCache = useCallback(async () => {
    setCacheLoading(true);
    await new Promise(r => setTimeout(r, 300));
    try {
      const kept: Record<string, string | null> = {};
      for (const key of STORAGE_KEYS_TO_KEEP) {
        kept[key] = localStorage.getItem(key);
      }
      localStorage.clear();
      for (const key of STORAGE_KEYS_TO_KEEP) {
        if (kept[key] !== null) {
          localStorage.setItem(key, kept[key]!);
        }
      }
      showToast('Cache limpo com sucesso.');
    } catch {
      showToast('Nao foi possivel limpar o cache. O sistema continuara funcionando normalmente.', 'error');
    } finally {
      setCacheLoading(false);
    }
  }, [showToast]);

  const avatarSrc = user?.avatar_url || user?.avatarUrl || null;
  const initials = user?.name?.charAt(0).toUpperCase() || '?';
  const roleLabel = user?.role?.toLowerCase() === 'admin' ? 'Administrador'
    : user?.role?.toLowerCase() === 'manager' ? 'Gerente'
    : user?.role?.toLowerCase() === 'operator' ? 'Operador'
    : 'Visualizador';

  const dateLabel = `${fmt(dateRange.start)} - ${fmt(dateRange.end)}`;

  return (
    <header className="nexus-header" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
      {/* Row 1: hamburger | search | actions + user */}
      <div className="flex items-center justify-between" style={{ minHeight: 48 }}>
        <button
          onClick={toggleSidebar}
          className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg text-nexus-muted hover:text-nexus-text hover:bg-nexus-card transition-colors"
        >
          <Bars3Icon className="w-6 h-6" />
        </button>

        <div className="flex-1 flex justify-center px-6">
          <div className="header-search max-w-md w-full relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-nexus-muted-2 flex-shrink-0" />
            <input
              type="text"
              placeholder="Buscar no sistema..."
              className="w-full bg-transparent border border-nexus-border rounded-full py-2 pl-10 pr-4 text-sm text-nexus-text focus:outline-none focus:border-nexus-gold transition-colors"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const q = (e.target as HTMLInputElement).value.trim();
                  if (q) showToast('Busca disponivel em breve.', 'info');
                }
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/notifications')}
            className="relative text-nexus-muted hover:text-nexus-gold transition-colors"
          >
            <BellIcon className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center border border-nexus-card">3</span>
          </button>

          <button
            onClick={() => navigate('/appointments')}
            className="text-nexus-muted hover:text-nexus-gold transition-colors"
          >
            <CalendarIcon className="w-5 h-5" />
          </button>

          <div className="relative">
            <div
              className="flex items-center gap-3 cursor-pointer select-none"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <div className="w-9 h-9 rounded-full bg-nexus-card border border-nexus-border flex items-center justify-center text-sm font-bold overflow-hidden flex-shrink-0">
                {avatarLoading ? (
                  <span className="animate-spin text-xs">{'\u21BB'}</span>
                ) : avatarSrc ? (
                  <img src={avatarSrc} alt={user?.name} className="w-full h-full object-cover" />
                ) : (
                  <span style={{ color: 'var(--nexus-gold)' }}>{initials}</span>
                )}
              </div>
              <div className="hidden lg:flex lg:flex-col">
                <p className="text-sm font-semibold text-nexus-text leading-tight">{user?.name}</p>
                <p className="text-[11px] text-nexus-muted leading-tight">{roleLabel}</p>
              </div>
              <ChevronDownIcon className="w-4 h-4 hidden lg:block" style={{ color: 'var(--nexus-muted)' }} />
            </div>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-48 bg-nexus-card-strong border border-nexus-border rounded-lg shadow-xl z-50 overflow-hidden">
                  <button
                    onClick={handleAvatarClick}
                    className="w-full text-left px-4 py-3 text-sm text-nexus-text hover:bg-nexus-bg transition-colors"
                  >
                    Alterar Avatar
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                  <button
                    onClick={() => {
                      navigate('/profile');
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-nexus-text hover:bg-nexus-bg transition-colors"
                  >
                    Perfil
                  </button>
                  <button
                    onClick={() => {
                      navigate('/settings');
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-nexus-text hover:bg-nexus-bg transition-colors"
                  >
                    Configuracoes
                  </button>
                  <button
                    onClick={handleClearCache}
                    disabled={cacheLoading}
                    className="w-full text-left px-4 py-3 text-sm text-nexus-text hover:bg-nexus-bg transition-colors disabled:opacity-50"
                  >
                    {cacheLoading ? 'Limpando...' : 'Limpar Cache'}
                  </button>
                  <hr className="border-nexus-border" />
                  <button
                    onClick={() => {
                      signOut();
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-nexus-bg transition-colors"
                  >
                    Sair
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: date range pill with functional calendar */}
      <div className="hidden lg:flex justify-end mt-1">
        <div className="relative" ref={calRef}>
          <button
            onClick={() => setCalOpen(prev => !prev)}
            className="flex items-center gap-2 px-3 py-1 rounded-lg border text-xs transition-all"
            style={{
              borderColor: calOpen ? 'var(--nexus-gold)' : 'var(--nexus-border)',
              color: calOpen ? 'var(--nexus-gold)' : 'var(--nexus-muted)',
              background: 'var(--nexus-bg-soft)',
            }}
            onMouseEnter={e => {
              if (!calOpen) {
                e.currentTarget.style.borderColor = 'var(--nexus-gold)';
                e.currentTarget.style.color = 'var(--nexus-gold)';
              }
            }}
            onMouseLeave={e => {
              if (!calOpen) {
                e.currentTarget.style.borderColor = 'var(--nexus-border)';
                e.currentTarget.style.color = 'var(--nexus-muted)';
              }
            }}
          >
            <CalendarIcon className="w-3.5 h-3.5" style={{ color: 'var(--nexus-gold)' }} />
            <span>{dateLabel}</span>
            <ChevronDownIcon
              className="w-3 h-3 transition-transform"
              style={{ transform: calOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </button>

          {calOpen && (
            <DateRangePicker
              startDate={dateRange.start}
              endDate={dateRange.end}
              onApply={(start, end) => setDateRange({ start, end })}
              onClose={() => setCalOpen(false)}
            />
          )}
        </div>
      </div>
    </header>
  );
}
