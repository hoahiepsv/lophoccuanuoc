
/**
 * GOOGLE APPS SCRIPT - HỆ THỐNG QUẢN LÝ LỚP HỌC LÊ XUÂN NƯỚC
 * Hướng dẫn: 
 * 1. Mở Google Sheet -> Tiện ích mở rộng -> Apps Script.
 * 2. Dán mã này vào file Mã.gs.
 * 3. Nhấn "Triển khai" (Deploy) -> "Triển khai mới" (New Deployment).
 * 4. Chọn loại là "Ứng dụng web" (Web App).
 * 5. Thiết lập "Người có quyền truy cập" là "Bất kỳ ai" (Anyone).
 * 6. Copy URL và dán vào constants.ts trong project.
 */

function doGet(e) {
  // Ngăn lỗi khi nhấn "Chạy" trực tiếp trong Editor
  if (!e || !e.parameter) {
    return ContentService.createTextOutput("Thông báo: Hệ thống đang hoạt động. Vui lòng không chạy trực tiếp từ trình soạn thảo Apps Script. Hãy sử dụng URL Web App.")
      .setMimeType(ContentService.MimeType.TEXT);
  }

  var action = e.parameter.action;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  
  if (action == 'read') {
    return readData(sheet);
  }
}

function doPost(e) {
  // Ngăn lỗi khi e không tồn tại
  if (!e || !e.postData) {
    return resSuccess({ success: false, message: "No data received" });
  }

  var data = JSON.parse(e.postData.contents);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var action = data.action;

  if (action == 'create') {
    return createData(sheet, data);
  } else if (action == 'update') {
    return updateData(sheet, data);
  }
}

// Hàm đọc dữ liệu và chuyển thành JSON
function readData(sheet) {
  var data = sheet.getDataRange().getValues();
  var header = data[0];
  var rows = data.slice(1);
  
  var jsonData = rows.map(function(row) {
    var obj = {};
    // Mapping cột dựa trên cấu trúc của Sheet1 và Sheet2
    header.forEach(function(h, i) {
      var key = mapHeaderToKey(h);
      obj[key] = row[i];
    });
    return obj;
  });

  return ContentService.createTextOutput(JSON.stringify(jsonData))
    .setMimeType(ContentService.MimeType.JSON);
}

// Hàm thêm mới (Dùng cho Tab Ghi danh)
function createData(sheet, data) {
  var lastRow = sheet.getLastRow();
  var newStt = lastRow; // STT tự động tăng
  
  // Xác định cấu trúc hàng mới dựa trên tiêu đề sheet
  var header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var newRow = header.map(function(h) {
    var key = mapHeaderToKey(h);
    if (key === 'stt') return newStt;
    return data[key] || "";
  });

  sheet.appendRow(newRow);
  return resSuccess({ success: true, stt: newStt });
}

// Hàm cập nhật (Dùng cho Sửa thông tin / Điểm danh / Học phí)
function updateData(sheet, data) {
  var values = sheet.getDataRange().getValues();
  var header = values[0];
  var sttToFind = data.stt;
  var rowIndex = -1;

  for (var i = 1; i < values.length; i++) {
    if (values[i][0] == sttToFind) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex != -1) {
    header.forEach(function(h, i) {
      var key = mapHeaderToKey(h);
      if (data[key] !== undefined && key !== 'stt') {
        sheet.getRange(rowIndex, i + 1).setValue(data[key]);
      }
    });
    return resSuccess({ success: true });
  }

  return resSuccess({ success: false, message: "Not found STT: " + sttToFind });
}

// Phụ trợ: Map tiếng Việt sang Key Tiếng Anh cho React dễ xử lý
function mapHeaderToKey(header) {
  var h = header.toString().toUpperCase().trim();
  switch(h) {
    case 'STT': return 'stt';
    case 'HỌ TÊN HS': return 'fullName';
    case 'NHÓM': return 'grade'; // Đã cập nhật từ 'KHỐI' thành 'NHÓM'
    case 'TÊN LỚP': return 'className';
    case 'SỐ ĐIỆN THOẠI 1': return 'phone1';
    case 'SỐ ĐIỆN THOẠI 2': return 'phone2';
    case 'NGÀY BẮT ĐẦU': return 'startDate';
    case 'LỊCH HỌC': return 'schedule';
    case 'ĐIỂM DANH HS': return 'attendance';
    case 'ĐÓNG HỌC PHÍ': return 'tuition';
    case 'NGÀY DẠY TRONG THÁNG': return 'days';
    default: return h.toLowerCase().replace(/\s/g, '_');
  }
}

function resSuccess(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
