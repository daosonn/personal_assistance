# Personal Planner Assistant Web — Project Context & AI Codegen Prompt

> Tài liệu này lưu lại toàn bộ context, feature, luồng nghiệp vụ và prompt triển khai cho dự án web trợ lý cá nhân.
>
> Dự án hướng tới một hệ thống quản lý todo/lịch cá nhân có AI hỗ trợ lập kế hoạch, nhắc việc qua Telegram, tổng kết cuối ngày và trực quan hóa tiến độ học tập/làm việc.

---

## 1. Tổng quan dự án

### 1.1. Tên tạm thời

**Personal Planner Assistant Web**

Có thể đổi tên sau thành:

- DailyFlow AI
- Pastel Planner
- Focus Companion
- LifeOps Planner
- AI Daily Assistant

---

### 1.2. Mục tiêu chính

Xây dựng một web app trợ lý cá nhân giúp người dùng:

- quản lý todo trong ngày;
- quản lý lịch trình theo ngày/tuần/tháng;
- lập kế hoạch tự động bằng LLM;
- duyệt kế hoạch trước khi bắt đầu ngày mới;
- nhận nhắc việc qua Telegram;
- cập nhật task khi có việc phát sinh;
- tổng kết cuối ngày bằng LLM;
- xem lại feedback, task đã làm, tiến độ qua nhiều ngày;
- phân loại công việc theo nhóm như Tiếng Nhật, Đồ án, AI/n8n, Cá nhân;
- trực quan hóa tiến độ bằng dashboard, chart, heatmap, timeline.

---

### 1.3. Triết lý sản phẩm

Ứng dụng không chỉ là todo list, không chỉ là calendar, mà là một **personal operating system nhẹ nhàng**:

```text
Todo + Calendar + AI Planner + Telegram Reminder + Daily Review + Progress Tracking
```

Người dùng có thể nhập việc nhanh từ Telegram hoặc web. AI sẽ hỗ trợ sắp xếp lịch, nhưng người dùng vẫn có quyền duyệt/chỉnh sửa.

---

## 2. Kiến trúc tổng thể

### 2.1. Các thành phần chính

```text
Telegram Bot
    ↓
n8n Workflows
    ↓
LLM Planner / Summary
    ↓
Database
    ↓
Web App UI
```

Web app là nơi trực quan hóa mọi thứ.

n8n là workflow engine để:

- nhận task từ Telegram;
- gọi LLM;
- gửi nhắc việc;
- xử lý daily summary;
- xử lý re-plan;
- đồng bộ dữ liệu.

LLM dùng để:

- phân tích task;
- lập kế hoạch ngày mới;
- tổng kết cuối ngày;
- đưa insight;
- đề xuất ưu tiên;
- xử lý feedback người dùng.

---

### 2.2. Vai trò của Web

Web là giao diện chính để:

- xem dashboard hôm nay;
- xem lịch ngày/tuần/tháng;
- tạo/sửa/xóa task;
- kéo thả lịch;
- xem ma trận Eisenhower;
- xem summary, trạng thái, tiến độ;
- xem review các ngày cũ;
- feedback cuối ngày;
- xem biểu đồ tăng trưởng.

---

### 2.3. Vai trò của Telegram

Telegram dùng cho thao tác nhanh:

- thêm todo;
- nhận nhắc việc;
- báo đã xong;
- dời task;
- bỏ qua task;
- nhập task phát sinh;
- nhận kế hoạch sáng;
- nhận tổng kết tối.

Luồng Telegram sẽ phát triển sau, nhưng UI và logic cần chuẩn bị sẵn để hỗ trợ.

---

### 2.4. Vai trò của n8n

n8n xử lý automation:

- 05:00 sáng: gọi LLM lập kế hoạch ngày mới;
- khi có task mới từ Telegram: xử lý lại task list/re-plan nếu cần;
- trong ngày: gửi reminder;
- cuối ngày: gọi LLM tổng kết;
- lưu review và feedback;
- cập nhật dữ liệu về web/database.

---

## 3. LLM Provider Strategy

Dự án đã có env cấu hình sẵn 3 model LLM.

### 3.1. Primary model

```text
DeepSeek-V4-Pro
```

Dùng làm model chính cho:

- lập kế hoạch ngày mới;
- xử lý logic scheduling;
- tổng kết cuối ngày;
- phân tích feedback;
- phân nhóm task;
- viết AI insight.

---

### 3.2. Fallback 1

```text
Gemini 2.5 Pro
```

Dùng khi DeepSeek lỗi, timeout hoặc response không hợp lệ.

---

### 3.3. Fallback 2

```text
OpenAI o4-mini
```

Dùng làm fallback cuối cùng.

---

### 3.4. Yêu cầu logic fallback

Khi gọi LLM:

1. Gọi **DeepSeek-V4-Pro** trước.
2. Nếu lỗi / timeout / JSON invalid:
   - retry một lần nếu phù hợp.
3. Nếu vẫn lỗi:
   - fallback sang **Gemini 2.5 Pro**.
4. Nếu Gemini cũng lỗi:
   - fallback sang **OpenAI o4-mini**.
5. Nếu cả 3 lỗi:
   - trả về thông báo lỗi thân thiện cho UI.
   - không làm mất dữ liệu user.
   - lưu log lỗi để debug.

Pseudo logic:

```ts
async function callPlannerLLM(prompt, schema) {
  try {
    return await callDeepSeek(prompt, schema)
  } catch (e1) {
    try {
      return await callGemini(prompt, schema)
    } catch (e2) {
      try {
        return await callOpenAI(prompt, schema)
      } catch (e3) {
        throw new Error("All LLM providers failed")
      }
    }
  }
}
```

