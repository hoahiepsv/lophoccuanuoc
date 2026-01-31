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
  const [showSettings, setShowSettings] = useState<boolean>(false);
  
  // API Key Management
  const [userApiKey, setUserApiKey] = useState<string>('');
  const [isEditingKey, setIsEditingKey] = useState<boolean>(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('USER_API_KEY');
    if (savedKey) {
      setUserApiKey(savedKey);
      setIsEditingKey(false);
    } else {
      setIsEditingKey(true);
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
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

  const handleSaveApiKey = () => {
    if (!userApiKey.trim()) {
      alert("Vui lòng nhập mã API Key!");
      return;
    }
    localStorage.setItem('USER_API_KEY', userApiKey.trim());
    setIsEditingKey(false);
    setShowSettings(false); // Tự động ẩn sau khi lưu
    alert("Đã lưu API Key vào trình duyệt!");
  };

  const handleEditApiKey = () => {
    setIsEditingKey(true);
  };

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-emerald-50">
      {/* Header Compact */}
      <header className="bg-emerald-900 text-white py-2 px-4 shadow-md sticky top-0 z-50 no-print">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-2 md:gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1.5 rounded-lg shadow-sm">
              <svg className="w-7 h-7 text-emerald-900" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.382 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base md:text-lg font-black uppercase tracking-tight leading-none">QUẢN LÝ LỚP HỌC LÊ XUÂN NƯỚC</h1>
              <p className="text-[9px] text-emerald-300 font-medium uppercase tracking-wider">Hệ thống đào tạo chuyên nghiệp</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex items-center">
               <button 
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 bg-emerald-800 rounded-full hover:bg-emerald-700 transition border border-emerald-700 shadow-inner"
               >
                 <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
               </button>
               
               {showSettings && (
                 <>
                   {/* Backdrop để tắt khi click ngoài trên mobile */}
                   <div className="fixed inset-0 bg-black/20 z-[55] md:hidden" onClick={() => setShowSettings(false)}></div>
                   
                   <div className="fixed md:absolute right-4 left-4 md:left-auto md:right-0 top-16 md:top-full mt-2 w-auto md:w-72 bg-white rounded-xl shadow-2xl p-4 border border-emerald-100 animate-fadeIn z-[60]">
                      <div className="flex justify-between items-center mb-3 border-b border-emerald-50 pb-2">
                        <p className="text-[10px] font-black text-emerald-900 uppercase flex items-center gap-2">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" /></svg>
                          Cài đặt API Gemini
                        </p>
                        <button onClick={() => setShowSettings(false)} className="md:hidden text-gray-400 hover:text-red-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                      <div className="space-y-3">
                        <input 
                          type={isEditingKey ? "text" : "password"}
                          placeholder="Nhập API Key..."
                          value={userApiKey}
                          onChange={(e) => setUserApiKey(e.target.value)}
                          disabled={!isEditingKey}
                          className={`w-full px-3 py-2 text-[10px] font-mono rounded-lg border-2 outline-none transition ${isEditingKey ? 'bg-white border-emerald-200 focus:border-emerald-500' : 'bg-gray-50 border-transparent text-gray-400 cursor-not-allowed'}`}
                        />
                        <button 
                          onClick={isEditingKey ? handleSaveApiKey : handleEditApiKey}
                          className={`w-full text-[10px] font-black py-2 rounded-lg transition shadow-md uppercase tracking-widest flex items-center justify-center gap-2 ${isEditingKey ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'}`}
                        >
                          {isEditingKey ? (
                            <>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                              LƯU (SAVE)
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              CHỈNH SỬA (EDIT)
                            </>
                          )}
                        </button>
                        <p className="text-[8px] text-gray-400 italic text-center leading-tight">API Key được lưu bảo mật trong trình duyệt cá nhân của bạn.</p>
                      </div>
                   </div>
                 </>
               )}
            </div>

            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-emerald-800 px-2 py-0.5 rounded border border-emerald-700">
                  Chào, <span className="font-bold">{user.name}</span>
                </span>
                <button 
                  onClick={() => setUser(null)} 
                  className="bg-emerald-700 hover:bg-red-700 px-2 py-0.5 rounded text-[10px] transition font-bold"
                >
                  Thoát
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs - Slimmer height */}
      <nav className="bg-emerald-800 text-white no-print shadow-lg border-b border-emerald-700">
        <div className="container mx-auto flex overflow-x-auto scrollbar-hide">
          {[
            { id: TabType.LIST, label: 'Học sinh' },
            { id: TabType.ATTENDANCE, label: 'Điểm danh' },
            { id: TabType.ADD, label: 'Thêm mới' },
            { id: TabType.TUITION, label: 'Học phí' },
            { id: TabType.STATS, label: 'Thống kê' },
            { id: TabType.TEACHER_SCHEDULE, label: 'Lịch dạy' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 md:px-6 py-3 font-bold text-[10px] md:text-xs uppercase transition tracking-widest border-r border-emerald-700/50 ${activeTab === tab.id ? 'bg-white text-emerald-900 border-b-2 border-emerald-500' : 'hover:bg-emerald-700/50'}`}
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
             <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-emerald-900 border-opacity-50"></div>
             <p className="mt-4 text-emerald-900 font-bold animate-pulse uppercase text-[10px] tracking-widest">Đang kết nối cơ sở dữ liệu...</p>
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
      <footer className="bg-emerald-950 text-emerald-400 p-4 text-center text-[10px] no-print border-t border-emerald-900">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-2">
          <p className="opacity-70 font-medium tracking-tight uppercase">© 2024 QUẢN LÝ LỚP HỌC LÊ XUÂN NƯỚC</p>
          <div className="flex items-center gap-3">
            <div className="h-1 w-1 bg-emerald-500 rounded-full animate-ping"></div>
            <p className="font-black tracking-widest uppercase italic">{COPYRIGHT}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;