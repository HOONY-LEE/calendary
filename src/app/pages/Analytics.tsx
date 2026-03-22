import { useState } from 'react';
import { TrendingUp, Target, Zap, Award } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { SegmentTabs } from '../components/SegmentTabs';
import { useTranslation } from 'react-i18next';

// Generate mock data for the last 12 months
const generateHeatmapData = () => {
  const data: { date: Date; count: number; percentage: number }[] = [];
  const today = new Date(2026, 1, 27); // Feb 27, 2026
  
  for (let i = 364; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const count = Math.floor(Math.random() * 15);
    const percentage = Math.min(100, count * 10);
    data.push({ date, count, percentage });
  }
  return data;
};

const getColorIntensity = (percentage: number) => {
  if (percentage === 0) return 'bg-secondary';
  if (percentage < 25) return 'bg-success/20';
  if (percentage < 50) return 'bg-success/40';
  if (percentage < 75) return 'bg-success/60';
  if (percentage < 100) return 'bg-success/80';
  return 'bg-success';
};

export function Analytics() {
  const { t, i18n } = useTranslation();
  const [heatmapData] = useState(generateHeatmapData());
  const [selectedDay, setSelectedDay] = useState<typeof heatmapData[0] | null>(null);
  const [timePeriod, setTimePeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('yearly');

  const monthlyStats = {
    totalCompleted: 156,
    weeklyAverage: 22,
    currentStreak: 7,
    longestStreak: 21,
    completionRate: 87,
  };

  // Group data by weeks
  const weeks: typeof heatmapData[][] = [];
  let currentWeek: typeof heatmapData = [];
  
  heatmapData.forEach((day, index) => {
    currentWeek.push(day);
    if (day.date.getDay() === 6 || index === heatmapData.length - 1) {
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
  });

  const months = i18n.language === 'ko'
    ? ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const weekDays = i18n.language === 'ko' 
    ? ['월', '화', '수', '목', '금', '토', '일']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="p-3 lg:px-4 lg:py-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">{t('analytics.title')}</h1>
        <p className="text-muted-foreground">{t('analytics.overview')}</p>
      </div>

      {/* Time Period Tabs */}
      <div className="mb-6">
        <SegmentTabs
          value={timePeriod}
          onValueChange={setTimePeriod}
          options={[
            { value: 'daily', label: i18n.language === 'ko' ? '일간' : 'Daily' },
            { value: 'weekly', label: i18n.language === 'ko' ? '주간' : 'Weekly' },
            { value: 'monthly', label: i18n.language === 'ko' ? '월간' : 'Monthly' },
            { value: 'yearly', label: i18n.language === 'ko' ? '연간' : 'Yearly' },
          ]}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Target}
          value={`${monthlyStats.completionRate}%`}
          label={t('dashboard.completionRate')}
          iconColor="text-primary"
          iconBgColor="bg-primary/10"
        />

        <StatCard
          icon={TrendingUp}
          value={monthlyStats.totalCompleted}
          label={t('analytics.totalCompleted')}
          iconColor="text-success"
          iconBgColor="bg-success/20"
        />

        <StatCard
          icon={Zap}
          value={`${monthlyStats.currentStreak}`}
          label={t('analytics.streakDays')}
          iconColor="text-warning"
          iconBgColor="bg-warning/20"
        />

        <StatCard
          icon={Award}
          value={`${monthlyStats.longestStreak}`}
          label="Longest Streak"
          iconColor="text-accent"
          iconBgColor="bg-accent/20"
        />
      </div>

      {/* GitHub Style Heatmap */}
      <div className="bg-card rounded-2xl p-6 border border-border mb-8">
        <h3 className="font-semibold mb-6">연간 수행률</h3>
        
        <div className="overflow-x-auto">
          <div className="inline-flex flex-col gap-1 min-w-max">
            {/* Week day labels */}
            <div className="flex gap-1 mb-2">
              <div className="w-8"></div>
              {weekDays.map((day, i) => (
                <div key={i} className="text-xs text-muted-foreground w-3">
                  {i % 2 === 0 ? day : ''}
                </div>
              ))}
            </div>

            {/* Heatmap grid */}
            <div className="flex gap-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {/* Month labels */}
                  {weekIndex === 0 || week[0]?.date.getDate() === 1 ? (
                    <div className="text-xs text-muted-foreground h-3 mb-1">
                      {months[week[0]?.date.getMonth()]}
                    </div>
                  ) : (
                    <div className="h-3 mb-1"></div>
                  )}
                  
                  {/* Days */}
                  {Array.from({ length: 7 }).map((_, dayIndex) => {
                    const day = week.find(d => d.date.getDay() === dayIndex);
                    if (!day) return <div key={dayIndex} className="w-3 h-3"></div>;
                    
                    return (
                      <div
                        key={dayIndex}
                        className={`w-3 h-3 rounded-sm cursor-pointer transition-all duration-200 hover:ring-2 hover:ring-primary ${getColorIntensity(day.percentage)}`}
                        onMouseEnter={() => setSelectedDay(day)}
                        onMouseLeave={() => setSelectedDay(null)}
                        title={`${day.date.toLocaleDateString()}: ${day.count} tasks (${day.percentage}%)`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hover info */}
        {selectedDay && (
          <div className="mt-4 p-4 bg-secondary rounded-xl">
            <p className="text-sm font-medium mb-1">
              {selectedDay.date.toLocaleDateString('ko-KR', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'long'
              })}
            </p>
            <p className="text-sm text-muted-foreground">
              완료: {selectedDay.count}개 · 수행률: {selectedDay.percentage}%
            </p>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-2 mt-6 text-xs text-muted-foreground">
          <span>적음</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-sm bg-secondary"></div>
            <div className="w-3 h-3 rounded-sm bg-success/20"></div>
            <div className="w-3 h-3 rounded-sm bg-success/40"></div>
            <div className="w-3 h-3 rounded-sm bg-success/60"></div>
            <div className="w-3 h-3 rounded-sm bg-success/80"></div>
            <div className="w-3 h-3 rounded-sm bg-success"></div>
          </div>
          <span>많음</span>
        </div>
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl p-6 border border-border">
          <h3 className="font-semibold mb-4">주간 평균</h3>
          <div className="space-y-3">
            {weekDays.map((day, index) => {
              const value = Math.floor(Math.random() * 100);
              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1 text-sm">
                    <span>{day}요일</span>
                    <span className="text-muted-foreground">{value}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card rounded-2xl p-6 border border-border">
          <h3 className="font-semibold mb-4">카테고리별 통계</h3>
          <div className="space-y-3">
            {['개발', '디자인', '회의', '학습', '운동'].map((category, index) => {
              const value = Math.floor(Math.random() * 50) + 20;
              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1 text-sm">
                    <span>{category}</span>
                    <span className="text-muted-foreground">{value}개</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-500"
                      style={{ width: `${(value / 70) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}