---

## 4. Quy tắc reset ngày mới

### 4.1. Reset day time

Ngày mới của hệ thống bắt đầu lúc:

```text
05:00 sáng
```

Không phải 00:00.

---

### 4.2. Ý nghĩa

Một “ngày làm việc” được tính từ:

```text
05:00 hôm nay → 04:59 hôm sau
```

Lý do:

- người dùng có thể ngủ muộn;
- các task sau 00:00 vẫn có thể thuộc ngày hôm trước;
- daily review cuối ngày có thể diễn ra trước khi ngủ, không phụ thuộc 00:00.

---

### 4.3. Calendar vẫn phải hiển thị đủ 24h

Calendar Planner vẫn hiển thị:

```text
00:00 → 23:59
```

Nhưng mốc **05:00** cần được đánh dấu là điểm reset logic ngày mới.

UI nên có:

- marker nhỏ ở 05:00;
- note tinh tế;
- không làm rối calendar.

---

## 5. Các trang chính của Web

Web có 3 trang chính:

```text
1. Today Dashboard
2. Calendar Planner
3. Review & Progress
```

---

# 6. Trang 1 — Today Dashboard

## 6.1. Mục tiêu

Trang này chỉ làm việc với **ngày hiện tại**.

Người dùng mở trang này để biết:

- hôm nay cần làm gì;
- task nào quan trọng;
- task nào đang trễ;
- tiến độ hiện tại;
- AI gợi ý gì;
- task nào đã xong;
- task nào cần xử lý tiếp.

---

## 6.2. Thành phần UI bắt buộc

### A. Header

Hiển thị:

- lời chào;
- ngày hiện tại;
- trạng thái kế hoạch hôm nay;
- nút thêm task;
- nút AI re-plan;
- nút duyệt kế hoạch;
- trạng thái sync Telegram/n8n nếu cần.

Ví dụ:

```text
Chào buổi sáng, hôm nay là 09/05/2026
Kế hoạch hôm nay: Đã duyệt
```

---

### B. Summary cards

Các card tổng quan:

- Tổng task hôm nay;
- Đã hoàn thành;
- Chưa xong;
- Focus time;
- Task ưu tiên cao;
- Task chưa được xếp lịch;
- Completion rate.

Mỗi card có:

- icon nhỏ;
- số liệu nổi bật;
- mô tả ngắn;
- màu pastel nhẹ.

---

### C. AI Summary

Một khối nổi bật thể hiện insight của AI.

Ví dụ:

```text
Hôm nay bạn nên ưu tiên "Sửa CV tiếng Nhật" và "Gửi email Daruma" trước 17:00.
Các task AI/n8n nên đặt vào buổi tối nhưng không quá 45 phút để tránh mệt.
```

---

### D. Progress

Hiển thị:

- progress bar;
- completion %;
- focus time đã hoàn thành;
- số task done/planned/pending;
- deep work progress nếu có.

---

### E. Todo hôm nay

Hiển thị toàn bộ task trong ngày.

Mỗi task có:

- title;
- category;
- priority;
- status;
- estimated duration;
- scheduled time;
- deadline nếu có;
- note;
- action buttons:
  - done;
  - edit;
  - defer;
  - skip.

Status:

```text
pending
planned
in_progress
done
postponed
missed
cancelled
```

Priority:

```text
high
medium
low
```

Có filter:

- tất cả;
- đang làm;
- chưa xong;
- đã xong;
- ưu tiên cao.

---

### F. Ma trận Eisenhower

Hiển thị 4 ô:

```text
1. Quan trọng + Khẩn cấp
2. Quan trọng + Không khẩn cấp
3. Không quan trọng + Khẩn cấp
4. Không quan trọng + Không khẩn cấp
```

Mỗi ô có màu pastel riêng.

Task card trong ma trận cần gọn, dễ đọc.

Mục tiêu: giúp người dùng ưu tiên công việc nhanh.

---

### G. Timeline hôm nay

Bản mini agenda trong ngày:

- hiển thị các block đã lên lịch;
- có start time;
- end time;
- category;
- status;
- click event để qua Calendar Planner hoặc mở edit modal.

---

### H. Insight / Warning

Khu cảnh báo:

- task có nguy cơ trễ;
- task chưa xếp lịch;
- ngày quá tải;
- khung giờ còn trống;
- AI suggestion.

---

# 7. Trang 2 — Calendar Planner

## 7.1. Mục tiêu

Trang Calendar Planner dùng để:

- tạo lịch;
- lên lịch trước theo tuần/tháng;
- xem lịch giống Google Calendar;
- kéo thả task;
- chỉnh sửa thời gian;
- lập kế hoạch cho cả tuần;
- để AI auto-schedule.

---

## 7.2. Calendar Views

Bắt buộc có:

```text
7D / Week View
Month View
```

Có thể thêm sau:

```text
Day View
Agenda View
```

---

## 7.3. Time Range

Calendar phải hiển thị đủ:

```text
00:00 → 23:59
```

Không được thiếu 00:00–05:00.

Mốc 05:00 là reset logic ngày mới, cần được đánh dấu.

---

## 7.4. Tạo lịch / task

Form tạo lịch cần có:

- title;
- date;
- category/group;
- priority;
- start time;
- end time;
- duration hours;
- duration minutes;
- description/notes;
- type;
- repeat rule;
- source;
- fixed flag;
- can_move flag.

---

## 7.5. Logic start/end/duration

Người dùng có thể nhập theo 2 cách.

### Cách 1

```text
start time + duration → tự tính end time
```

Ví dụ:

```text
Start: 20:00
Duration: 1h30m
End: 21:30
```

