# Đối chiếu bài mẫu VLU 90–135 với tài liệu trong ~/Desktop/VSTEP

Ngày kiểm tra: 20/11/2026. Đã đọc toàn bộ tài liệu Writing/Speaking: các file Word, PDF, ghi chú và khoảng 90 ảnh. Phần Reading và Listening được bỏ qua.

## Tài liệu và bộ quy tắc trích ra

- **A.md**: TEMPLATE, Bảo Brian, FORM SPEAKING+WRITING, part 2 (12 bài S2 mẫu), part 3, PART 1 WRITING.
- **B.md**: CHUNG (thư/luận mẫu), Viết (ngân hàng ý PEER), VSTEP_Writing_Speaking_Study_Notes.
- **C.md**: TỔNG WRITING, Đề key VSTEP Writing/Speaking (VSTEP SV).
- **D.md**: WRITING TASK 2 THEO DẠNG (8 template), 4 bài luận mẫu VSTEP SV.
- **E.md**: B1 Writing task 1, Sổ tay VSTEP B2 30 ngày. Đây là bộ có quy tắc rõ và dễ kiểm nhất.
- **F.md**: ảnh (PREP, Vivian, APTIS SV, đề nhớ lại 2026).

Các tài liệu có chỗ mâu thuẫn nhau; chi tiết nằm ở mục *Conflicts* cuối mỗi file. Khi hai nguồn khác nhau, lấy theo Sổ tay B2 và TEMPLATE, vì đây là hai nguồn chặt chẽ nhất.

## Kết quả

| Phần | Đã khớp tài liệu | Chưa khớp |
|---|---|---|
| W1 | Đủ ý; mỗi ý một đoạn. Giọng văn và cặp lời chào – câu ký đúng theo người nhận (Sir or Madam → faithfully, tên → sincerely, bạn → Best wishes); 46/46 đúng. Thư trang trọng không viết tắt. Có thời gian và địa điểm cụ thể. | 3 đoạn chỉ có 2 câu (95, 110, 117). 10 thư dùng từ 2 dấu "!" trở lên. 43/46 thư dài hơn 170 từ (Sổ tay: 150–170, mẫu CHUNG: 170–195). Đề 107 chép nguyên câu của đề. |
| W2 | 4 đoạn. Ghi dạng đề. Dạng hỏi ý kiến có nêu quan điểm ở mở bài và kết bài. Kết bằng In conclusion, không thêm ý mới. | **Chưa theo PEER**: trung bình khoảng 3 ý liệt kê mỗi đoạn thân bài; 26/46 bài có đoạn thân bài không có ví dụ. Dạng Opinion 105 và 115 thiếu đoạn nêu phía đối lập (1 PEER). 11 mở bài chép nhiều cụm nguyên văn từ đề (113, 119, 123, 124, 125, 127, 128, 130, 131, 132, 134). 22/46 bài dưới 270 từ (Sổ tay: 270–300). |
| S1 | Trả lời thẳng → lý do → chi tiết, 2–3 câu mỗi câu hỏi. | Không có. |
| S2 | Chọn 1 phương án, loại 2 phương án còn lại có lý do (46/46). Kết bằng 3 tính từ. | Mẫu trong tài liệu dùng 2 lý do sâu, mỗi lý do có "By that, I mean… / For example…", dài khoảng 250–265 từ. Bài của mình có 3 lý do ngắn, khoảng 200 từ; 25/46 bài không có "For example". |
| S3 | Phủ mọi nhánh của sơ đồ ý và thêm ý riêng ở cuối. Có mở bài và kết luận. | Câu trả lời follow-up chỉ 2–3 câu (khoảng 32 từ). Sổ tay khuyên 3–5 câu; đề key khoảng 40–45 từ. |

## Ghi chú

Lý do phần W2 lệch: brief ban đầu yêu cầu "2–3 ý mỗi đoạn thân bài", còn tài liệu dạy 1 ý ở thân bài 1 và 2 ý ở thân bài 2, mỗi ý triển khai đủ Point → Explain → Example → Result.

