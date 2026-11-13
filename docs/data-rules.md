# Quy tắc dữ liệu đặt phòng (booking)

> Viết tay, gom từ các quyết định đã chốt trong Sale Dashboard (spec G24–G42, `MEMORY.md`). Dùng lại cho mọi dashboard đọc cùng nguồn dữ liệu đặt phòng của JM. Mỗi quy tắc đều đã đối chiếu với số liệu thật trong sheet.

## 1. Nguồn

- Một Google Sheet ("Sale report CocoPalm"), **mỗi tab là một property** (khách sạn): CocoPalm, Jade, JM Beach, Aqua Vista, Flora… Tên property = tên tab.
- Tab được coi là property khi hàng tiêu đề có **đủ bộ cột** dashboard cần; tab phụ (vd. "tổng quan") tự bị bỏ qua.
- Đọc bằng service account, quyền chỉ đọc (`spreadsheets.readonly`). Ba biến trong `app/.env.local`: `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`. Sheet phải share cho email service account (Viewer). Không bao giờ in, chép hay commit giá trị khoá.

Cột của mỗi tab (24 cột): `status · unique_id · room_type_name · rate_plan_name · checkin_date · checkout_date · customer_first_name · customer_last_name · room_amount · ota_source · ota_res_id · occupancy · customer_email · customer_telephone · room_total · booking_total · currency · payment_type · payment_method · created_date · last_modified_date · cancelled_date · room_night · Listing Airbnb`.

## 2. Hạt dữ liệu: mỗi dòng là MỘT PHÒNG, không phải một booking

- Booking đặt nhiều phòng có **nhiều dòng cùng `unique_id`**. Ví dụ CocoPalm: 2.283 dòng nhưng 1.953 booking.
- Mọi dòng của cùng một booking có cùng `status` và `created_date` (đã kiểm: 222/222 booking nhiều dòng). Các cột khác nhau giữa các dòng: `room_type_name`, `rate_plan_name`, `occupancy`, `room_total`, `room_night`.

## 3. Chỉ số

| Chỉ số | Cách tính | Ghi chú |
|---|---|---|
| **Số booking** | Số `unique_id` khác nhau | Gồm cả booking huỷ; lọc `status` để bỏ |
| **Doanh thu booking** | `SUM(booking_total)`, **mỗi `unique_id` một lần** (dòng đầu) | `booking_total` lặp NGUYÊN giá trị trên mọi dòng phòng của booking. Cộng theo dòng làm CocoPalm đếm trùng 2,12 tỷ (7,72 → 5,60 tỷ) |
| **Booking huỷ** | Số `unique_id` có `status = cancelled` | Tính theo ngày đặt, không theo ngày huỷ. Chiều tốt: thấp hơn |
| **Room night** | `SUM(room_night)`, **bỏ dòng `status = cancelled`** | Booking huỷ vẫn giữ room_night trong sheet |
| **ADR** (giá phòng TB / đêm) | `SUM(booking_total) / SUM(room_night)` | Luôn tính trên tổng, không trung bình các tỷ lệ |
| ~~Doanh thu phòng~~ | **Không dùng** `room_total` | Dễ nhầm với doanh thu booking; booking huỷ vẫn giữ room_total (CocoPalm 556 tr) |
| ~~Số phòng~~ | **Không dùng** `room_amount` | Đã thay bằng Số booking |

Booking huỷ có `booking_total = 0` sẵn trong sheet, nên Doanh thu booking và ADR tự không gồm booking huỷ.

## 4. Thời gian

- **Mốc ngày = `created_date` (ngày đặt).** Không dùng `checkin_date`: kéo dài nhiều tháng vào tương lai và có nhiều ngày trống, cửa sổ "30 ngày gần nhất" sẽ gần như rỗng.
- Kỳ mặc định 30 ngày tính từ **ngày cuối có dữ liệu** của property, không phải từ hôm nay (dữ liệu từng tab dừng ở ngày khác nhau).
- Chart / bảng theo kỳ phải có **đủ mọi ngày / tuần / tháng** trong khoảng lọc: kỳ không có booking = 0. Tỷ lệ (ADR) ở kỳ trống là **không xác định** (chart ngắt đoạn, bảng "—"), không phải 0.
- So sánh tháng chưa trọn (tháng cuối của dữ liệu, tới ngày N) với **ngày 1..N** của tháng trước / cùng tháng năm trước, không so nửa tháng với cả tháng.

## 5. Ngưỡng / mục tiêu

- Mục tiêu ADR tính **riêng cho từng property**: phân vị 75 của ADR **theo từng booking** (gộp các dòng phòng cùng `unique_id`, bỏ booking có room night = 0), làm tròn lên 2 chữ số có nghĩa. Ví dụ 2026-10-22: CocoPalm 970.000 · Jade 930.000 · JM Beach 1.100.000. Đây là hiện trạng, chưa phải mục tiêu kinh doanh — con số người dùng chốt thắng con số tự tính.

## 6. Khác biệt giữa các tab cần biết

- `status` có 3 giá trị ở CocoPalm (`new`, `cancelled`, `modified`); Jade và JM Beach chỉ có `new` ⇒ Booking huỷ luôn = 0 ở hai tab này.
- Tên kênh không thống nhất: JM Beach có cả `Expedia` và `A-Expedia`, `Hotels.com (Expedia)` và `A-Hotels.com (Expedia)` — dashboard đang coi là kênh khác nhau.
- `customer_telephone` có ô lỗi công thức (`#ERROR!`), `ota_res_id` bị định dạng khoa học (`5.72E+09`) — không dùng hai cột này làm khoá.
- Thông tin khách (tên, email, điện thoại) là dữ liệu cá nhân: không đưa lên dashboard, không xuất.

## 7. Cài đặt trong Sale Dashboard (để tái dùng)

Các quy tắc trên là **tuỳ chọn cột trong `docs/1-spec/dashboard.json`**, xử lý một lần ở server (`app/lib/data-source.ts`):

| Tuỳ chọn | Ý nghĩa | Dùng cho |
|---|---|---|
| `countDistinct: "unique_id"` | Cột suy ra: 1 ở dòng đầu của mỗi giá trị, 0 ở các dòng sau | `booking_count` |
| `countDistinct` + `countWhen: {column, values}` | Như trên nhưng chỉ đếm dòng thoả điều kiện | `booking_cancelled` |
| `onePerEntity: "unique_id"` | Giữ giá trị ở dòng đầu của mỗi booking, các dòng sau = 0 | `booking_total` |
| `zeroWhen: {column, values}` | Giá trị = 0 ở dòng thoả điều kiện | `room_night` khi `status = cancelled` |

Liên quan: `app/lib/aggregate.ts` (`byGrain` điền kỳ trống, `valueOf`, `thresholdTargets`), `app/lib/monthly.ts` (so tháng, tháng chưa trọn), `docs/2-design/multi-property.md` (property = tab).