### Cách 2

```text
start time + end time → tự tính duration
```

Ví dụ:

```text
Start: 20:00
End: 21:15
Duration: 1h15m
```

Cần hỗ trợ duration có:

- giờ;
- phút.

Cần xử lý cả trường hợp qua ngày:

```text
Start: 23:30
End: 00:30
Duration: 1h
```

---

## 7.6. Event types

Event/task types:

```text
task
fixed
focus
event
deadline
break
review
routine
```

---

## 7.7. Fixed task / fixed event

Task đã được tạo trong calendar trước là **task cố định**.

Khi LLM lập kế hoạch ngày mới, cần ưu tiên các task này trước.

Quy tắc:

1. Task/event có trong calendar trước → coi là fixed hoặc pre-scheduled.
2. LLM không được ghi đè nếu `can_move = false`.
3. LLM phải xếp các task khác xung quanh các block fixed.
4. Nếu task fixed chiếm nhiều thời gian, LLM phải giảm số task linh hoạt.
5. Nếu task mới bị trùng fixed task, phải đề xuất slot khác.

---

## 7.8. Drag and drop

Calendar cần hỗ trợ concept:

- kéo event sang ngày khác;
- kéo event sang giờ khác;
- giữ nguyên duration khi kéo;
- click để chỉnh sửa;
- resize duration nếu dùng thư viện hỗ trợ;
- lưu thay đổi vào state/database.

---

## 7.9. Month view

Month view cần:

- tổng quan tháng;
- hiển thị vài event chính mỗi ngày;
- nếu nhiều event thì hiển thị `+ more`;
- click ngày để xem chi tiết hoặc tạo event.

---

## 7.10. AI actions trong Calendar

Nên có các nút:

- AI auto-schedule day;
- AI auto-schedule week;
- AI rebalance workload;
- AI detect overload;
- AI suggest best slots;
- AI move flexible tasks.

---

# 8. Trang 3 — Review & Progress

## 8.1. Mục tiêu

Trang Review & Progress dùng để:

- tổng kết cuối ngày;
- xem lại các ngày cũ;
- xem feedback;
- xem task đã làm;
- xem tiến bộ theo thời gian;
- hỗ trợ AI học thói quen của người dùng.

---

## 8.2. Date selector

Cần có date selector để xem lại:

- hôm nay;
- hôm qua;
- 7 ngày gần nhất;
- ngày bất kỳ.

Khi chọn ngày, UI cập nhật:

- AI summary ngày đó;
- task đã làm;
- feedback;
- mood;
- progress;
- category summary.

---

## 8.3. AI tổng kết theo nhóm

AI cần tổng kết hôm nay người dùng đã học/làm được gì theo từng nhóm:

Ví dụ nhóm:

```text
Tiếng Nhật
Đồ án
AI / n8n
Cá nhân
Sức khỏe
Công việc
```

Mỗi nhóm hiển thị:

- tổng thời gian;
- task đã làm;
- insight;
- mức tiến triển;
- đề xuất cho ngày mai.

Ví dụ:

```text
Tiếng Nhật:
- Ôn 20 từ N4
- Sửa CV tiếng Nhật
- Tổng thời gian: 1h30m
- Insight: Duy trì tốt, nên ôn lại từ vựng sau 2 ngày.

Đồ án:
- Phân tích luồng masking biển số/mặt
- Tổng thời gian: 45m
- Insight: Cần chia nhỏ phần model optimization.

AI/n8n:
- Học webhook
- Thiết kế luồng Telegram reminder
- Tổng thời gian: 1h05m
```

---

## 8.4. Nút tổng kết hôm nay

Trước khi kết thúc ngày, người dùng sẽ bấm:

```text
Tổng kết hôm nay
```

Khi bấm nút:

1. Hệ thống lấy toàn bộ task, calendar event, trạng thái trong ngày.
2. Gọi LLM.
3. LLM tổng kết hôm nay.
4. UI hiển thị bản tổng kết.
5. Người dùng nhập feedback.
6. Feedback được lưu vào daily review.
7. Người dùng có thể thêm task/todo cho ngày hôm sau.

---

## 8.5. Feedback cuối ngày

Người dùng cần nhập:

- mood;
- energy level;
- ghi chú;
- điều làm tốt;
- điều chưa tốt;
- task nào bị dời và lý do;
- khung giờ làm việc hiệu quả;
- khung giờ bị mệt;
- ghi chú cho AI để lập kế hoạch tốt hơn ngày mai.

---

## 8.6. Thêm task cho ngày hôm sau

Trong màn hình review cuối ngày, người dùng có thể thêm task cho ngày hôm sau.

Form task ngày mai cần có:

- title;
- category;
- priority;
- estimated duration hours;
- estimated duration minutes;
- deadline nếu có;
- preferred time nếu có;
- note;
- fixed hay flexible.

Đặc biệt: có phần ước lượng thời gian để người dùng điền.

Ví dụ:

```text
Task: Học pruning YOLO
Estimated: 1h30m
Priority: High
Category: Đồ án
Preferred time: Morning
```

---

## 8.7. Biểu đồ tăng trưởng

Cần có line chart thể hiện tăng trưởng:

- completion rate theo ngày;
- focus time theo ngày;
- learning score theo ngày;
- productivity score theo tuần.

Chart style:

- pastel;
- dễ nhìn;
- smooth line;
- có legend;
- có tooltip nếu code thật;
- không quá kỹ thuật.

---

## 8.8. Heatmap

Activity heatmap:

- thể hiện mức độ hoạt động theo ngày;
- dùng màu pastel;
- click ngày để xem review.

---

## 8.9. Daily review log

