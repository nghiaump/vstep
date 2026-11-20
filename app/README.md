# VSTEP Phòng luyện

Web app luyện thi VSTEP chạy offline: Reading thi thử 60 phút đúng định dạng, Writing có bấm giờ và tự chấm, Speaking thi thử có ghi âm. Dữ liệu lấy từ `../de-thi/` (46 đề VLU 90–135).

## Chạy
- **Nhấp đúp `../VSTEP.command`**: build, rồi mở trình duyệt tại http://localhost:4173.
- Hoặc: `npm run app` (build + preview), `npm run dev` (phát triển, http://localhost:5173).

Bài làm lưu trong trình duyệt (localStorage); bản ghi âm lưu trong IndexedDB. Sao lưu/khôi phục ở trang Cài đặt.
Lưu ý: dữ liệu gắn với địa chỉ đang mở, nên dev (`:5173`) và bản chính (`:4173`) có tiến độ riêng.

## Tính năng
- **Reading**: thi thử (đếm ngược 60′, cảnh báo 10′/5′, tự nộp; tải lại trang hay đóng máy đồng hồ vẫn đúng), luyện tập (kiểm tra từng passage), tô sáng bài đọc, đánh dấu câu, bảng câu 1–40, phím tắt (`A`–`D`, `J`/`K`, `F`, `[` `]`, `?`). Kết quả theo thang 10, theo part, theo 9 dạng câu; xem lại từng câu kèm giải thích. Luyện riêng theo dạng câu hỏi.
- **Writing**: thi thử 60′ (2 task) hoặc từng task; đếm từ / đoạn, tự lưu; sau khi nộp xem hướng dẫn và tự chấm theo 4 tiêu chí; tải bài `.md`.
- **Speaking**: xem đề (mindmap Part 3), thi thử 3 part với thời gian chuẩn bị/nói đúng chuẩn, ghi âm, nghe lại, tải file, tự chấm.

## Cấu trúc
```
scripts/sync-data.mjs   ../de-thi → src/data/*.json (chạy tự động trước dev/build)
src/lib                 types, data, storage (localStorage reactive), scoring, time, highlight, audio
src/hooks               useNow, useHotkeys, useRecorder, useMedia
src/components          ExamBar, SplitPane, Passage, QuestionBlock, Palette, Dialog, Markdown, SpeakingParts…
src/pages               Home, Reading*, Writing*, Speaking*, History, Settings
tests/logic.test.ts     vitest: chấm điểm, đồng hồ, tô sáng, kiểm tra dữ liệu
tests/e2e/smoke.spec.ts Playwright (Chrome): thi thử Reading, tự nộp khi hết giờ, luyện tập, Writing, Speaking ghi âm
```
`npm test` · `npm run e2e`

## Thêm đề mới
Cập nhật `../de-thi/` (xem `../de-thi/README.md`), rồi chạy lại app: dữ liệu tự đồng bộ khi build.
