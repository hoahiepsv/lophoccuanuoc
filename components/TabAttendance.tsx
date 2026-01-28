
import React, { useState, useMemo } from 'react';
import { Student } from '../types';
import { updateStudent } from '../services/apiService';
import { GRADES } from '../constants';

interface TabAttendanceProps {
  students: Student[];
  onRefresh: () => void;
}

const TabAttendance: React.FC<TabAttendanceProps> = ({ students, onRefresh }) => {
  const [mode, setMode] = useState<'today' | 'history'>('today');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  
  // State cho điểm danh theo ngày
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [pendingChanges, setPendingChanges] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  // Hàm chuẩn hóa ngày về dạng D/M/YYYY để so khớp chính xác với Google Sheets
  const normalizeDateStr = (dateInput: string) => {
    if (!dateInput) return "";
    // Xử lý cả dạng YYYY-MM-DD (từ input date) và DD/MM/YYYY (từ hệ thống)
    let d, m, y;
    if (dateInput.includes('-')) {
      [y, m, d] = dateInput.split('-');
    } else {
      [d, m, y] = dateInput.split('/');
    }
    return `${parseInt(d)}/${parseInt(m)}/${y}`;
  };

  const todayNormalized = useMemo(() => normalizeDateStr(new Date().toLocaleDateString('vi-VN')), []);
  const selectedNormalized = useMemo(() => normalizeDateStr(selectedDate), [selectedDate]);

  // Xác định ngày đang thao tác dựa trên chế độ
  const activeDateStr = mode === 'today' ? todayNormalized : selectedNormalized;

  // Toggle học sinh vào danh sách thay đổi tạm thời
  const toggleAbsent = (stt: number) => {
    setPendingChanges(prev => 
      prev.includes(stt) ? prev.filter(id => id !== stt) : [...prev, stt]
    );
  };

  const handleSave = async () => {
    if (pendingChanges.length === 0) {
      alert("Chưa có thay đổi nào để lưu!");
      return;
    }

    setSaving(true);
    let count = 0;
    
    for (const stt of pendingChanges) {
      const s = students.find(std => std.stt === stt);
      if (s) {
        let currentAttendance: string[] = [];
        try { 
          // Chuẩn hóa toàn bộ mảng attendance hiện có để tránh sai lệch định dạng
          const rawAttendance = JSON.parse(s.attendance || '[]');
          currentAttendance = Array.isArray(rawAttendance) ? rawAttendance.map(d => normalizeDateStr(d)) : [];
        } catch(e) {}
        
        let newAttendance: string[];
        if (currentAttendance.includes(activeDateStr)) {
          // Nếu đã vắng -> Chuyển thành Có mặt (Xóa ngày vắng)
          newAttendance = currentAttendance.filter(d => d !== activeDateStr);
        } else {
          // Nếu đang có mặt -> Chuyển thành Vắng (Thêm ngày vắng)
          newAttendance = [...currentAttendance, activeDateStr];
        }
        
        const success = await updateStudent({ ...s, attendance: JSON.stringify(newAttendance) });
        if (success) count++;
      }
    }

    alert(`Đã cập nhật dữ liệu cho ${count} học sinh ngày ${activeDateStr}`);
    setPendingChanges([]);
    setSaving(false);
    onRefresh();
  };

  // Lọc danh sách học sinh
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchGrade = filterGrade === 'all' || s.grade.toString() === filterGrade.toString();
      const matchSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.phone1.includes(searchTerm) || 
                          s.className.toLowerCase().includes(searchTerm.toLowerCase());
      return matchGrade && matchSearch;
    });
  }, [students, filterGrade, searchTerm]);

  return (
    <div className="space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
        <div className="flex-1">
          <h2 className="text-2xl font-black text-emerald-900 uppercase tracking-tight">
            {mode === 'today' ? `Điểm danh hôm nay (${activeDateStr})` : `Điểm danh ngày ${activeDateStr}`}
          </h2>
          <p className="text-xs text-emerald-600 font-medium italic">
            {mode === 'today' ? "Đánh dấu nhanh vắng mặt cho buổi học hiện tại" : "Xem lại lịch sử và điểm danh bổ sung cho ngày đã chọn"}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 justify-center md:justify-end">
          {mode === 'history' && (
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-emerald-200 shadow-sm">
              <label className="text-[10px] font-black uppercase text-emerald-800">Chọn ngày:</label>
              <input 
                type="date" 
                className="text-xs font-bold bg-transparent outline-none cursor-pointer"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setPendingChanges([]); 
                }}
              />
            </div>
          )}

          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-emerald-200 shadow-sm">
            <label className="text-[10px] font-black uppercase text-emerald-800">Nhóm:</label>
            <select 
              className="text-xs font-bold bg-transparent outline-none cursor-pointer"
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
            >
              <option value="all">TẤT CẢ</option>
              {GRADES.map(g => <option key={g} value={g}>NHÓM {g}</option>)}
              <option value="Kèm riêng">KÈM RIÊNG</option>
            </select>
          </div>

          <button 
            onClick={() => {
              setMode(mode === 'today' ? 'history' : 'today');
              setPendingChanges([]);
            }}
            className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-widest transition border border-emerald-200"
          >
            {mode === 'today' ? "📅 ĐIỂM DANH NGÀY KHÁC" : "⚡ VỀ HÔM NAY"}
          </button>
          
          <button 
            onClick={handleSave}
            disabled={saving || pendingChanges.length === 0}
            className={`font-black px-8 py-2.5 rounded-xl shadow-lg transition transform active:scale-95 disabled:opacity-50 text-xs uppercase tracking-widest ${
              pendingChanges.length > 0 ? 'bg-orange-600 hover:bg-orange-700 text-white animate-pulse' : 'bg-emerald-700 text-white'
            }`}
          >
            {saving ? "ĐANG LƯU..." : pendingChanges.length > 0 ? `LƯU ${pendingChanges.length} THAY ĐỔI` : "LƯU ĐIỂM DANH"}
          </button>
        </div>
      </div>

      {/* Thanh tìm kiếm */}
      <div className="relative max-w-md mx-auto">
        <input 
          type="text" 
          placeholder="Tìm tên, lớp, sđt..." 
          className="w-full border-2 border-emerald-50 rounded-2xl p-4 pl-12 font-bold shadow-sm outline-none focus:border-emerald-500 transition"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      </div>

      {/* Lưới học sinh */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fadeIn">
        {filteredStudents.length > 0 ? filteredStudents.map(s => {
          let attendanceArr: string[] = [];
          try { 
            const raw = JSON.parse(s.attendance || '[]');
            attendanceArr = Array.isArray(raw) ? raw.map(d => normalizeDateStr(d)) : [];
          } catch(e) {}
          
          const isAlreadyAbsent = attendanceArr.includes(activeDateStr);
          const isChanged = pendingChanges.includes(s.stt);
          
          // Trạng thái cuối cùng hiển thị trên UI
          const willBeAbsent = isChanged ? !isAlreadyAbsent : isAlreadyAbsent;

          return (
            <div 
              key={s.stt}
              onClick={() => toggleAbsent(s.stt)}
              className={`relative p-5 rounded-2xl border-2 transition-all transform active:scale-95 flex items-center gap-4 cursor-pointer group ${
                willBeAbsent
                  ? isAlreadyAbsent 
                    ? 'bg-red-50 border-red-500 shadow-sm' // Đã vắng trong DB cho ngày này
                    : 'bg-orange-50 border-orange-500 shadow-md scale-[1.02] border-dashed' // Vừa mới stick thêm vắng
                  : isAlreadyAbsent
                    ? 'bg-emerald-50 border-emerald-500 border-dashed opacity-80' // Đang chọn để XÓA vắng (chuyển thành có mặt)
                    : 'bg-white border-gray-100 hover:border-emerald-200' // Có mặt bình thường
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg transition-colors ${
                willBeAbsent 
                  ? isAlreadyAbsent ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
                  : 'bg-emerald-50 text-emerald-700'
              }`}>
                {s.fullName.charAt(0)}
              </div>
              <div className="flex-1 overflow-hidden">
                <h4 className={`font-black text-sm uppercase truncate ${
                  willBeAbsent ? 'text-red-700' : 'text-emerald-900'
                }`}>{s.fullName}</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Lớp {s.className} - Nhóm {s.grade}</p>
              </div>
              
              {isChanged && (
                <div className={`absolute -top-2 -right-2 px-2 py-0.5 rounded text-[8px] font-black uppercase shadow-sm animate-bounce ${
                  willBeAbsent ? 'bg-orange-500 text-white' : 'bg-emerald-600 text-white'
                }`}>
                  {willBeAbsent ? '+ Vắng' : '- Có mặt'}
                </div>
              )}

              {willBeAbsent && (
                <div className={isAlreadyAbsent ? "text-red-500" : "text-orange-500"}>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                </div>
              )}
            </div>
          );
        }) : (
          <div className="col-span-full py-20 text-center text-gray-400 italic">
            Không tìm thấy học sinh nào phù hợp
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-center gap-3">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-[10px] font-black uppercase text-red-800">Đã vắng (Lịch sử)</span>
        </div>
        <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex items-center gap-3">
          <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-black uppercase text-orange-800">Mới đánh dấu vắng (Chờ lưu)</span>
        </div>
        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center gap-3">
          <div className="w-3 h-3 bg-white border border-gray-300 rounded-full"></div>
          <span className="text-[10px] font-black uppercase text-emerald-800">Có mặt / Đi học đủ</span>
        </div>
      </div>
    </div>
  );
};

export default TabAttendance;