Danh sách review theo ngày:

- ngày;
- mood;
- completion %;
- summary ngắn;
- click để xem chi tiết.

---

# 9. Luồng nghiệp vụ chính

## 9.1. Luồng buổi tối — Tổng kết ngày

```text
User bấm "Tổng kết hôm nay"
    ↓
Frontend lấy task/calendar/review data của ngày hiện tại
    ↓
Gọi backend/n8n/LLM
    ↓
LLM tổng kết theo nhóm
    ↓
UI hiển thị AI summary
    ↓
User nhập feedback
    ↓
User thêm todo/task cho ngày hôm sau
    ↓
Lưu daily_review + next_day_tasks
```

---

## 9.2. Luồng 05:00 sáng — Lập kế hoạch ngày mới

```text
05:00 sáng
    ↓
n8n workflow chạy
    ↓
Lấy calendar events/task đã tạo trước
    ↓
Đánh dấu task trong calendar là fixed/pre-scheduled
    ↓
Lấy todo pending, todo từ ngày hôm trước, todo mới thêm trong review tối qua
    ↓
Lấy user feedback gần nhất
    ↓
Gọi LLM lập plan
    ↓
LLM ưu tiên fixed/pre-scheduled task trước
    ↓
LLM xếp flexible tasks vào slot còn trống
    ↓
Lưu daily plan
    ↓
Gửi kế hoạch cho user duyệt trên web/Telegram
```

---

## 9.3. Luồng nhận task mới từ Telegram

Luồng này sẽ làm sau, nhưng UI/logic cần chuẩn bị sẵn.

```text
User gửi task mới qua Telegram
    ↓
n8n nhận message
    ↓
LLM parse task
    ↓
Lưu task vào database
    ↓
Nếu task thuộc hôm nay:
        kiểm tra calendar hiện tại
        kiểm tra slot trống
        đề xuất re-plan nếu cần
    ↓
Nếu task thuộc ngày sau:
        lưu vào inbox/future tasks
    ↓
Web cập nhật danh sách task
```

Yêu cầu quan trọng:

- Khi nhận task mới trong ngày, hệ thống có thể cần xử lý lại danh sách task.
- Không nhất thiết auto thay đổi lịch ngay.
- Có thể hỏi user:
  - thêm vào inbox;
  - xếp vào hôm nay;
  - AI re-plan;
  - để ngày mai.

---

## 9.4. Luồng task cố định trong calendar

Nếu user đã tạo task/event trong Calendar Planner, task đó được ưu tiên.

```text
Calendar task/event đã tồn tại
    ↓
LLM đọc trước khi lập plan
    ↓
Nếu can_move = false:
        không được dời
    ↓
Nếu can_move = true:
        chỉ dời nếu user cho phép hoặc khi re-plan
    ↓
Các task còn lại được xếp quanh fixed blocks
```

---

# 10. Data model đề xuất

## 10.1. tasks

```ts
type Task = {
  id: string
  title: string
  description?: string
  category: string
  priority: "high" | "medium" | "low"
  status: "pending" | "planned" | "in_progress" | "done" | "postponed" | "missed" | "cancelled"
  estimatedMinutes: number
  deadline?: string
  preferredDate?: string
  preferredTime?: string
  source: "web" | "telegram" | "ai" | "calendar"
  isFixed?: boolean
  canMove?: boolean
  createdAt: string
  updatedAt: string
}
```

---

## 10.2. calendar_events

```ts
type CalendarEvent = {
  id: string
  title: string
  date: string
  startTime: string
  endTime: string
  durationMinutes: number
  category: string
  type: "task" | "fixed" | "focus" | "event" | "deadline" | "break" | "review" | "routine"
  priority?: "high" | "medium" | "low"
  status: "planned" | "in_progress" | "done" | "postponed" | "missed" | "cancelled"
  source: "manual" | "ai" | "telegram" | "imported"
  isFixed: boolean
  canMove: boolean
  taskId?: string
  notes?: string
}
```

---

## 10.3. daily_plans

```ts
type DailyPlan = {
  id: string
  date: string
  status: "draft" | "approved" | "archived"
  summary: string
  aiInsights: string[]
  createdBy: "ai" | "manual"
  approvedAt?: string
  createdAt: string
}
```

---

## 10.4. daily_reviews

```ts
type DailyReview = {
  id: string
  date: string
  mood: "great" | "good" | "normal" | "tired" | "bad"
  energyLevel: 1 | 2 | 3 | 4 | 5
  completionRate: number
  focusMinutes: number
  learningScore: number
  productivityScore: number
  aiSummary: string
  categorySummaries: CategorySummary[]
  completedTasks: string[]
  postponedTasks: string[]
  missedTasks: string[]
  userFeedback: string
  tomorrowTasks: Task[]
}
```

---

## 10.5. category_summaries

```ts
type CategorySummary = {
  category: string
  totalMinutes: number
  completedItems: string[]
  insight: string
  suggestion: string
}
```

---

## 10.6. user_settings

```ts
type UserSettings = {
  dayResetTime: "05:00"
  defaultReminderBeforeMinutes: number
  wakeTime?: string
  sleepTime?: string
  preferredFocusTime?: "morning" | "afternoon" | "evening"
  maxDeepWorkMinutes: number
  minBreakMinutes: number
  quietHoursStart?: string
  quietHoursEnd?: string
}
```

---

# 11. UI design direction

## 11.1. Style

UI cần:

- hiện đại;
- sang trọng;
- dễ nhìn;
- dễ vận hành;
- thân thiện;
- pastel;
- không neon;
- không cyberpunk;
- không quá "AI";
- không dashboard enterprise khô cứng.

