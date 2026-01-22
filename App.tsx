
import React, { useState, useEffect, useCallback } from 'react';
import { AuthUser, TabType, Student, TeacherSchedule } from './types';
import { COPYRIGHT } from './constants';
import Login from './components/Login';
import TabStudentList from './components/TabStudentList';
import TabAttendance from './components/TabAttendance';
import TabAddStudent from './components/TabAddStudent';
import TabPayTuition from './components/TabPayTuition';
import TabStatistics from './components/TabStatistics';
import TabTeacherSchedule from './components/TabTeacherSchedule';
import { fetchStudents, fetchTeacherSchedules } from './services/apiService';

const App: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>(TabType.LIST);
  const [students, setStudents] = useState<Student[]>([]);
  const [teacherSchedules, setTeacherSchedules] = useState<TeacherSchedule[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch both students and teacher schedules concurrently
      const [studentsData, schedulesData] = await Promise.all([
        fetchStudents(),
        fetchTeacherSchedules()
      ]);
      setStudents(studentsData || []);
      setTeacherSchedules(schedulesData || []);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-emerald-50">
      {/* Header */}
      <header className="bg-emerald-900 text-white p-4 shadow-md sticky top-0 z-50 no-print">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white p-2 rounded-xl shadow-lg">
              <svg className="w-10 h-10 text-emerald-900" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.382 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black uppercase tracking-tighter leading-tight">QUẢN LÝ LỚP HỌC CỦA LÊ XUÂN NƯỚC</h1>
              <p className="text-[10px] text-emerald-300 font-medium">Hệ thống đào tạo chuyên nghiệp</p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            {/* Copyright top-right */}
            <div className="text-[9px] md:text-[10px] text-white font-black tracking-widest uppercase italic bg-emerald-800/50 px-4 py-1.5 rounded-full border border-emerald-700/50 mb-2 shadow-inner">
              {COPYRIGHT}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs bg-emerald-800 px-2 py-1 rounded border border-emerald-700">Chào, <span className="font-bold">{user.name}</span></span>
              <button 
                onClick={() => setUser(null)} 
                className="bg-emerald-700 hover:bg-red-700 px-3 py-1 rounded text-xs transition font-bold"
              >
                Thoát
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-emerald-800 text-white no-print shadow-xl overflow-x-auto scrollbar-hide border-b border-emerald-700">
        <div className="container mx-auto flex whitespace-nowrap">
          {[
            { id: TabType.LIST, label: 'Danh sách học sinh' },
            { id: TabType.ATTENDANCE, label: 'Điểm danh' },
            { id: TabType.ADD, label: 'Thêm học sinh' },
            { id: TabType.TUITION, label: 'Đóng phí' },
            { id: TabType.STATS, label: 'Thống kê' },
            { id: TabType.TEACHER_SCHEDULE, label: 'Lịch dạy giáo viên' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 font-bold text-xs md:text-sm uppercase transition tracking-widest border-r border-emerald-700/50 ${activeTab === tab.id ? 'bg-white text-emerald-900 border-b-4 border-emerald-500' : 'hover:bg-emerald-700/50'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow container mx-auto p-4 md:p-6 pb-24">
        {loading ? (
          <div className="flex flex-col justify-center items-center h-96">
             <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-emerald-900 border-opacity-50"></div>
             <p className="mt-4 text-emerald-900 font-bold animate-pulse uppercase text-xs tracking-widest">Đang kết nối cơ sở dữ liệu...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-2xl p-4 md:p-8 min-h-[600px] border border-emerald-100">
            {activeTab === TabType.LIST && <TabStudentList students={students} teacherSchedules={teacherSchedules} onRefresh={loadData} />}
            {activeTab === TabType.ATTENDANCE && <TabAttendance students={students} onRefresh={loadData} />}
            {activeTab === TabType.ADD && <TabAddStudent teacherSchedules={teacherSchedules} onRefresh={loadData} />}
            {activeTab === TabType.TUITION && <TabPayTuition students={students} onRefresh={loadData} />}
            {activeTab === TabType.STATS && <TabStatistics students={students} />}
            {activeTab === TabType.TEACHER_SCHEDULE && <TabTeacherSchedule schedules={teacherSchedules} onRefresh={loadData} />}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-emerald-950 text-emerald-400 p-6 text-center text-xs no-print border-t border-emerald-900">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="opacity-70 font-medium tracking-tight uppercase">© 2024 QUẢN LÝ LỚP HỌC LÊ XUÂN NƯỚC</p>
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping"></div>
            <p className="font-black tracking-widest uppercase italic">{COPYRIGHT}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
