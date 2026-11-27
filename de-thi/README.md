# Đề VSTEP Văn Lang (VLU 1–141): bản lưu offline để tự ôn

Nguồn: vstepowl.com (Exam Reviews), dùng để ôn luyện với sự cho phép của chủ trang. **Không dùng cho mục đích thương mại.**

## Mở để ôn (nhấp đúp, chạy offline)
| Trang | Nội dung |
|---|---|
| `reading/index.html` | 98 đề × 4 part × 10 câu = 3.920 câu. Làm theo đề (chấm điểm, đáp án, giải thích, gợi ý) hoặc luyện **theo dạng câu hỏi** |
| `writing/index.html` | 141 đề × Task 1 (thư/email ≥120 từ) + Task 2 (luận ≥250 từ), khung viết, đếm từ, hẹn giờ, hướng dẫn làm bài |
| `speaking/index.html` | 141 đề × 3 part, hẹn giờ theo format thi |

Bài làm và tiến độ được lưu trong trình duyệt (localStorage).
Ghi chú: các đề 30, 31, 34, 36, 40, 42, 44, 48, 51, 55, 56, 58, 60, 62, 63, 74, 77, 79–84, 88, 93, 95, 98, 100, 101, 106, 107, 112–115, 124, 125, 127–129, 137, 139, 140 trên trang **không có phần Reading**.
Đề 97 và 99 chưa có gợi ý/giải thích (bản gốc chưa có).

## Dữ liệu chuẩn hoá (để tái sử dụng)
- `exams/vlu-<n>.json`: một đề đầy đủ (reading + writing + speaking_raw)
- `reading/data.json`, `writing/data.json`, `speaking/data.json`: gom theo kỹ năng
- `pdf/vlu-<n>.pdf`: PDF gốc xuất từ nút "Tải đề thi" (kèm đáp án + gợi ý)

```jsonc
// exams/vlu-122.json
{
  "id": "vlu-122", "number": 122, "title": "Đề thi VLU 122", "source": "https://…",
  "has_reading": true,
  "reading": { "duration_min": 60, "parts": [ {
      "part": 1, "question_range": [1, 10], "title": "The History of the Coffeehouse",
      "directions": "Read the passage and choose …",
      "passage": ["đoạn 1 (từ cần chú ý được **in đậm**)", "đoạn 2", "…"],
      "questions": [ {
          "number": 1, "stem": "According to the passage, …",
          "options": {"A": "…", "B": "…", "C": "…", "D": "…"},
          "answer": "A",
          "type": "Chi tiết",            // 1 trong 9 dạng chuẩn hoá
          "type_hint": "Chi tiết",       // tên dạng gốc trong phần gợi ý (có thể khác/thiếu)
          "explanation": "quét các từ khóa …" } ],
      "tips_md": "gợi ý làm bài của part (markdown)" } ] },
  "writing": { "duration_min": 60, "tasks": [ {
      "task": 1, "kind": "Email / Letter", "min_words": 120,
      "prompt": "đề bài (markdown, giữ gạch đầu dòng)",
      "guide_md": "phân tích đề, dàn ý, từ vựng, lỗi thường gặp (markdown)" } ] },
  "speaking": { "parts": [ { "part": 1, "prompt": "đề (text)", "guide_md": "gợi ý trả lời" } ] },
  "speaking_raw": "text thô phần nói"
}
```
9 dạng câu Reading: Chi tiết · Từ vựng · Quy chiếu · Loại trừ (NOT/EXCEPT) · Suy luận · Ý chính · Mục đích tác giả · Thái độ tác giả · Chèn câu.

## Cập nhật / thêm đề
1. Tải PDF đề mới (nút "Tải đề thi" trên trang, bật "Kèm đáp án" + "Kèm gợi ý"), lưu thành `pdf/vlu-<n>.pdf`
2. `python3 tools/parse_exam_pdf.py de-thi/pdf/*.pdf --out de-thi/exams`
3. `python3 tools/build_skill_pages.py`

Speaking 90–122 lấy từ giao diện trang; 1–89 và 123–141 tách từ PDF (đã đối chiếu: 31/33 đề cũ trùng khớp hoàn toàn, 2 đề chỉ khác thứ tự ô trong sơ đồ Part 3). Gợi ý trả lời Speaking của mọi đề lấy từ PDF.

## Bài giải tham khảo (`loi-giai/`)
Writing Part 1 + 2 và Speaking Part 1–3 cho cả 141 đề, mục tiêu 5–6 điểm: `loi-giai/vlu-N.md`, PDF trong `loi-giai/pdf/` (có bản gộp), xem trong app ở mục **Bài mẫu**.
Quy trình: `tools/solutions/make_prompts.py` (đề nguyên văn) → `answers/vlu-N.json` (bài giải) → `check.py` (số từ, cấu trúc, đủ ý, câu mẫu) → `verify_prompts.py` (đề khớp nguồn) → `build.py` (Markdown) → app `sync-data` → `export_pdf.mjs` (PDF).