---

## 11.2. Colors

Gợi ý màu:

```text
Pastel blue
Pastel lavender
Sage green
Warm cream
Soft peach
White
Warm gray
Soft charcoal
```

Tránh:

- neon green;
- electric blue quá gắt;
- gradient quá mạnh;
- màu cyberpunk;
- quá nhiều màu.

---

## 11.3. Icons

Icon nên:

- dễ thương;
- rounded;
- friendly;
- tinh tế;
- không trẻ con quá.

Gợi ý:

- Lucide icons;
- Phosphor icons;
- Remix icons.

---

## 11.4. Layout

- desktop-first;
- responsive tablet/mobile;
- sidebar hoặc top nav rõ ràng;
- card layout;
- shadow nhẹ;
- bo góc mềm;
- spacing rộng rãi;
- hierarchy rõ.

---

# 12. Folder UI yêu cầu

Khi AI tạo web, cần có folder:

```text
UI/
  images/
    preview-today-dashboard.png
    preview-calendar-planner.png
    preview-review-progress.png
    icons/
    illustrations/
  html/
    index.html
    today.html
    calendar.html
    review.html
  css/
    styles.css
  js/
    app.js
  README.md
```

Nếu dùng React/Next.js thì vẫn cần tạo folder UI để lưu:

```text
UI/
  images/
    screenshots hoặc mock preview
  references/
    design-notes.md
  html-preview/
    index.html
```

Mục đích folder UI:

- lưu ảnh preview;
- lưu HTML prototype;
- lưu note design;
- làm reference trước khi tích hợp backend.

---

# 13. Prompt yêu cầu AI tạo web

Phần dưới đây là prompt dùng để yêu cầu AI tạo web.

---

## 13.1. Full Codegen Prompt

