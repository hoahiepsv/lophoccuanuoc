import React, { useState, useMemo, useRef } from 'react';
import { Student } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { COPYRIGHT } from '../constants';

interface TabStatisticsProps {
  students: Student[];
}

const TabStatistics: React.FC<TabStatisticsProps> = ({ students }) => {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);

  const studentReportRef = useRef<HTMLDivElement>(null);
  const teacherReportRef = useRef<HTMLDivElement>(null);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const today = new Date();

  // Helper to extract the last name (common name) from full name
  const getLastName = (fullName: string) => {
    if (!fullName) return '';
    const parts = fullName.trim().split(/\s+/);
    return parts.length > 0 ? parts[parts.length - 1] : '';
  };

  const gradeWeight = (grade: string) => {
    if (grade === 'Đã thôi học') return 1000;
    if (grade === 'Kèm riêng') return 999;
    const n = parseInt(grade);
    return isNaN(n) ? 500 : n;
  };

  // Helper function to calculate student metrics for reports
  const getStudentMetrics = (s: Student) => {
    let scheduleDays: string[] = [];
    try { scheduleDays = JSON.parse(s.schedule || '[]'); } catch(e) {}
    
    let absentDays: string[] = [];
    try { absentDays = JSON.parse(s.attendance || '[]'); } catch(e) {}

    let paidMonths: string[] = [];
    try { paidMonths = JSON.parse(s.tuition || '[]'); } catch(e) {}

    const scheduledUpToNow = scheduleDays.filter(d => new Date(d) <= today).length;
    const absents = absentDays.length;
    const actualAttendance = Math.max(0, scheduledUpToNow - absents);

    // Detailed tuition status
    const formattedPaidMonths = paidMonths.sort((a, b) => {
      const [mA, yA] = a.split('/').map(Number);
      const [mB, yB] = b.split('/').map(Number);
      if (yA !== yB) return yA - yB;
      return mA - mB;
    }).map(item => {
      const [m, y] = item.split('/');
      return `T${m.padStart(2, '0')}/${y}`;
    });

    const currentKey = `${currentMonth}/${currentYear}`;
    const isPaidCurrent = paidMonths.includes(currentKey);

    return {
      scheduledUpToNow,
      absents,
      absentDates: absentDays,
      actualAttendance,
      paidCount: paidMonths.length,
      paidMonthsList: formattedPaidMonths,
      isPaidCurrent
    };
  };

  // Thống kê tình trạng học phí
  const tuitionStatus = useMemo(() => {
    const paidList: Student[] = [];
    const unpaidThisMonth: Student[] = [];
    const debtList: Student[] = []; 
    const currentKey = `${currentMonth}/${currentYear}`;

    students.forEach(s => {
      let paidKeys: string[] = [];
      try { paidKeys = JSON.parse(s.tuition || '[]'); } catch(e) {}
      const hasPaidThisMonth = paidKeys.includes(currentKey);
      
      if (hasPaidThisMonth) paidList.push(s);
      else unpaidThisMonth.push(s);

      const start = new Date(s.startDate);
      let temp = new Date(start.getFullYear(), start.getMonth(), 1);
      while (temp < new Date(today.getFullYear(), today.getMonth(), 1)) {
        const checkKey = `${temp.getMonth() + 1}/${temp.getFullYear()}`;
        if (!paidKeys.includes(checkKey)) {
          if (!debtList.includes(s)) debtList.push(s);
          break;
        }
        temp.setMonth(temp.getMonth() + 1);
      }
    });

    return { paidList, unpaidThisMonth, debtList };
  }, [students, currentMonth, currentYear]);

  // Phân tích chi tiết học sinh được chọn (Dùng cho UI và báo cáo đơn lẻ)
  const studentAnalysis = useMemo(() => {
    if (!selectedStudent) return null;
    
    const metrics = getStudentMetrics(selectedStudent);
    
    const startDate = new Date(selectedStudent.startDate);
    const unpaidMonthsList: string[] = [];
    let temp = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    while (temp < new Date(today.getFullYear(), today.getMonth() + 1, 1)) {
      const checkKey = `${temp.getMonth() + 1}/${temp.getFullYear()}`;
      try {
        const paidMonths = JSON.parse(selectedStudent.tuition || '[]');
        if (!paidMonths.includes(checkKey)) {
          unpaidMonthsList.push(`T${String(temp.getMonth() + 1).padStart(2, '0')}/${temp.getFullYear()}`);
        }
      } catch(e) {}
      temp.setMonth(temp.getMonth() + 1);
    }

    return {
      ...metrics,
      unpaidCount: unpaidMonthsList.length,
      unpaidMonthsList
    };
  }, [selectedStudent, today]);

  const statsData = [
    { name: 'Đã đóng', value: tuitionStatus.paidList.length, color: '#065f46' },
    { name: 'Chưa đóng', value: tuitionStatus.unpaidThisMonth.length, color: '#b91c1c' },
    { name: 'Nợ phí', value: tuitionStatus.debtList.length, color: '#c2410c' }
  ];

  const handleDownloadJPEG = async (ref: React.RefObject<HTMLDivElement>, fileName: string) => {
    if (!ref.current) return;
    setIsGeneratingImage(true);
    try {
      // @ts-ignore
      const canvas = await window.html2canvas(ref.current, {
        scale: 2, 
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
      const link = document.createElement('a');
      link.download = `${fileName}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Lỗi khi tạo ảnh:", error);
      alert("Không thể tạo ảnh báo cáo.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Off-screen Templates for JPEG Generation */}
      <div style={{ position: 'fixed', left: '-10000px', top: 0, zIndex: -1 }}>
        {/* Student Individual Template */}
        {selectedStudent && studentAnalysis && (
          <div 
            ref={studentReportRef}
            className="w-[800px] bg-white p-12 text-black flex flex-col gap-8 border-[12px] border-emerald-900"
          >
            <div className="flex justify-between items-center border-b-4 border-emerald-900 pb-6">
              <div>
                <h1 className="text-3xl font-black text-emerald-900 uppercase">PHIẾU BÁO CÁO HỌC TẬP</h1>
                <p className="text-lg font-bold text-gray-600">GIÁO VIÊN: LÊ XUÂN NƯỚC</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black">{selectedStudent.fullName}</p>
                <p className="text-sm font-bold text-emerald-700 uppercase">NHÓM {selectedStudent.grade} - LỚP {selectedStudent.className}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
               <div className="bg-emerald-50 p-6 rounded-3xl border-2 border-emerald-200 text-center">
                  <p className="text-[12px] font-black text-emerald-800 uppercase mb-2">Số buổi theo lịch</p>
                  <p className="text-4xl font-black text-emerald-900">{studentAnalysis.scheduledUpToNow}</p>
               </div>
               <div className="bg-blue-50 p-6 rounded-3xl border-2 border-blue-200 text-center">
                  <p className="text-[12px] font-black text-blue-800 uppercase mb-2">Số buổi đã học</p>
                  <p className="text-4xl font-black text-blue-900">{studentAnalysis.actualAttendance}</p>
               </div>
               <div className="bg-red-50 p-6 rounded-3xl border-2 border-red-200 text-center">
                  <p className="text-[12px] font-black text-red-800 uppercase mb-2">Số buổi vắng mặt</p>
                  <p className="text-4xl font-black text-red-900">{studentAnalysis.absents}</p>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
               <div className="bg-emerald-900 text-white p-8 rounded-[2.5rem] flex flex-col justify-between">
                  <p className="text-sm font-black uppercase opacity-60 mb-4 tracking-widest">Tình trạng học phí</p>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-4xl font-black">{studentAnalysis.paidCount}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest">Tháng đã đóng</p>
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-black text-emerald-400">{studentAnalysis.unpaidCount}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest">Tháng chưa đóng</p>
                    </div>
                  </div>
               </div>
               <div className="bg-gray-50 p-6 rounded-[2.5rem] border-2 border-gray-100 flex flex-col gap-3">
                  <p className="text-[12px] font-black text-gray-800 uppercase border-b border-gray-200 pb-2">Thông tin liên hệ</p>
                  <p className="text-sm"><b>SĐT:</b> {selectedStudent.phone1}</p>
                  <p className="text-sm"><b>Ngày bắt đầu:</b> {selectedStudent.startDate}</p>
                  <p className="text-[10px] italic text-gray-400 mt-auto">{COPYRIGHT}</p>
               </div>
            </div>

            <div className="space-y-6">
              {studentAnalysis.absentDates.length > 0 && (
                <div className="bg-red-50/50 p-6 rounded-3xl border border-red-100">
                  <p className="text-sm font-black text-red-800 uppercase mb-3">Chi tiết các ngày vắng:</p>
                  <div className="flex flex-wrap gap-2">
                    {studentAnalysis.absentDates.map(d => (
                      <span key={d} className="bg-white border border-red-200 px-3 py-1 rounded-xl text-xs font-bold text-red-700">{d}</span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100">
                <p className="text-sm font-black text-emerald-800 uppercase mb-3">Danh sách tháng chưa đóng phí:</p>
                <div className="flex flex-wrap gap-2">
                  {studentAnalysis.unpaidMonthsList.length > 0 ? studentAnalysis.unpaidMonthsList.map(m => (
                    <span key={m} className="bg-white border border-emerald-200 px-3 py-1 rounded-xl text-xs font-bold text-emerald-700">{m}</span>
                  )) : (
                    <span className="text-xs italic text-gray-400">Đã hoàn thành toàn bộ học phí tới hiện tại</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Teacher Class Report Template - Sorting Update */}
        <div 
          ref={teacherReportRef} 
          className="w-[1200px] bg-white p-12 text-black flex flex-col gap-10 border-[16px] border-emerald-900"
        >
            <div className="flex justify-between items-end border-b-8 border-emerald-900 pb-8">
                <div>
                  <h1 className="text-5xl font-black text-emerald-900 uppercase tracking-tighter">BÁO CÁO TỔNG QUAN LỚP HỌC</h1>
                  <p className="text-2xl font-bold text-gray-500 uppercase mt-2">GIÁO VIÊN: LÊ XUÂN NƯỚC | THÁNG {currentMonth}/{currentYear}</p>
                </div>
                <div className="text-right text-gray-400">
                  <p className="text-sm font-black uppercase tracking-[0.3em]">{COPYRIGHT}</p>
                </div>
            </div>
            
            <div className="grid grid-cols-4 gap-8">
                <div className="bg-emerald-900 text-white p-10 rounded-[2.5rem] shadow-xl">
                    <p className="text-[12px] font-black uppercase opacity-60 mb-2 tracking-widest">Tổng số học sinh</p>
                    <p className="text-6xl font-black">{students.length}</p>
                </div>
                <div className="bg-emerald-50 border-4 border-emerald-100 p-10 rounded-[2.5rem] shadow-lg">
                    <p className="text-[12px] font-black uppercase text-emerald-800 opacity-60 mb-2 tracking-widest">Đã đóng T.{currentMonth}</p>
                    <p className="text-6xl font-black text-emerald-900">{tuitionStatus.paidList.length}</p>
                </div>
                <div className="bg-red-50 border-4 border-red-100 p-10 rounded-[2.5rem] shadow-lg">
                    <p className="text-[12px] font-black uppercase text-red-800 opacity-60 mb-2 tracking-widest">Chưa đóng T.{currentMonth}</p>
                    <p className="text-6xl font-black text-red-700">{tuitionStatus.unpaidThisMonth.length}</p>
                </div>
                <div className="bg-orange-50 border-4 border-orange-100 p-10 rounded-[2.5rem] shadow-lg">
                    <p className="text-[12px] font-black uppercase text-orange-800 opacity-60 mb-2 tracking-widest">Học sinh nợ phí cũ</p>
                    <p className="text-6xl font-black text-orange-700">{tuitionStatus.debtList.length}</p>
                </div>
            </div>

            <div className="space-y-6">
                <h2 className="text-2xl font-black text-emerald-900 uppercase border-l-8 border-emerald-500 pl-4 py-1">DANH SÁCH CHI TIẾT HỌC SINH</h2>
                <div className="rounded-[2rem] border-4 border-emerald-100 overflow-hidden shadow-inner">
                  <table className="w-full border-collapse">
                    <thead className="bg-emerald-900 text-white text-[11px] font-black uppercase tracking-widest">
                      <tr>
                        <th className="px-4 py-5 text-left">Họ tên</th>
                        <th className="px-4 py-5 text-center">Nhóm-Lớp</th>
                        <th className="px-4 py-5 text-center">Ngày BĐ</th>
                        <th className="px-4 py-5 text-center">Đã học</th>
                        <th className="px-4 py-5 text-center">Vắng</th>
                        <th className="px-4 py-5 text-left">Số điện thoại</th>
                        <th className="px-4 py-5 text-left">Tình trạng học phí</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-50 bg-white">
                      {[...students].sort((a, b) => {
                        // 1. Nhóm
                        const gA = gradeWeight(String(a.grade));
                        const gB = gradeWeight(String(b.grade));
                        if (gA !== gB) return gA - gB;

                        // 2. Tên
                        const nameA = getLastName(a.fullName || '');
                        const nameB = getLastName(b.fullName || '');
                        return nameA.localeCompare(nameB, 'vi', { sensitivity: 'base' });
                      }).map(s => {
                        const m = getStudentMetrics(s);
                        return (
                          <tr key={s.stt} className="text-xs">
                            <td className="px-4 py-4 font-black text-emerald-950 border-r border-emerald-50">{s.fullName}</td>
                            <td className="px-4 py-4 text-center border-r border-emerald-50">
                              <span className="font-bold text-emerald-700">{s.grade} - {s.className}</span>
                            </td>
                            <td className="px-4 py-4 text-center font-bold text-gray-400 border-r border-emerald-50">{s.startDate}</td>
                            <td className="px-4 py-4 text-center border-r border-emerald-50 font-black text-blue-700">{m.actualAttendance}</td>
                            <td className="px-4 py-4 text-center border-r border-emerald-50 font-black text-red-500">{m.absents}</td>
                            <td className="px-4 py-4 font-bold border-r border-emerald-50">{s.phone1}</td>
                            <td className="px-4 py-4">
                              <div className="flex flex-wrap gap-1">
                                {m.paidMonthsList.slice(-4).map(month => (
                                  <span key={month} className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[8px] font-black border border-blue-100 whitespace-nowrap">
                                    {month}
                                  </span>
                                ))}
                                {m.paidMonthsList.length > 4 && <span className="text-[8px] font-bold opacity-30">...</span>}
                                {m.paidMonthsList.length === 0 && <span className="text-[9px] text-red-400 italic">Chưa đóng</span>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
            </div>
            
            <div className="flex justify-between items-center text-gray-300 italic pt-6 border-t border-gray-100">
               <p className="text-sm font-bold">NGÀY LẬP: {today.toLocaleDateString('vi-VN')}</p>
               <p className="text-sm font-bold uppercase tracking-widest">Hệ thống quản lý Lê Xuân Nước</p>
            </div>
        </div>
      </div>

      {/* Visible Dashboard Summary Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
        <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl shadow-sm">
          <p className="text-[10px] font-black uppercase text-emerald-800 opacity-60 mb-1">Đã đóng học phí T.{currentMonth}</p>
          <p className="text-4xl font-black text-emerald-900">{tuitionStatus.paidList.length}</p>
          <div className="mt-4 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
             {tuitionStatus.paidList.map(s => (
               <div key={s.stt} className="text-[10px] border-b border-emerald-100 pb-1 flex justify-between">
                 <span className="font-bold text-emerald-900">{s.fullName} - {s.className}</span>
                 <span className="opacity-60">Nhóm {s.grade}</span>
               </div>
             ))}
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 p-6 rounded-2xl shadow-sm">
          <p className="text-[10px] font-black uppercase text-red-800 opacity-60 mb-1">Chưa đóng học phí T.{currentMonth}</p>
          <p className="text-4xl font-black text-red-900">{tuitionStatus.unpaidThisMonth.length}</p>
          <div className="mt-4 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
             {tuitionStatus.unpaidThisMonth.map(s => (
               <div key={s.stt} className="text-[10px] border-b border-red-100 pb-1 flex justify-between">
                 <span className="font-bold text-red-700">{s.fullName} - {s.className}</span>
                 <span className="opacity-60">{s.phone1}</span>
               </div>
             ))}
          </div>
        </div>
        <div className="bg-orange-50 border border-orange-200 p-6 rounded-2xl shadow-sm">
          <p className="text-[10px] font-black uppercase text-orange-800 opacity-60 mb-1">Học sinh nợ phí cũ</p>
          <p className="text-4xl font-black text-orange-900">{tuitionStatus.debtList.length}</p>
          <div className="mt-4 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
             {tuitionStatus.debtList.map(s => (
               <div key={s.stt} className="text-[10px] border-b border-orange-100 pb-1 flex justify-between">
                 <span className="font-bold text-orange-700">{s.fullName} - {s.className}</span>
                 <span className="opacity-60">Nhóm {s.grade}</span>
               </div>
             ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 no-print">
        {/* Class Overview Chart */}
        <div className="flex-1 bg-white p-8 rounded-3xl border border-emerald-100 shadow-xl space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black text-emerald-900 uppercase tracking-widest border-l-4 border-emerald-500 pl-4">Toàn bộ lớp học</h2>
            <div className="flex gap-2">
              <button 
                disabled={isGeneratingImage}
                onClick={() => handleDownloadJPEG(teacherReportRef, `Bao_cao_Lop_hoc_T${currentMonth}_${currentYear}`)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-4 py-2 rounded-xl text-[10px] uppercase transition shadow-md disabled:opacity-50"
              >
                {isGeneratingImage ? "ĐANG TẠO..." : "XUẤT ẢNH (JPEG)"}
              </button>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                  {statsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Individual Student Selection & Insights */}
        <div className="flex-1 bg-emerald-900 p-8 rounded-3xl shadow-xl space-y-6 text-white overflow-hidden">
          <h2 className="text-xl font-black uppercase tracking-widest border-l-4 border-emerald-400 pl-4">Thông tin học sinh</h2>
          <div className="space-y-6">
            <select 
              className="w-full bg-emerald-800 text-white border-2 border-emerald-700 rounded-2xl p-4 outline-none focus:border-emerald-400 font-bold transition appearance-none"
              onChange={(e) => setSelectedStudent(students.find(s => s.stt === parseInt(e.target.value)) || null)}
            >
              <option value="">CHỌN HỌC SINH ĐỂ XEM CHI TIẾT</option>
              {students.map(s => <option key={s.stt} value={s.stt}>{s.fullName} - {s.className}</option>)}
            </select>
            
            {selectedStudent && studentAnalysis ? (
              <div className="animate-fadeIn space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-emerald-800/50 p-5 rounded-2xl border border-emerald-700 flex justify-between items-center shadow-inner">
                    <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Ngày bắt đầu học:</span>
                    <span className="font-black text-xl text-white">{selectedStudent.startDate}</span>
                  </div>
                  
                  <div className="bg-red-900/60 p-5 rounded-2xl border border-red-500/50 space-y-3 shadow-lg transform hover:scale-[1.01] transition">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-black uppercase text-red-200 tracking-widest">Số buổi vắng học</p>
                      <p className="text-3xl font-black text-red-400 drop-shadow-sm">{studentAnalysis.absents}</p>
                    </div>
                  </div>

                  <div className="bg-emerald-700/40 p-5 rounded-2xl border border-emerald-400/50 space-y-3 shadow-lg transform hover:scale-[1.01] transition">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-black uppercase text-emerald-200 tracking-widest">Số tháng đã đóng phí</p>
                      <p className="text-3xl font-black text-emerald-300 drop-shadow-sm">{studentAnalysis.paidCount}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    disabled={isGeneratingImage}
                    onClick={() => handleDownloadJPEG(studentReportRef, `Phieu_Bao_Cao_${selectedStudent.fullName.replace(/\s+/g, '_')}`)}
                    className="flex-1 bg-emerald-500 text-white hover:bg-emerald-400 font-black py-4 rounded-2xl shadow-xl transition uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
                    {isGeneratingImage ? "ĐANG TẠO..." : "XUẤT ẢNH (JPEG)"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 border-2 border-dashed border-emerald-700 rounded-3xl opacity-30">
                <p className="italic text-sm">Vui lòng chọn học sinh để xem thông tin</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TabStatistics;