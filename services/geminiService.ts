
import { GoogleGenAI } from "@google/genai";
import { Student } from "../types";

export const generateTuitionReport = async (students: Student[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-flash-preview';

  const prompt = `
    Dựa trên danh sách học sinh sau, hãy tạo một báo cáo thống kê học phí chuyên nghiệp. 
    YÊU CẦU: 
    - Phải có tiêu đề mô tả nội dung (dạng chữ in hoa, không dùng ký hiệu # hay **) trước mỗi bảng. 
    - Tuyệt đối KHÔNG dùng dấu sao đôi (**) để bôi đậm văn bản.
    - Tuyệt đối KHÔNG dùng các ký tự như "### BẢNG 1:", "### BẢNG 2:", v.v.
    
    Danh sách dữ liệu: ${JSON.stringify(students)}
    
    Cấu trúc báo cáo gồm các phần:
    1. TIÊU ĐỀ: THỐNG KÊ TỔNG HỢP LỚP HỌC
       Bảng: (Tổng số HS | Đã đóng | Chưa đóng tháng này | Nợ phí cũ).
    2. TIÊU ĐỀ: DANH SÁCH HỌC SINH ĐÃ ĐÓNG PHÍ THÁNG NÀY
       Bảng: (STT | Họ tên | Lớp | SĐT | Tháng đã đóng).
    3. TIÊU ĐỀ: DANH SÁCH HỌC SINH CHƯA ĐÓNG PHÍ THÁNG NÀY
       Bảng: (STT | Họ tên | Lớp | SĐT | Ngày tham gia).
    4. TIÊU ĐỀ: DANH SÁCH HỌC SINH CÒN NỢ PHÍ CÁC THÁNG TRƯỚC
       Bảng: (STT | Họ tên | Lớp | SĐT | Số tháng nợ).
    
    Lưu ý: Chỉ trả về tiêu đề và bảng markdown chuẩn. Tuyệt đối không dùng dấu **.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { temperature: 0.1 }
  });

  return response.text || "Không thể tạo báo cáo.";
};

export const generateIndividualReport = async (student: Student, analysis: any): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-flash-preview';

  const prompt = `
    Tạo báo cáo học tập và chuyên cần chuyên nghiệp cho học sinh sau.
    YÊU CẦU: 
    - Phải có tiêu đề mô tả nội dung (in hoa, không dấu # hay **) trước mỗi bảng.
    - Tuyệt đối KHÔNG dùng dấu sao đôi (**) để bôi đậm văn bản.
    - Tuyệt đối KHÔNG dùng các ký tự như "### BẢNG 1:", "### BẢNG 2:", v.v.
    
    Dữ liệu:
    Họ tên: ${student.fullName}, Nhóm: ${student.grade}, Lớp: ${student.className}, Ngày bắt đầu: ${student.startDate}
    
    Cấu trúc báo cáo:
    1. TIÊU ĐỀ: THÔNG TIN CHI TIẾT HỌC SINH
       Bảng 2 cột: Thông tin | Chi tiết.
    2. TIÊU ĐỀ: THỐNG KÊ TÌNH HÌNH CHUYÊN CẦN
       Bảng: Số buổi theo lịch | Số buổi hiện diện | Số buổi vắng.
       Dữ liệu: Lịch: ${analysis.scheduledUpToNow}, Hiện diện: ${analysis.actualAttendance}, Vắng: ${analysis.absents}.
    3. TIÊU ĐỀ: TÌNH TRẠNG ĐÓNG HỌC PHÍ
       Bảng: Số tháng đã đóng | Số tháng chưa đóng.
       Dữ liệu: Đã đóng: ${analysis.paidCount}, Chưa đóng: ${analysis.unpaidCount}.
    
    Lưu ý: Chỉ trả về tiêu đề và bảng markdown chuẩn. Tuyệt đối không dùng dấu **.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { temperature: 0.1 }
  });

  return response.text || "Không thể tạo báo cáo.";
};