```text
Bạn là senior frontend engineer kiêm product UI/UX designer.

Hãy xây dựng một web app tên tạm thời là "Personal Planner Assistant Web".

Đây là một web app trợ lý cá nhân dùng để quản lý todo, calendar, AI planning, Telegram reminder, daily review và progress tracking.

Mục tiêu:
- Tạo UI đẹp, sang trọng, pastel, dễ nhìn, dễ vận hành.
- Không dùng phong cách AI neon/cyberpunk.
- Không thiết kế quá enterprise khô khan.
- Dùng màu pastel, card mềm, icon dễ thương, rounded, spacing tốt.
- UI phải giống một sản phẩm thật có thể dùng hàng ngày.
- Hãy sáng tạo thoải mái về bố cục và visual design, miễn là vẫn đầy đủ chức năng và dễ dùng.

Stack:
- Nếu dự án đang dùng React/Next.js thì dùng React/Next.js.
- Dùng Tailwind CSS nếu có.
- Có thể dùng shadcn/ui nếu project đã setup.
- Có thể dùng Lucide icons.
- Có thể dùng Recharts cho chart.
- Animation nếu có thì rất nhẹ, không phô trương.

LLM env:
Dự án đã có sẵn 3 model LLM:
1. Primary: DeepSeek-V4-Pro
2. Fallback 1: Gemini 2.5 Pro
3. Fallback 2: OpenAI o4-mini

Hãy tạo một lớp/helper gọi LLM theo thứ tự:
- gọi DeepSeek-V4-Pro trước;
- nếu lỗi hoặc response invalid thì fallback Gemini 2.5 Pro;
- nếu lỗi tiếp thì fallback OpenAI o4-mini;
- nếu cả 3 lỗi thì trả lỗi thân thiện và không làm mất dữ liệu.

Không cần gọi API thật nếu env chưa rõ, có thể tạo interface/mock function trước, nhưng code cần chuẩn bị sẵn cho việc tích hợp.

Quan trọng:
- Tạo thêm folder UI để lưu preview UI.
- Trong folder UI cần có ảnh preview và code HTML prototype nếu có thể.
- Nếu không thể tạo ảnh thật, hãy tạo placeholder README mô tả các ảnh cần export.
- Folder gợi ý:

UI/
  images/
    preview-today-dashboard.png
    preview-calendar-planner.png
    preview-review-progress.png
  html/
    index.html
  css/
    styles.css
  js/
    app.js
  README.md

Web app cần có 3 trang chính:

1. Today Dashboard
2. Calendar Planner
3. Review & Progress

========================
TRANG 1: TODAY DASHBOARD
========================

Trang Today chỉ tập trung vào ngày hiện tại.

Cần có:
- header với lời chào, ngày hiện tại, trạng thái kế hoạch hôm nay;
- nút thêm task;
- nút AI re-plan;
- nút duyệt kế hoạch;
- summary cards:
  - tổng task hôm nay;
  - task đã hoàn thành;
  - task chưa xong;
  - focus time;
  - priority cao;
  - task chưa xếp lịch;
- AI Summary card:
  - tóm tắt hôm nay nên ưu tiên gì;
  - cảnh báo task có nguy cơ trễ;
  - gợi ý task có thể dời;
- progress section:
  - completion rate;
  - progress bar;
  - focus time progress;
- Todo hôm nay:
  - toàn bộ task thuộc ngày hiện tại;
  - filter: tất cả, đang làm, chưa xong, đã xong, ưu tiên cao;
  - mỗi task có title, category, priority, status, duration, scheduled time, note, actions;
- Ma trận Eisenhower:
  - 4 nhóm:
    1. Quan trọng + Khẩn cấp
    2. Quan trọng + Không khẩn cấp
    3. Không quan trọng + Khẩn cấp
    4. Không quan trọng + Không khẩn cấp
  - mỗi nhóm có màu pastel riêng;
- Timeline mini hôm nay:
  - hiển thị các block từ calendar hôm nay;
  - có start/end time;
  - click để edit hoặc mở calendar;
- Insight/Warning panel:
  - task dễ trễ;
  - task chưa xếp;
  - khung giờ trống;
  - AI suggestion.

==========================
TRANG 2: CALENDAR PLANNER
==========================

Calendar Planner dùng để lên lịch cả tuần/tháng, giống Google Calendar nhưng giao diện đẹp hơn, mềm mại hơn.

Bắt buộc:
- Có Week View / 7D.
- Có Month View / 1 tháng.
- Hiển thị đủ 00:00 đến 23:59, không được thiếu 00:00–05:00.
- Mốc 05:00 là reset ngày mới, cần có marker hoặc note nhỏ.
- Logic ngày mới: ngày làm việc tính từ 05:00 hôm nay đến 04:59 hôm sau.

Calendar event cần có:
- title;
- date;
- category/group;
- priority;
- start time;
- end time;
- duration hours;
- duration minutes;
- description/notes;
- type;
- source;
- isFixed;
- canMove.

Logic tạo/sửa thời gian:
- Nếu user nhập start time + duration thì tự tính end time.
- Nếu user nhập start time + end time thì tự tính duration.
- Duration hỗ trợ giờ và phút.
- Phải xử lý được case qua ngày, ví dụ 23:30 → 00:30 là 1h.

Drag/drop concept:
- Có thể kéo event sang ngày khác;
- Có thể kéo event sang giờ khác;
- Khi kéo thì giữ nguyên duration;
- Click event mở modal edit;
- Nếu dùng thư viện hỗ trợ resize thì thêm resize duration.

Task cố định:
- Những task/event đã được user tạo trong calendar trước sẽ được coi là fixed/pre-scheduled.
- Khi LLM lập kế hoạch ngày mới, phải ưu tiên các task này trước.
- Nếu canMove=false thì LLM không được dời.
- Các flexible task được xếp xung quanh fixed task.

AI buttons:
- AI auto-schedule day;
- AI auto-schedule week;
- AI rebalance workload;
- AI detect overload;
- AI suggest best slots.

===========================
TRANG 3: REVIEW & PROGRESS
===========================

Trang này dùng để tổng kết cuối ngày và xem tiến bộ qua nhiều ngày.

Cần có:
- Date selector để xem lại hôm nay, hôm qua, 7 ngày gần nhất hoặc ngày bất kỳ.
- Nút "Tổng kết hôm nay".
- Khi bấm "Tổng kết hôm nay":
  1. lấy toàn bộ task/calendar event/status trong ngày;
  2. gọi LLM;
  3. LLM tổng kết theo nhóm;
  4. hiển thị AI summary;
  5. user nhập feedback;
  6. user có thể thêm todo/task cho ngày hôm sau;
  7. lưu daily review.

AI tổng kết theo nhóm:
- Tiếng Nhật
- Đồ án
- AI / n8n
- Cá nhân
- Sức khỏe
- Công việc
Có thể mở rộng.

Mỗi nhóm hiển thị:
- tổng thời gian;
- task đã làm;
- insight;
- mức tiến triển;
- gợi ý ngày mai.

Feedback cuối ngày:
- mood;
- energy level;
- ghi chú;
- điều làm tốt;
- điều chưa tốt;
- task bị dời và lý do;
- khung giờ làm việc hiệu quả;
- ghi chú cho AI.

Thêm task ngày hôm sau:
- title;
- category;
- priority;
- estimated duration hours;
- estimated duration minutes;
- deadline;
- preferred time;
- note;
- fixed/flexible.

Biểu đồ:
- line chart tăng trưởng:
  - completion rate theo ngày;
  - focus time theo ngày;
  - learning score theo ngày;
  - productivity score theo tuần;
- weekly progress bars;
- activity heatmap;
- daily review log.

Daily review log:
- ngày;
- mood;
- completion %;
- summary ngắn;
- click để xem chi tiết;
- xem lại task đã làm, task bị dời, feedback ngày đó.

=====================
BUSINESS LOGIC CHÍNH
=====================

1. Buổi tối:
User bấm "Tổng kết hôm nay"
→ app lấy dữ liệu trong ngày
→ gọi LLM
→ LLM tổng kết
→ user feedback
→ user thêm task ngày mai
→ lưu daily_review + tomorrow_tasks.

2. 05:00 sáng hôm sau:
n8n hoặc scheduler chạy
→ lấy calendar events/task đã tạo trước
→ coi các task này là fixed/pre-scheduled
→ lấy todo pending và task từ tối qua
→ lấy feedback gần nhất
→ gọi LLM lập kế hoạch ngày mới
→ LLM ưu tiên fixed task trước
→ xếp flexible task vào slot còn trống
→ lưu daily plan
→ gửi cho user duyệt.

3. Khi nhận task mới từ Telegram:
Sau này sẽ có workflow:
Telegram message
→ n8n
→ LLM parse task
→ lưu task
→ nếu task thuộc hôm nay thì xử lý lại task list/re-plan nếu cần.
Hãy chuẩn bị code/data structure để hỗ trợ luồng này sau.

====================
DATA MODEL ĐỀ XUẤT
====================

Tạo type/interface cho:

Task:
- id
- title
- description
- category
- priority
- status
- estimatedMinutes
- deadline
- preferredDate
- preferredTime
- source
- isFixed
- canMove
- createdAt
- updatedAt

CalendarEvent:
- id
- title
- date
- startTime
- endTime
- durationMinutes
- category
- type
- priority
- status
- source
- isFixed
- canMove
- taskId
- notes

DailyPlan:
- id
- date
- status
- summary
- aiInsights
- createdBy
- approvedAt
- createdAt

DailyReview:
- id
- date
- mood
- energyLevel
- completionRate
- focusMinutes
- learningScore
- productivityScore
- aiSummary
- categorySummaries
- completedTasks
- postponedTasks
- missedTasks
- userFeedback
- tomorrowTasks

CategorySummary:
- category
- totalMinutes
- completedItems
- insight
- suggestion

UserSettings:
- dayResetTime = "05:00"
- defaultReminderBeforeMinutes
- wakeTime
- sleepTime
- preferredFocusTime
- maxDeepWorkMinutes
- minBreakMinutes
- quietHoursStart
- quietHoursEnd

=================
UI STYLE REQUEST
=================

Thiết kế phải:
- pastel;
- sang trọng;
- dễ nhìn;
- dễ vận hành;
- thân thiện;
- có icon dễ thương;
- card bo góc mềm;
- shadow nhẹ;
- spacing thoáng;
- typography đẹp;
- hierarchy rõ.

Không dùng:
- AI neon;
- cyberpunk;
- màu quá gắt;
- animation quá nhiều;
- dashboard enterprise khô cứng.

Hãy tự do sáng tạo ở:
- layout;
- visual style;
- card design;
- chart style;
- calendar UI;
- icon;
- micro-interactions.

Nhưng phải giữ sản phẩm:
- dễ dùng;
- thực tế;
- rõ ràng;
- có thể dùng hằng ngày.

=================
OUTPUT CẦN TẠO
=================

Hãy tạo:
1. Web app 3 trang chính.
2. Component system.
3. Mock data realistic.
4. LLM helper với fallback 3 model.
5. UI folder gồm HTML preview + README + image placeholders nếu chưa xuất ảnh thật.
6. Code sạch, dễ maintain.
7. Responsive desktop/tablet/mobile.
8. Empty/loading/error states cơ bản.
9. Comments ngắn ở những logic quan trọng như:
   - reset day 05:00;
   - duration calculation;
   - fixed task priority;
   - LLM fallback;
   - Telegram task future workflow.
```

