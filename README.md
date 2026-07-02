# SDH Portal VAA

Kiến trúc chuyên nghiệp:

- GitHub: quản lý mã nguồn
- Vercel: tự động deploy
- Supabase: database, auth, storage

## Chạy local

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Deploy lên Vercel

1. Upload toàn bộ thư mục này lên GitHub.
2. Vào Vercel → New Project → Import Git Repository.
3. Chọn repository.
4. Thêm Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy.

## Supabase

Vào Supabase → SQL Editor → chạy file:

```text
supabase/schema.sql
```

Bản hiện tại có giao diện Dashboard và module Học viên. Nếu chưa cấu hình Supabase, hệ thống dùng dữ liệu mẫu để chạy thử.
