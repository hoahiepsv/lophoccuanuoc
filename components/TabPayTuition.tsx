
import React, { useState, useMemo, useEffect } from 'react';
import { Student } from '../types';
import { updateStudent } from '../services/apiService';
import { GRADES } from '../constants';

interface TabPayTuitionProps {
  students: Student[];
  onRefresh: () => void;
}

const TabPayTuition: React.FC<TabPayTuitionProps> = ({ students, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [selectedStudentStt, setSelectedStudentStt] = useState<number | null>(null);
  const [tuitionYear, setTuitionYear] = useState<number>(new Date().getFullYear());
  const [saving, setSaving] = useState(false);
  
  // Local state to hold selections before saving to database
  const [localPaidMonths, setLocalPaidMonths] = useState<string[]>([]);

  // Find the selected student object
  const selectedStudent = useMemo(() => 
    students.find(s => s.stt === selectedStudentStt), 
    [students, selectedStudentStt]
  );

  // Sync local state when student selection changes
  useEffect(() => {
    if (selectedStudent) {
      try {
        setLocalPaidMonths(JSON.parse(selectedStudent.tuition || '[]'));
      } catch (e) {
        setLocalPaidMonths([]);
      }
    } else {
      setLocalPaidMonths([]);
    }
  }, [selectedStudentStt, students]);

  // Search filter and Grade filter
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchGrade = filterGrade === 'all' || s.grade.toString() === filterGrade.toString();
      const matchSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.phone1.includes(searchTerm);
      return matchGrade && matchSearch;
    });
    // Đã gỡ bỏ .slice(0, 10) để cuộn hết danh sách
  }, [students, searchTerm, filterGrade]);

  const toggleMonth = (month: number) => {
    const key = `${month}/${tuitionYear}`;
    setLocalPaidMonths(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleUpdate = async () => {
    if (!selectedStudent) return;

    setSaving(true);
    const updatedStudent = {
      ...selectedStudent,
      tuition: JSON.stringify(localPaidMonths)
    };

    const success = await updateStudent(updatedStudent);
    if (success) {
      alert(`Đã cập nhật trạng thái học phí cho học sinh ${selectedStudent.fullName} thành công!`);
      onRefresh();
    } else {
      alert("Lỗi khi kết nối máy chủ. Vui lòng thử lại sau.");
    }
    setSaving(false);
  };

  // Check if there are changes compared to the original data
  const hasChanges = useMemo(() => {
    if (!selectedStudent) return false;
    let original: string[] = [];
    try { original = JSON.parse(selectedStudent.tuition || '[]'); } catch(e) {}
    
    if (original.length !== localPaidMonths.length) return true;
    const sortedOriginal = [...original].sort();
    const sortedLocal = [...localPaidMonths].sort();
    return JSON.stringify(sortedOriginal) !== JSON.stringify(sortedLocal);
  }, [selectedStudent, localPaidMonths]);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-emerald-900 uppercase tracking-widest flex items-center justify-center gap-3">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2-2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          Ghi nhận đóng học phí
        </h2>
        <p className="text-emerald-600 font-medium italic">Chọn học sinh, tick chọn các tháng đã đóng phí và bấm Cập Nhật</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Panel: Search, Filter & Select */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-emerald-50 p-6 rounded-3xl border-2 border-emerald-100 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-emerald-800 mb-1.5 ml-1 tracking-widest">Nhóm:</label>
                <select 
                  className="w-full border-2 border-white bg-white rounded-xl p-3 text-xs font-bold shadow-sm outline-none focus:border-emerald-500 appearance-none"
                  value={filterGrade}
                  onChange={(e) => setFilterGrade(e.target.value)}
                >
                  <option value="all">TẤT CẢ NHÓM</option>
                  {GRADES.map(g => <option key={g} value={g}>NHÓM {g}</option>)}
                  <option value="Kèm riêng">KÈM RIÊNG</option>
                  <option value="Đã thôi học">ĐÃ THÔI HỌC</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-emerald-800 mb-1.5 ml-1 tracking-widest">Tìm tên/SĐT:</label>
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Tìm..."
                    className="w-full border-2 border-white bg-white rounded-xl p-3 pl-10 text-xs font-bold shadow-sm outline-none focus:border-emerald-500 transition"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
              {filteredStudents.length > 0 ? filteredStudents.map(s => (
                <button
                  key={s.stt}
                  onClick={() => setSelectedStudentStt(s.stt)}
                  className={`w-full p-4 rounded-2xl flex items-center justify-between transition group border-2 ${
                    selectedStudentStt === s.stt 
                      ? 'bg-emerald-900 text-white border-emerald-900 shadow-lg' 
                      : 'bg-white border-white hover:border-emerald-200 text-emerald-900'
                  }`}
                >
                  <div className="text-left">
                    <p className="font-black text-sm uppercase">{s.fullName}</p>
                    <p className={`text-[10px] uppercase font-bold tracking-tighter ${selectedStudentStt === s.stt ? 'text-emerald-300' : 'text-emerald-500'}`}>
                      Lớp {s.className} - {s.grade === 'Đã thôi học' ? 'Thôi học' : s.grade === 'Kèm riêng' ? 'Kèm riêng' : `Nhóm ${s.grade}`}
                    </p>
                  </div>
                  <div className={`text-[10px] font-mono px-2 py-1 rounded ${selectedStudentStt === s.stt ? 'bg-emerald-800' : 'bg-emerald-50 text-emerald-700'}`}>
                    {s.phone1}
                  </div>
                </button>
              )) : (
                <div className="text-center py-10 text-emerald-300 italic text-sm">Không tìm thấy học sinh phù hợp</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Tuition Grid */}
        <div className="lg:col-span-7">
          {selectedStudent ? (
            <div className="bg-emerald-900 text-emerald-50 p-8 rounded-[2.5rem] shadow-2xl space-y-8 animate-fadeIn flex flex-col h-full">
              <div className="flex justify-between items-start border-b border-emerald-800 pb-6">
                <div>
                  <h3 className="text-xl font-black uppercase text-white tracking-widest">{selectedStudent.fullName}</h3>
                  <p className="text-emerald-400 text-xs font-bold uppercase mt-1">Hồ sơ #STT{selectedStudent.stt} — Lớp {selectedStudent.className}</p>
                </div>
                <div className="bg-emerald-800 px-4 py-2 rounded-2xl border border-emerald-700">
                  <p className="text-[9px] font-black uppercase text-emerald-400 text-center mb-1 tracking-widest">Năm học</p>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setTuitionYear(prev => prev - 1)} className="hover:text-emerald-400 font-bold">❮</button>
                    <span className="font-black text-lg min-w-[50px] text-center">{tuitionYear}</span>
                    <button onClick={() => setTuitionYear(prev => prev + 1)} className="hover:text-emerald-400 font-bold">❯</button>
                  </div>
                </div>
              </div>

              <div className="space-y-4 flex-grow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-black uppercase tracking-widest">Danh sách đóng phí năm {tuitionYear}</span>
                  </div>
                  {hasChanges && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold animate-pulse">CÓ THAY ĐỔI CHƯA LƯU</span>
                  )}
                </div>
                
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                    const isPaid = localPaidMonths.includes(`${m}/${tuitionYear}`);
                    return (
                      <button
                        key={m}
                        type="button"
                        disabled={saving}
                        onClick={() => toggleMonth(m)}
                        className={`py-5 rounded-2xl text-xs font-black transition border-2 uppercase tracking-widest flex flex-col items-center justify-center gap-1 ${
                          isPaid 
                            ? 'bg-emerald-500 text-emerald-950 border-emerald-400 shadow-lg shadow-emerald-500/20' 
                            : 'border-emerald-800 text-emerald-600 hover:border-emerald-500 hover:text-emerald-500'
                        }`}
                      >
                        <span className="opacity-60 text-[9px]">THÁNG</span>
                        <span className="text-lg">{m}</span>
                        {isPaid && <svg className="w-4 h-4 mt-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="bg-emerald-800/40 p-5 rounded-3xl border border-emerald-700/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-500 text-emerald-950 w-10 h-10 rounded-xl flex items-center justify-center font-black">
                      {localPaidMonths.filter((k: string) => k.endsWith(`/${tuitionYear}`)).length}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Tổng tháng đã đóng</p>
                      <p className="text-xs text-white font-medium italic opacity-70">Trong năm {tuitionYear}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Ngày tham gia</p>
                    <p className="text-sm text-white font-black">{selectedStudent.startDate}</p>
                  </div>
                </div>

                <button
                  onClick={handleUpdate}
                  disabled={saving || !hasChanges}
                  className={`w-full py-5 rounded-2xl text-sm font-black uppercase tracking-widest shadow-2xl transition transform active:scale-95 flex items-center justify-center gap-3 ${
                    hasChanges 
                      ? 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400' 
                      : 'bg-emerald-800 text-emerald-700 cursor-not-allowed border border-emerald-700'
                  }`}
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-emerald-950 border-t-transparent rounded-full animate-spin"></div>
                      ĐANG CẬP NHẬT...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                      CẬP NHẬT HỌC PHÍ
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full bg-white border-2 border-dashed border-emerald-200 rounded-[2.5rem] flex flex-col items-center justify-center p-12 text-center space-y-4">
              <div className="bg-emerald-50 p-6 rounded-full text-emerald-200">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
              <div>
                <h4 className="text-lg font-black text-emerald-900 uppercase tracking-widest">Chưa chọn học sinh</h4>
                <p className="text-emerald-500 text-sm font-medium italic">Vui lòng chọn một học sinh từ danh sách bên trái để bắt đầu ghi nhận học phí</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TabPayTuition;