## Sau khi viết lại (bản 2, 20/11/2026)

Toàn bộ 46 đề VLU và đề tự tạo 20/11 đã được viết lại theo **khung cố định** trong `../templates.json`. Có thể xem khung ở `../KHUNG-MAU.md` hoặc trong app tại Bài mẫu → Khung mẫu.

Bản cũ được giữ ở `../answers-v1/` để so sánh.

`tools/solutions/check.py` kiểm tra mọi quy tắc trong bảng trên. Kết quả: 47/47 đề không có lỗi và không có cảnh báo.

Số liệu bên dưới được tạo bằng `python3 tools/solutions/audit.py`, chỉ tính 46 đề VLU.

| Chỉ số | answers-v1 (46 đề) | answers (46 đề) |
|---|---|---|
| W1: số từ (min–max) | 167–190 | 159–180 |
| W1: thư có đoạn ý < 3 câu | 3 | 0 |
| W1: thư có ≥ 2 dấu "!" | 10 | 0 |
| W2: số từ (min–max) | 260–294 | 270–300 |
| W2: bài dưới 270 từ | 22 | 0 |
| W2: có đoạn thân bài không có ví dụ | 26 | 0 |
| W2: mở bài chép ≥ 4 cụm 6 từ của đề | 26 | 0 |
| W2: có type_key theo khung | 0 | 46 |
| S1: câu trả lời chỉ 2 câu | 75 | 0 |
| S2: số từ (trung bình) | 200 | 238 |
| S2: bài có < 2 ví dụ | 40 | 0 |
| S2: kết bằng "To sum up, out of these three options" | 0 | 46 |
| S3: follow-up (từ, trung bình) | 32 | 49 |
| S3: follow-up < 3 câu | 4 | 0 |

**Các thay đổi chính**
- **W2**
  - Chọn dạng bài (`type_key`) theo đề:
    - `opinion`: nhượng bộ 1 PEER, sau đó 2 PEER cho quan điểm của mình.
    - `discussion`: 1 PEER cho quan điểm kia, 2 PEER cho quan điểm của mình.
    - `adv_disadv`: 1 PEER cho phía yếu, 2 PEER cho phía mạnh. Chỉ kết luận phía nào nặng hơn khi đề hỏi.
    - `cause_effect`, `x_solution`, `one_side`: 2 + 2 ý.
  - Mỗi ý viết đủ Point → Explain → Example → Result.
  - Mở bài viết lại đề bằng lời khác.
- **S2:** dùng nguyên khung của part 2 / Sổ tay B2. Gồm 2 lý do, mỗi lý do có giải thích và ví dụ; loại 2 phương án còn lại bằng "Regarding / As for … because"; kết bằng 3 tính từ.
- **S3:** dùng Firstly / Secondly / Thirdly cho từng nhánh của sơ đồ ý, "Another important point is that…" cho ý riêng, và kết bằng "To sum up". Mỗi câu follow-up trả lời 3–4 câu.
- **S1:** mỗi câu trả lời có 3 câu: trả lời thẳng → lý do → chi tiết.
- **W1:**
  - Mỗi ý một đoạn, ít nhất 3 câu.
  - Mở đoạn bằng Regarding / As for / About your question on…; thư trang trọng dùng Concerning / With regard to.
  - Lời chào và câu ký đúng cặp; thư trang trọng không viết tắt; tối đa 1 dấu "!".
- **Rà soát:** sửa ngữ pháp, các chi tiết sai sự thật (ví dụ Hội An không có sân bay; Bill Gates là đồng sáng lập), và từ vựng không xuất hiện trong bài.
- **Chưa đổi:** tên "District 1/3" (TP.HCM đã bỏ cấp quận từ 7/2025) vẫn giữ vì người ta vẫn nói như vậy trong đời thường.