---

# 14. Prompt riêng cho LLM Daily Summary

Dùng khi user bấm **Tổng kết hôm nay**.

```text
Bạn là trợ lý tổng kết ngày cho người dùng.

Dữ liệu đầu vào gồm:
- danh sách task hôm nay;
- calendar events;
- trạng thái task;
- task hoàn thành;
- task bị dời;
- task chưa xong;
- thời lượng từng task;
- category;
- feedback nếu có.

Hãy tổng kết ngày hôm nay bằng tiếng Việt, rõ ràng, thân thiện, không quá dài.

Yêu cầu output JSON hợp lệ:

{
  "overall_summary": "Tóm tắt ngắn về ngày hôm nay",
  "completion_rate": number,
  "focus_minutes": number,
  "mood_guess": "great|good|normal|tired|bad",
  "category_summaries": [
    {
      "category": "Tiếng Nhật",
      "total_minutes": number,
      "completed_items": ["..."],
      "insight": "...",
      "suggestion": "..."
    }
  ],
  "completed_tasks": ["..."],
  "postponed_tasks": ["..."],
  "missed_tasks": ["..."],
  "what_went_well": ["..."],
  "what_to_improve": ["..."],
  "suggestions_for_tomorrow": ["..."]
}

Quy tắc:
- Chia theo nhóm như Tiếng Nhật, Đồ án, AI/n8n, Cá nhân nếu có dữ liệu.
- Nếu task ít, không phóng đại thành tích.
- Nếu có task bị dời nhiều, hãy góp ý nhẹ nhàng.
- Giọng văn thân thiện, hỗ trợ, không phán xét.
- Không dùng văn phong quá máy móc.
```

---

# 15. Prompt riêng cho LLM Morning Planner 05:00

Dùng lúc 05:00 sáng để lập kế hoạch ngày mới.

```text
Bạn là trợ lý lập kế hoạch cá nhân.

Nhiệm vụ:
Lập kế hoạch cho ngày mới dựa trên:
- task/event đã có trong calendar;
- task fixed/pre-scheduled;
- todo pending;
- todo được thêm từ review tối qua;
- task chưa xong từ hôm trước;
- feedback gần nhất của người dùng;
- user settings;
- reset day time là 05:00.

Quy tắc quan trọng:
1. Ngày làm việc tính từ 05:00 hôm nay đến 04:59 hôm sau.
2. Calendar vẫn có thể có event 00:00-04:59, nhưng cần xác định đúng thuộc ngày logic nào.
3. Task/event đã có trong calendar trước phải được ưu tiên trước.
4. Nếu isFixed=true hoặc canMove=false thì không được dời.
5. Các task flexible phải được xếp quanh fixed blocks.
6. Không xếp task đè lên nhau.
7. Không xếp quá nhiều task nặng liên tiếp.
8. Sau block dài hơn 60-90 phút, nên có break.
9. Ưu tiên task high priority và deadline gần.
10. Nếu quá nhiều task, chỉ chọn số lượng phù hợp và đưa phần còn lại vào unscheduled.
11. Nếu feedback hôm qua nói buổi tối mệt, hạn chế xếp task nặng vào buổi tối.
12. Output phải là JSON hợp lệ.

Output schema:

{
  "date": "YYYY-MM-DD",
  "summary": "Tóm tắt kế hoạch ngày mới",
  "fixed_blocks": [
    {
      "event_id": "...",
      "title": "...",
      "start_time": "HH:mm",
      "end_time": "HH:mm",
      "reason": "Task đã có trong calendar nên được ưu tiên"
    }
  ],
  "planned_items": [
    {
      "task_id": "...",
      "title": "...",
      "start_time": "HH:mm",
      "end_time": "HH:mm",
      "category": "...",
      "priority": "...",
      "reason": "..."
    }
  ],
  "breaks": [
    {
      "start_time": "HH:mm",
      "end_time": "HH:mm",
      "reason": "..."
    }
  ],
  "unscheduled": [
    {
      "task_id": "...",
      "title": "...",
      "reason": "Không đủ thời gian / ưu tiên thấp / nên chuyển ngày khác"
    }
  ],
  "warnings": ["..."],
  "suggestions": ["..."]
}
```

---

# 16. Prompt riêng cho Telegram Task Parser

Dùng sau này khi nhận task từ Telegram.

```text
Bạn là trợ lý phân tích task từ tin nhắn Telegram.

Hãy đọc tin nhắn người dùng và chuyển thành JSON có cấu trúc.

Input:
- message text
- current date/time
- user timezone
- current daily plan nếu có

Output JSON:

{
  "intent": "create_task|update_task|mark_done|reschedule_task|cancel_task|ask_status|unknown",
  "task": {
    "title": "...",
    "description": "...",
    "category": "...",
    "priority": "high|medium|low|null",
    "estimated_minutes": number|null,
    "preferred_date": "YYYY-MM-DD|null",
    "preferred_time": "HH:mm|null",
    "deadline": "YYYY-MM-DDTHH:mm|null",
    "is_fixed": boolean,
    "can_move": boolean
  },
  "needs_clarification": boolean,
  "clarification_question": "...",
  "should_replan_today": boolean,
  "reason": "..."
}

Quy tắc:
- Nếu user nói “mai”, “tối nay”, “sáng mai”, hãy quy đổi theo timezone người dùng.
- Nếu thiếu ngày/giờ nhưng vẫn có thể lưu task vào inbox, không hỏi quá nhiều.
- Nếu task thuộc hôm nay và có priority cao, set should_replan_today=true.
- Nếu user nói “lịch cố định”, set is_fixed=true và can_move=false.
```

---

# 17. Ghi chú triển khai thực tế

## 17.1. MVP nên làm trước

Ưu tiên:

1. UI 3 trang.
2. Mock data.
3. Calendar create/edit.
4. Duration calculation.
5. Review date selector.
6. LLM helper mock.
7. Nút "Tổng kết hôm nay" mock response.
8. Nút "AI lập kế hoạch" mock response.

---

## 17.2. Sau MVP

Tích hợp thật:

1. Database.
2. n8n webhook.
3. Telegram bot.
4. LLM provider thật.
5. Scheduler 05:00.
6. Reminder trong ngày.
7. Re-plan khi có task mới.

---

## 17.3. Các điểm cần chú ý

- Không để LLM tự ghi đè fixed task.
- Luôn có bước user duyệt plan.
- Task từ Telegram có thể làm thay đổi lịch, nhưng không nên auto đổi ngay nếu chưa hỏi user.
- Review cuối ngày là dữ liệu rất quan trọng để AI lập kế hoạch ngày sau.
- Calendar và Today Dashboard cần dùng cùng một nguồn dữ liệu.
- Reset day 05:00 phải nhất quán trong toàn hệ thống.

---

# 18. Checklist tính năng

## Today Dashboard

- [ ] Summary cards
- [ ] AI Summary
- [ ] Progress bar
- [ ] Todo hôm nay
- [ ] Filter todo
- [ ] Eisenhower Matrix
- [ ] Timeline mini
- [ ] Insight/warning panel

## Calendar Planner

- [ ] Week view
- [ ] Month view
- [ ] Hiển thị 00:00–23:59
- [ ] Marker reset 05:00
- [ ] Create event
- [ ] Edit event
- [ ] Delete event
- [ ] Start + duration => end
- [ ] Start + end => duration
- [ ] Drag/drop
- [ ] Fixed task logic
- [ ] AI schedule buttons

## Review & Progress

- [ ] Date selector
- [ ] AI daily summary
- [ ] Category summary
- [ ] Feedback form
- [ ] Add tomorrow tasks
- [ ] Line chart growth
- [ ] Weekly progress
- [ ] Heatmap
- [ ] Daily review log
- [ ] Completed/postponed/missed tasks

## AI / LLM

- [ ] DeepSeek primary
- [ ] Gemini fallback
- [ ] OpenAI o4-mini fallback
- [ ] JSON validation
- [ ] Error handling
- [ ] Daily summary prompt
- [ ] Morning planner prompt
- [ ] Telegram parser prompt

## n8n / Telegram future

- [ ] Telegram task input
- [ ] Re-plan after new task
- [ ] 05:00 morning planning
- [ ] Reminder workflow
- [ ] End-of-day summary workflow

---

# 19. Kết luận

Dự án này là một hệ thống trợ lý cá nhân hoàn chỉnh, kết hợp:

```text
Web UI
+ Calendar
+ Todo
+ Eisenhower Matrix
+ LLM Planner
+ Telegram Reminder
+ Daily Review
+ Progress Tracking
+ n8n Automation
```

Trọng tâm UI:

- đẹp;
- pastel;
- sang trọng;
- dễ dùng;
- trực quan;
- không quá AI;
- phù hợp dùng mỗi ngày.

Trọng tâm logic:

- reset ngày mới lúc 05:00;
- task trong calendar được ưu tiên như fixed task;
- LLM lập kế hoạch dựa trên task fixed + task flexible;
- cuối ngày tổng kết và feedback;
- task ngày mai được thêm ngay trong review;
- chuẩn bị sẵn luồng nhận task mới từ Telegram và re-plan.
